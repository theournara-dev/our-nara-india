import { db } from "@/lib/db";
import type { OrderStatusValue } from "@/lib/order-status";

/** What was done alongside a status change. Stored in `OrderStatusLog.actions`. */
export type OrderStatusAction = "invoice" | "email_customer" | "email_admin";

/**
 * Append one transition to the order's status history. Never throws: a failed
 * log must not undo a status change that already happened.
 */
export async function logOrderStatusChange(input: {
  orderId: string;
  orderNumber: string;
  fromStatus: OrderStatusValue | null;
  toStatus: OrderStatusValue;
  actorEmail?: string | null;
  actions?: OrderStatusAction[];
}): Promise<void> {
  try {
    await db.orderStatusLog.create({
      data: {
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        actorEmail: input.actorEmail ?? null,
        actions: input.actions ?? [],
      },
    });
  } catch (err) {
    console.error(
      `[order-status-log] Failed to log ${input.orderNumber} ${input.fromStatus ?? "—"} → ${input.toStatus}:`,
      err,
    );
  }
}

/** Newest first, for the order detail timeline. */
export async function getOrderStatusHistory(orderId: string) {
  return db.orderStatusLog.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
}
