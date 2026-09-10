"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  DEFAULT_PRODUCT_WEIGHT_GRAMS,
  fetchShipment,
} from "@/lib/delhivery";
import { createShipment as apiCreateShipment } from "@/lib/delhivery";
import { db } from "@/lib/db";
import {
  applyShipmentBackout,
  applyTrackingStatus,
  advanceShipmentStatus,
} from "./fulfillment";
import { ORDER_STATUSES, type OrderStatusValue } from "@/lib/order-status";
import { notifyOrderStatusChange } from "@/lib/order-notifications";

/**
 * Admin order actions: manual status changes plus the Delhivery fulfillment
 * flow (create / import / sync). All actions require the admin role;
 * Delhivery API failures bubble up as readable errors and are shown in the
 * row's toast.
 */

export async function updateOrderStatus(id: string, status: string) {
  await requireAdmin();
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Invalid order status");
  }
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) throw new Error("Order not found.");
  const nextStatus = status as OrderStatusValue;
  if (nextStatus === order.status) {
    revalidatePath("/admin/orders");
    return;
  }
  // Atomic: only flip when the row still has the status we read, so two
  // concurrent updates can't both win (and only the winner notifies).
  const res = await db.order.updateMany({
    where: { id, status: order.status },
    data: { status: nextStatus },
  });
  if (res.count === 1) {
    const NOTIFIABLE_STATUSES = new Set<OrderStatusValue>([
      "PAID",
      "PRE_ORDER",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "REFUNDED",
      "FAILED",
    ]);
    if (NOTIFIABLE_STATUSES.has(nextStatus)) {
      await notifyOrderStatusChange(order, nextStatus);
    }
  }
  revalidatePath("/admin/orders");
}

/**
 * Permanently delete an order and all of its related rows (items, payments,
 * shipments, coupon redemptions, mileage entries). Those relations have no
 * DB-level cascade, so everything is removed in one transaction. Admin-only.
 */
export async function deleteOrder(id: string) {
  const admin = await requireAdmin();
  const order = await db.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      email: true,
      currency: true,
      totalCents: true,
      createdAt: true,
    },
  });
  if (!order) throw new Error("Order not found.");

  await db.$transaction([
    // Audit first so the record exists even if the delete transaction is
    // retried; the row is standalone and survives the order itself.
    db.orderAuditLog.create({
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        action: "DELETE",
        actorEmail: admin.user.email ?? null,
        snapshot: {
          status: order.status,
          email: order.email,
          currency: order.currency,
          totalCents: order.totalCents,
          createdAt: order.createdAt.toISOString(),
        },
      },
    }),
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
      sum +
      (i.product.weightGrams ?? DEFAULT_PRODUCT_WEIGHT_GRAMS) * i.quantity,
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
    include: {
      items: { include: { product: { select: { weightGrams: true } } } },
    },
  });
  if (!order) throw new Error("Order not found.");

  // Fulfillment only once money is actually in — PAID, or PRE_ORDER for paid
  // pre-orders. The row UI hides the button, but this is the server-side
  // guard that enforces it regardless of client state.
  if (order.status !== "PAID" && order.status !== "PRE_ORDER") {
    throw new Error("Only paid orders can be shipped.");
  }

  const existing = await db.shipment.findFirst({
    where: {
      orderId: input.orderId,
      status: { notIn: ["CANCELLED", "FAILED"] },
    },
  });
  if (existing) {
    throw new Error("Order already has an active shipment.");
  }

  // Recompute amount from DB — never trust the client-supplied total.
  const amountCents = order.totalCents;

  // Delhivery keys a shipment by its `order` reference + waybill, and the
  // reference must be UNIQUE across auto-generated waybills. Once a shipment
  // for this order exists (even cancelled/failed), that ref is consumed at
  // Delhivery and re-sending it throws a generic internal error. Suffix
  // re-shipments so the ref stays unique: ON-XXX, ON-XXX-R2, ON-XXX-R3…
  const priorShipments = await db.shipment.count({ where: { orderId: order.id } });
  const deliveryRef =
    priorShipments > 0 ? `${order.orderNumber}-R${priorShipments + 1}` : order.orderNumber;

  const result = await apiCreateShipment({
    orderNumber: deliveryRef,
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
        clientOrderRef: deliveryRef,
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
    select: { id: true, orderNumber: true, status: true },
  });
  if (!order) throw new Error("Order not found.");
  if (order.status !== "PAID" && order.status !== "PRE_ORDER") {
    throw new Error("Only paid orders can be shipped.");
  }

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
    include: { items: true },
  });
  if (order) {
    const target =
      (await applyTrackingStatus(order.status, nextStatus)) ??
      applyShipmentBackout(order.status, nextStatus);
    if (target && target !== order.status) {
      // Atomic: only flip when the row still has the status we read, so a
      // concurrent update can't double-notify.
      const res = await db.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: target },
      });
      if (res.count === 1) {
        await notifyOrderStatusChange(order, target, {
          waybill: shipment.waybill,
        });
      }
    }
  }

  revalidate();
}
