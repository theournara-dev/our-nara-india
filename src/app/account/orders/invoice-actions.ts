"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildInvoiceView, type InvoiceView } from "@/lib/invoices";
import { orderBelongsToUser } from "@/lib/order-ownership";

export type MyInvoiceViewResult =
  { ok: true; view: InvoiceView } | { ok: false; message: string };

/**
 * Load an invoice for the signed-in customer. The ownership check happens
 * here, on the server, for every call — the order id comes from the browser.
 */
export async function fetchMyInvoiceView(
  orderId: string,
): Promise<MyInvoiceViewResult> {
  let session: Awaited<ReturnType<typeof requireUser>>;
  try {
    session = await requireUser();
  } catch {
    return { ok: false, message: "Please sign in to view this invoice." };
  }

  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { userId: true, email: true },
    });
    if (!order || !orderBelongsToUser(order, session.user)) {
      return { ok: false, message: "Order not found." };
    }
    const view = await buildInvoiceView(orderId);
    if (!view) {
      return { ok: false, message: "No invoice has been issued for this order." };
    }
    return { ok: true, view };
  } catch (err) {
    console.error(`[invoices] customer view failed for ${orderId}:`, err);
    return { ok: false, message: "Could not load the invoice. Try again." };
  }
}
