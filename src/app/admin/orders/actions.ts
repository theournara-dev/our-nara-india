"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_PRODUCT_WEIGHT_GRAMS, DelhiveryError, fetchShipment } from "@/lib/delhivery";
import {
  cancelShipment as apiCancelShipment,
  createShipment as apiCreateShipment,
  schedulePickup as apiSchedulePickup,
} from "@/lib/delhivery";
import { db } from "@/lib/db";
import { applyTrackingStatus, advanceShipmentStatus } from "./fulfillment";
import { ORDER_STATUSES, type OrderStatusValue } from "./status";

/**
 * Admin order actions: manual status changes plus the Delhivery fulfillment
 * flow (create / import / pickup / cancel / sync). All actions require the
 * admin role; Delhivery API failures bubble up as readable errors and are
 * shown in the row's toast.
 */

export async function updateOrderStatus(id: string, status: string) {
  await requireAdmin();
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Invalid order status");
  }
  await db.order.update({
    where: { id },
    data: { status: status as OrderStatusValue },
  });
  revalidatePath("/admin/orders");
}

/**
 * Permanently delete an order and all of its related rows (items, payments,
 * shipments, coupon redemptions, mileage entries). Those relations have no
 * DB-level cascade, so everything is removed in one transaction. Admin-only.
 */
export async function deleteOrder(id: string) {
  await requireAdmin();
  const order = await db.order.findUnique({
    where: { id },
    select: { id: true, orderNumber: true },
  });
  if (!order) throw new Error("Order not found.");

  await db.$transaction([
    db.mileageLedger.deleteMany({ where: { orderId: id } }),
    db.couponRedemption.deleteMany({ where: { orderId: id } }),
    db.shipment.deleteMany({ where: { orderId: id } }),
    db.payment.deleteMany({ where: { orderId: id } }),
    db.orderItem.deleteMany({ where: { orderId: id } }),
    db.order.delete({ where: { id } }),
  ]);

  revalidatePath("/admin/orders");
  return { orderNumber: order.orderNumber };
}

function revalidate() {
  revalidatePath("/admin/orders");
}

/** Per-item weight: product override or the global default. */
function totalWeightGrams(
  items: { quantity: number; product: { weightGrams: number | null } }[],
): number {
  const grams = items.reduce(
    (sum, i) =>
      sum + (i.product.weightGrams ?? DEFAULT_PRODUCT_WEIGHT_GRAMS) * i.quantity,
    0,
  );
  return Math.max(50, grams); // Delhivery minimum sensible weight
}

export async function createShipment(input: {
  orderId: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postal: string;
  amountCents: number;
}) {
  await requireAdmin();
  if (!/^\d{6}$/.test(input.postal)) {
    throw new Error("Order is missing a valid 6-digit Indian postal code.");
  }
  if (!input.phone?.trim()) {
    throw new Error("Order is missing a phone number.");
  }

  const order = await db.order.findUnique({
    where: { id: input.orderId },
    include: { items: { include: { product: { select: { weightGrams: true } } } } },
  });
  if (!order) throw new Error("Order not found.");

  const existing = await db.shipment.findFirst({
    where: { orderId: input.orderId, status: { notIn: ["CANCELLED", "FAILED"] } },
  });
  if (existing) {
    throw new Error("Order already has an active shipment.");
  }

  // Recompute amount from DB — never trust the client-supplied total.
  const amountCents = order.totalCents;

  const result = await apiCreateShipment({
    orderNumber: order.orderNumber,
    customerName: input.customerName,
    phone: input.phone,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2 ?? null,
    city: input.city,
    state: input.state ?? null,
    postal: input.postal,
    amountCents,
    weightGrams: totalWeightGrams(order.items),
  });

  try {
    await db.shipment.create({
      data: {
        orderId: order.id,
        provider: "delhivery",
        waybill: result.waybill,
        clientOrderRef: order.orderNumber,
        status: "CREATED",
        source: "APP",
        labelUrl: result.labelUrl,
        codAmountCents: 0,
        isCod: false,
        lastSyncedAt: new Date(),
      },
    });
  } catch (err) {
    // The waybill EXISTS at Delhivery but we failed to record it — a retry
    // would create a duplicate shipment. Log loudly so it can be imported
    // via the "Import" flow instead.
    console.error(
      `ORPHANED WAYBILL: ${result.waybill} for order ${order.orderNumber} — DB write failed, import manually:`,
      err,
    );
    throw new Error(
      `Shipment created at Delhivery (waybill ${result.waybill}) but saving it failed. Import it with the Import button — do NOT create another shipment.`,
    );
  }

  revalidate();
}

/** Attach a shipment created directly in the Delhivery dashboard. */
export async function importShipment(orderId: string, waybill: string) {
  await requireAdmin();
  if (!waybill.trim()) throw new Error("Waybill is required.");

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true },
  });
  if (!order) throw new Error("Order not found.");

  // Verify the waybill exists at Delhivery before attaching — a typo'd
  // waybill would otherwise attach silently.
  const remote = await fetchShipment(waybill.trim());
  if (!remote) {
    throw new Error("Waybill not found at Delhivery. Check the number.");
  }

  await db.shipment.create({
    data: {
      orderId,
      provider: "delhivery",
      waybill: waybill.trim(),
      clientOrderRef: order.orderNumber,
      status: remote.status,
      providerStatus: remote.providerStatus,
      source: "ADMIN",
      lastEventAt: remote.lastEventAt,
      lastSyncedAt: new Date(),
    },
  });

  revalidate();
}

/** Ask Delhivery to pick up ready-to-ship manifests from our warehouse. */
export async function schedulePickup() {
  await requireAdmin();
  const res = await apiSchedulePickup();
  revalidate();
  if (!res.ok) {
    throw new Error(res.message ?? "Delhivery did not confirm the pickup.");
  }
}

/** Cancel a pre-dispatch shipment (post-dispatch is an RTO flow in the panel). */
export async function cancelShipment(waybill: string) {
  await requireAdmin();
  const shipment = await db.shipment.findUnique({ where: { waybill } });
  if (!shipment) throw new Error("Shipment not found.");

  try {
    await apiCancelShipment(waybill);
  } catch (err) {
    // Not-yet-manifested or already-cancelled waybills 4xx at Delhivery —
    // record the local cancel for those. Server errors (5xx/timeouts) mean
    // the cancel may NOT have happened there, so let them fail loudly
    // instead of recording a cancel Delhivery never processed.
    if (err instanceof DelhiveryError && err.status != null && err.status < 500) {
      console.error(`Delhivery cancel ${waybill} (${err.status}):`, err.message);
    } else {
      throw err;
    }
  }

  await db.shipment.update({
    where: { waybill },
    data: { status: "CANCELLED", source: "ADMIN", lastSyncedAt: new Date() },
  });
  // Free the order for a new shipment if it never left CREATED.
  await db.order.updateMany({
    where: { id: shipment.orderId, status: "SHIPPED" },
    data: { status: "PAID" },
  });

  revalidate();
}

/** On-demand pull of one shipment's status (freshness between cron runs). */
export async function syncShipment(waybill: string) {
  await requireAdmin();
  const shipment = await db.shipment.findUnique({ where: { waybill } });
  if (!shipment) throw new Error("Shipment not found.");

  const remote = await fetchShipment(waybill);
  if (!remote) {
    await db.shipment.update({
      where: { waybill },
      data: {
        status: "FAILED",
        providerStatus: "NOT_FOUND",
        lastSyncedAt: new Date(),
      },
    });
    throw new Error("Waybill not found at Delhivery — marked as stale.");
  }

  // Forward-only: never demote an advanced shipment on an unmapped wording.
  const nextStatus = advanceShipmentStatus(shipment.status, remote.status);

  await db.shipment.update({
    where: { waybill },
    data: {
      status: nextStatus,
      providerStatus: remote.providerStatus,
      lastEventAt: remote.lastEventAt,
      lastSyncedAt: new Date(),
      source: "DELHIVERY",
    },
  });

  // Forward-only order progression via the shared fulfillment rules.
  const order = await db.order.findUnique({
    where: { id: shipment.orderId },
    select: { id: true, status: true },
  });
  if (order) {
    const target = await applyTrackingStatus(order.status, nextStatus);
    if (target) {
      await db.order.update({
        where: { id: order.id },
        data: { status: target },
      });
    }
  }

  revalidate();
}