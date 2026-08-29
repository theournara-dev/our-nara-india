/**
 * Order status metadata shared by the admin orders list (server) and the
 * status dropdown (client). Kept in a plain module so both can import it.
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
