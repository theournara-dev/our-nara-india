import { db } from "@/lib/db";
import { issueInvoiceForOrder } from "@/lib/invoices";
import {
  notifyAdminsStatusChange,
  notifyOrderStatusChange,
} from "@/lib/order-notifications";
import { ORDER_STATUSES, type OrderStatusValue } from "@/lib/order-status";
import {
  logOrderStatusChange,
  type OrderStatusAction,
} from "@/lib/order-status-log";

/**
 * Applies a manual order status change and its opted-in side effects: invoice,
 * customer email, admin email, and the history entry.
 *
 * Separate from the admin server action so the whole sequence can be exercised
 * without an authenticated request; the action is the only production caller.
 */

export type StatusChangeOptions = {
  /** Create the invoice when it does not exist yet. */
  invoice?: boolean;
  /** Send the standard status email to the customer. */
  emailCustomer?: boolean;
  /** Send a short status notice to the store's admin inbox. */
  emailAdmin?: boolean;
};

export type StatusChangeResult =
  | { ok: true; warnings?: string[] }
  | { ok: false; message: string };

export async function applyOrderStatusChange(
  id: string,
  status: string,
  options: StatusChangeOptions,
  actorEmail: string | null,
): Promise<StatusChangeResult> {
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Invalid order status");
  }
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) throw new Error("Order not found.");
  const nextStatus = status as OrderStatusValue;
  if (nextStatus === order.status) return { ok: true };

  // Defaults match the confirmation dialog: invoice for the paid statuses,
  // customer email for every status that has a template, admin email always.
  const invoice =
    options.invoice ?? (nextStatus === "PAID" || nextStatus === "PRE_ORDER");
  const emailCustomer = options.emailCustomer ?? nextStatus !== "PENDING";
  const emailAdmin = options.emailAdmin ?? true;

  // Atomic: only flip when the row still has the status we read, so two
  // concurrent updates can't both win (and only the winner notifies).
  const res = await db.order.updateMany({
    where: { id, status: order.status },
    data: { status: nextStatus },
  });
  if (res.count !== 1) {
    return {
      ok: false,
      message:
        "The order status changed while you were editing. Reload and try again.",
    };
  }

  const warnings: string[] = [];
  const taken: OrderStatusAction[] = [];

  if (invoice) {
    const issued = await issueInvoiceForOrder(id);
    if (issued) taken.push("invoice");
    else warnings.push("The invoice could not be created.");
  }

  if (emailCustomer && nextStatus !== "PENDING") {
    const sent = await notifyOrderStatusChange(order, nextStatus);
    if (sent.ok) taken.push("email_customer");
    else warnings.push("The customer email was not sent.");
  }

  if (emailAdmin) {
    const sent = await notifyAdminsStatusChange(
      order,
      order.status,
      nextStatus,
      actorEmail,
    );
    if (sent.ok) taken.push("email_admin");
    else warnings.push("The admin email was not sent.");
  }

  await logOrderStatusChange({
    orderId: order.id,
    orderNumber: order.orderNumber,
    fromStatus: order.status,
    toStatus: nextStatus,
    actorEmail,
    actions: taken,
  });

  return warnings.length > 0 ? { ok: true, warnings } : { ok: true };
}
