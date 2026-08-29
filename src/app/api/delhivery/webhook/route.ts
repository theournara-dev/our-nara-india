import { db } from "@/lib/db";
import { mapDelhiveryStatus } from "@/lib/delhivery";
import {
  applyTrackingStatus,
  SHIPMENT_STATUS_RANK,
} from "@/app/admin/orders/fulfillment";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Delhivery webhook. Delhivery pushes shipment status events here (URL
 * registered in the One Delhivery panel). Events carry the waybill; we
 * resolve it back to our Shipment row and derive Order.status forward-only.
 *
 * Auth: Delhivery's outbound webhooks don't expose a per-event HMAC on all
 * account tiers, so we validate by ownership — a waybill we don't recognize
 * is acknowledged (200) but ignored. An attacker posting random waybills can
 * therefore never mutate anything. When the panel exposes a shared secret,
 * add the check below.
 *
 * Handled payloads (loosely typed — Delhivery's webhook schemas vary by
 * event type; we only rely on `waybill` + a status-ish field):
 *   { waybill, status?, scans?: [{ Status, StatusDateTime }] }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DelhiveryWebhook {
  waybill?: string;
  status?: string;
  scans?: { Status?: string; StatusDateTime?: string }[];
}

export async function POST(request: Request) {
  const body = await request.text();

  let webhook: DelhiveryWebhook;
  try {
    webhook = JSON.parse(body) as DelhiveryWebhook;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const waybill = webhook.waybill;
  if (!waybill) return Response.json({ ok: true, ignored: "no waybill" });

  // Ownership filter: only mutate shipments we created/imported.
  const shipment = await db.shipment.findUnique({ where: { waybill } });
  if (!shipment) {
    // Acknowledge so Delhivery doesn't retry, but do nothing.
    return Response.json({ ok: true, ignored: "unknown waybill" });
  }

  // Pick the genuinely latest scan by timestamp — scan ordering is not
  // guaranteed across Delhivery surfaces.
  const latestScan =
    webhook.scans && webhook.scans.length > 0
      ? [...webhook.scans]
          .sort(
            (a, b) =>
              new Date(b.StatusDateTime ?? 0).getTime() -
              new Date(a.StatusDateTime ?? 0).getTime(),
          )[0]
      : undefined;
  const rawStatus =
    latestScan?.Status ?? webhook.status ?? shipment.providerStatus;
  const mapped = mapDelhiveryStatus(rawStatus);
  const eventAt = latestScan?.StatusDateTime
    ? new Date(latestScan.StatusDateTime)
    : new Date();

  const data: Prisma.ShipmentUpdateInput = {
    providerStatus: rawStatus ?? null,
    lastEventAt: eventAt,
    lastSyncedAt: new Date(),
    source: "DELHIVERY",
    rawPayload: { event: "webhook", body: body } as unknown as object,
  };
  if (!mapped) {
    // Unrecognized provider wording: keep our status, record provenance.
  } else if (
    SHIPMENT_STATUS_RANK[mapped] < SHIPMENT_STATUS_RANK[shipment.status]
  ) {
    // Stale event: keep our newer status, only record provenance.
    data.rawPayload = {
      lastWebhookIgnored: { status: rawStatus, at: eventAt.toISOString() },
    } as unknown as object;
  } else {
    data.status = mapped;
  }

  await db.shipment.update({ where: { waybill }, data });

  // Derive Order status forward-only via the shared fulfillment rules.
  const order = await db.order.findUnique({
    where: { id: shipment.orderId },
    select: { id: true, status: true },
  });
  if (!order) return Response.json({ ok: true });

  const target = mapped
    ? await applyTrackingStatus(order.status, mapped)
    : null;
  if (target) {
    await db.order.update({
      where: { id: order.id },
      data: { status: target },
    });
  }

  return Response.json({ ok: true });
}