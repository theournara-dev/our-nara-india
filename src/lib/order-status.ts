/**
 * Shared status metadata for commerce entities, used by both the admin
 * dashboard and the customer account pages. Kept in a plain module so server
 * and client components can import it without pulling in server-only code.
 */

export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "PRE_ORDER",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "FAILED",
] as const;

export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatusValue, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  PRE_ORDER: "Pre-order",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  FAILED: "Failed",
};

/** Tailwind badge classes per status. */
export const ORDER_STATUS_STYLES: Record<OrderStatusValue, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  PRE_ORDER: "bg-sky-100 text-sky-700",
  SHIPPED: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-zinc-100 text-zinc-500",
  REFUNDED: "bg-violet-100 text-violet-700",
  FAILED: "bg-rose-100 text-rose-700",
};

export const SHIPMENT_STATUSES = [
  "CREATED",
  "PICKUP_SCHEDULED",
  "IN_TRANSIT",
  "DELIVERED",
  "RTO",
  "CANCELLED",
  "FAILED",
] as const;

export type ShipmentStatusValue = (typeof SHIPMENT_STATUSES)[number];

export const SHIPMENT_LABELS: Record<ShipmentStatusValue, string> = {
  CREATED: "Created",
  PICKUP_SCHEDULED: "Pickup scheduled",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  RTO: "RTO",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
};

export const SHIPMENT_STYLES: Record<ShipmentStatusValue, string> = {
  CREATED: "bg-amber-100 text-amber-700",
  PICKUP_SCHEDULED: "bg-sky-100 text-sky-700",
  IN_TRANSIT: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  RTO: "bg-violet-100 text-violet-700",
  CANCELLED: "bg-zinc-100 text-zinc-500",
  FAILED: "bg-rose-100 text-rose-700",
};

export const PAYMENT_STATUSES = [
  "CREATED",
  "AUTHORIZED",
  "CAPTURED",
  "REFUNDED",
  "FAILED",
] as const;

export type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusValue, string> = {
  CREATED: "Created",
  AUTHORIZED: "Authorized",
  CAPTURED: "Captured",
  REFUNDED: "Refunded",
  FAILED: "Failed",
};

export const PAYMENT_STATUS_STYLES: Record<PaymentStatusValue, string> = {
  CREATED: "bg-zinc-100 text-zinc-500",
  AUTHORIZED: "bg-sky-100 text-sky-700",
  CAPTURED: "bg-emerald-100 text-emerald-700",
  REFUNDED: "bg-violet-100 text-violet-700",
  FAILED: "bg-rose-100 text-rose-700",
};

/** Badge classes for a value whose style map may not cover it. */
export function badgeStyle(
  styles: Record<string, string>,
  value: string,
): string {
  return styles[value] ?? "bg-zinc-100 text-zinc-500";
}
