/**
 * Shared fulfillment rules for deriving Order.status from Shipment.status.
 * Single source of truth used by the Delhivery webhook, the daily cron sync,
 * and the admin sync action — kept in one module so the three paths can't
 * drift (they already did once).
 *
 * Order.status is *derived forward-only*: tracking events may only advance a
 * paid order through SHIPPED → DELIVERED. Rank comparison enforces this, so
 * the protected set here only covers terminal states a sync must never touch
 * or overwrite — NOT PAID/SHIPPED, which are the normal mid-fulfillment
 * states a sync legitimately advances from.
 */

import type { OrderStatus, ShipmentStatus } from "@/generated/prisma/client";

/** Terminal/admin-controlled states a tracking sync must never overwrite. */
export const SYNC_PROTECTED_ORDER_STATUSES = new Set<OrderStatus>([
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
]);

export const ORDER_STATUS_RANK: Record<OrderStatus, number> = {
  PENDING: 0,
  FAILED: 0,
  PAID: 1,
  PRE_ORDER: 1,
  SHIPPED: 2,
  DELIVERED: 3,
  CANCELLED: 3,
  REFUNDED: 3,
};

export const SHIPMENT_STATUS_RANK: Record<ShipmentStatus, number> = {
  CREATED: 0,
  PICKUP_SCHEDULED: 1,
  IN_TRANSIT: 2,
  DELIVERED: 3,
  RTO: 3,
  CANCELLED: 3,
  FAILED: 3,
};

/** Order status each shipment status maps to; null = no derivation. */
export const SHIPMENT_TO_ORDER: Record<
  ShipmentStatus,
  Extract<OrderStatus, "SHIPPED" | "DELIVERED"> | null
> = {
  CREATED: null,
  PICKUP_SCHEDULED: "SHIPPED",
  IN_TRANSIT: "SHIPPED",
  DELIVERED: "DELIVERED",
  RTO: null, // return flow handled manually by admins
  CANCELLED: null,
  FAILED: null,
};

/**
 * Advance an order's status from a tracking-derived shipment status.
 * Forward-only: DELIVERED stays DELIVERED; admin terminal states
 * (CANCELLED/REFUNDED) are never overwritten. Returns the applied status
 * or null when nothing changed.
 */
export async function applyTrackingStatus(
  current: OrderStatus,
  shipmentStatus: ShipmentStatus,
): Promise<Extract<OrderStatus, "SHIPPED" | "DELIVERED"> | null> {
  const target = SHIPMENT_TO_ORDER[shipmentStatus];
  if (!target) return null;
  if (SYNC_PROTECTED_ORDER_STATUSES.has(current)) return null;
  if (ORDER_STATUS_RANK[target] <= ORDER_STATUS_RANK[current]) return null;
  return target;
}