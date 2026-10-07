"use server";

import { requireAdmin } from "@/lib/auth";
import { buildInvoiceView, type InvoiceView } from "@/lib/invoices";

/**
 * Invoice server actions. Like the order actions, results are structured
 * instead of thrown so a production build can't mask the reason behind a
 * generic Server Action error.
 */

export type InvoiceViewResult =
  | { ok: true; view: InvoiceView }
  | { ok: false; message: string };

/**
 * Load one invoice document for the preview dialogs. Built fresh per call so
 * the preview always shows the order's current state.
 */
export async function fetchInvoiceView(
  orderId: string,
): Promise<InvoiceViewResult> {
  await requireAdmin();
  try {
    const view = await buildInvoiceView(orderId);
    if (!view) {
      return { ok: false, message: "No invoice has been issued for this order." };
    }
    return { ok: true, view };
  } catch (err) {
    console.error(`[invoices] failed to build the view for ${orderId}:`, err);
    return { ok: false, message: "Could not load the invoice. Try again." };
  }
}
