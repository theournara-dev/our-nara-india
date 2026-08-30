import { NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";
import { fetchShipment, isConfigured as delhiveryConfigured } from "@/lib/delhivery";
import { applyTrackingStatus, advanceShipmentStatus } from "@/app/admin/orders/fulfillment";
import type { ShipmentStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";

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

        await advanceOrder(shipment.orderId, next);
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
      select: { id: true, orderNumber: true, totalCents: true, isPreOrder: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    summary.ordersChecked = pendingOrders.length;

    for (const order of pendingOrders) {
      // Find the internal order id we stored in the Razorpay order receipt.
      const payment = await db.payment.findFirst({
        where: { orderId: order.id, provider: "razorpay", providerRef: { not: null } },
        select: { providerRef: true },
      });
      if (!payment?.providerRef) continue;

      try {
        const rzpOrder = await getRazorpay().orders.fetch(payment.providerRef);
        if (rzpOrder.amount_paid >= order.totalCents) {
          await db.$transaction([
            db.payment.updateMany({
              where: { orderId: order.id, provider: "razorpay", status: { not: "CAPTURED" } },
              data: { status: "CAPTURED" },
            }),
            db.order.update({
              where: { id: order.id },
              // Mirror the webhook path: pre-orders must not be marked PAID.
              data: { status: order.isPreOrder ? "PRE_ORDER" : "PAID" },
            }),
          ]);
          summary.ordersPaid += 1;
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
async function advanceOrder(orderId: string, shipmentStatus: ShipmentStatus) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });
  if (!order) return;
  const target = await applyTrackingStatus(order.status, shipmentStatus);
  if (target) {
    await db.order.update({
      where: { id: order.id },
      data: { status: target },
    });
  }
}