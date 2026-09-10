import { NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";
import { fetchShipment, isConfigured as delhiveryConfigured } from "@/lib/delhivery";
import {
  applyShipmentBackout,
  applyTrackingStatus,
  advanceShipmentStatus,
} from "@/app/admin/orders/fulfillment";
import type { ShipmentStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { notifyOrderStatusChange } from "@/lib/order-notifications";
import { runPaidSideEffects } from "@/lib/paid-side-effects";

/**
 * Daily Delhivery + Razorpay sync (Vercel Hobby: 1x/day cron is free).
 * This is the ONLY Delhivery status path — no Delhivery webhooks (panel
 * registration was too slow); statuses arrive via pull.
 *
 * 1. Shipments: pull every non-terminal shipment from Delhivery (least
 *    recently synced first) and update stale rows. Admins can also pull any
 *    single shipment on demand via the orders-row "Sync" button.
 * 2. Razorpay: re-check recently created PENDING orders whose webhooks were
 *    missed, using the authoritative `order.amount_paid` from the API.
 *
 * Guarded by CRON_SECRET so only Vercel Cron (or an admin) can trigger it.
 *
 * vercel.json: { "crons": [{ "path": "/api/cron/daily-sync", "schedule": "0 18 * * *" }] }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Hobby ceiling is 60s for cron-invoked runs

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // not configured → refuse public access
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = {
    shipmentsChecked: 0,
    shipmentsUpdated: 0,
    ordersChecked: 0,
    ordersPaid: 0,
    errors: [] as string[],
    ranAt: new Date().toISOString(),
  };

  // ── 1. Shipment sync ──────────────────────────────────────────────────────
  if (delhiveryConfigured()) {
    // Least-recently-synced first so progress is uniform when the row cap
    // truncates the batch. Sequential fetches stay inside the 60s Hobby cap.
    const shipments = await db.shipment.findMany({
      where: {
        status: {
          in: ["CREATED", "PICKUP_SCHEDULED", "IN_TRANSIT"] as ShipmentStatus[],
        },
      },
      select: {
        waybill: true,
        orderId: true,
        status: true,
        lastEventAt: true,
      },
      orderBy: { lastSyncedAt: "asc" },
      take: 25,
    });
    summary.shipmentsChecked = shipments.length;

    for (const shipment of shipments) {
      try {
        const remote = await fetchShipment(shipment.waybill);
        if (!remote) continue;

        // Forward-only: a remote status that maps below our current rank
        // (or an unmapped wording → CREATED fallback) must not demote us.
        const next = advanceShipmentStatus(shipment.status, remote.status);
        const changed = next !== shipment.status;
        await db.shipment.update({
          where: { waybill: shipment.waybill },
          data: {
            status: next,
            providerStatus: remote.providerStatus,
            lastEventAt: remote.lastEventAt ?? shipment.lastEventAt,
            lastSyncedAt: new Date(),
            source: "DELHIVERY",
          },
        });
        if (changed) summary.shipmentsUpdated += 1;

        await advanceOrder(shipment.orderId, next, shipment.waybill);
      } catch (err) {
        summary.errors.push(`shipment ${shipment.waybill}: ${String(err)}`);
      }
    }
  }

  // ── 2. Razorpay reconciliation ────────────────────────────────────────────
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000); // older than 30 min
    const pendingOrders = await db.order.findMany({
      where: { status: "PENDING", createdAt: { lt: cutoff } },
      select: {
        id: true,
        orderNumber: true,
        email: true,
        currency: true,
        totalCents: true,
        isPreOrder: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    summary.ordersChecked = pendingOrders.length;

    for (const order of pendingOrders) {
      // Retries can leave several payment attempts on one order; check them
      // newest-first and use the first one Razorpay reports as paid.
      const payments = await db.payment.findMany({
        where: {
          orderId: order.id,
          provider: "razorpay",
          providerRef: { not: null },
        },
        select: { id: true, providerRef: true },
        orderBy: { createdAt: "desc" },
      });

      try {
        const paying = await findPayingAttempt(payments, order.totalCents);
        if (!paying) continue;

        // Atomic PENDING→PAID/PRE_ORDER flip: only a row still PENDING is
        // updated, so a concurrent webhook that already paid the order makes
        // this a no-op (count 0) and we skip the side effects below.
        const paid = await db.$transaction(async (tx) => {
          const res = await tx.order.updateMany({
            where: { id: order.id, status: "PENDING" },
            data: { status: order.isPreOrder ? "PRE_ORDER" : "PAID" },
          });
          if (res.count === 0) return false;

          // Mirror the webhook captured path so a later real payment.captured
          // webhook (which returns early on CAPTURED) doesn't lose the side
          // effects, and refund restock stays consistent.
          await tx.payment.updateMany({
            where: {
              id: paying.id,
              status: { notIn: ["CAPTURED", "REFUNDED"] },
            },
            data: { status: "CAPTURED" },
          });
          return true;
        });
        if (paid) {
          summary.ordersPaid += 1;
          await runPaidSideEffects(order.id, paying.id);
        }
      } catch (err) {
        summary.errors.push(`razorpay order ${order.orderNumber}: ${String(err)}`);
      }
    }
  } catch (err) {
    summary.errors.push(`razorpay section: ${String(err)}`);
  }

  return NextResponse.json(summary);
}

/** Forward-only order status via shared fulfillment rules. */
async function advanceOrder(
  orderId: string,
  shipmentStatus: ShipmentStatus,
  waybill: string,
) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;
  const target =
    (await applyTrackingStatus(order.status, shipmentStatus)) ??
    applyShipmentBackout(order.status, shipmentStatus);
  if (target && target !== order.status) {
    await db.order.update({
      where: { id: order.id },
      data: { status: target },
    });
    await notifyOrderStatusChange(order, target, { waybill });
  }
}

/**
 * First payment attempt Razorpay reports as fully paid, newest first. A single
 * stale/unreachable Razorpay order must not hide an older paid attempt.
 */
async function findPayingAttempt(
  payments: { id: string; providerRef: string | null }[],
  totalCents: number,
) {
  for (const payment of payments) {
    if (!payment.providerRef) continue;
    try {
      const rzpOrder = await getRazorpay().orders.fetch(payment.providerRef);
      if (rzpOrder.amount_paid >= totalCents) return payment;
    } catch (err) {
      console.error(
        `Razorpay fetch failed for ${payment.providerRef}:`,
        err,
      );
    }
  }
  return null;
}