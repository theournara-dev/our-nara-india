"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildInvoiceView, type InvoiceView } from "@/lib/invoices";

/**
 * Invoice server actions. Like the order actions, results are structured
 * instead of thrown so a production build can't mask the reason behind a
 * generic Server Action error.
 */

export type InvoiceViewResult =
  { ok: true; view: InvoiceView } | { ok: false; message: string };

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
      return {
        ok: false,
        message: "No invoice has been issued for this order.",
      };
    }
    return { ok: true, view };
  } catch (err) {
    console.error(`[invoices] failed to build the view for ${orderId}:`, err);
    return { ok: false, message: "Could not load the invoice. Try again." };
  }
}

/** A 4–8 digit HSN code, or empty to clear it. */
const HSN_RE = /^\d{4,8}$/;

export type HsnSaveResult =
  { ok: true; saved: number } | { ok: false; message: string };

/**
 * Save HSN codes typed in an invoice's product table.
 *
 * One call carries every dirty line, so tabbing through a long invoice costs a
 * single request. Each entry updates the order item (the invoice reads that
 * snapshot first) and the product behind it, so the catalogue picks the code
 * up for future orders too. Plain updates in one transaction: no page
 * revalidation is needed, the caller already holds the values it sent.
 */
export async function saveInvoiceHsn(
  entries: { itemId: string; hsn: string }[],
): Promise<HsnSaveResult> {
  await requireAdmin();
  if (!Array.isArray(entries) || entries.length === 0) {
    return { ok: true, saved: 0 };
  }
  if (entries.length > 200) {
    return { ok: false, message: "Too many rows in one save. Try again." };
  }

  const cleaned = entries
    .filter(
      (e): e is { itemId: string; hsn: string } =>
        typeof e?.itemId === "string" && typeof e?.hsn === "string",
    )
    .map((e) => ({ itemId: e.itemId, hsn: e.hsn.trim() }));
  const invalid = cleaned.find((e) => e.hsn !== "" && !HSN_RE.test(e.hsn));
  if (invalid) {
    return {
      ok: false,
      message: `“${invalid.hsn}” is not an HSN code. Use 4–8 digits, or leave it empty.`,
    };
  }
  if (cleaned.length === 0) return { ok: true, saved: 0 };

  try {
    const items = await db.orderItem.findMany({
      where: { id: { in: cleaned.map((e) => e.itemId) } },
      select: { id: true, productId: true },
    });
    const productByItem = new Map(items.map((i) => [i.id, i.productId]));

    const updates = cleaned.filter((e) => productByItem.has(e.itemId));
    const byProduct = new Map<string, string>();
    for (const entry of updates) {
      const productId = productByItem.get(entry.itemId);
      if (productId) byProduct.set(productId, entry.hsn);
    }

    await db.$transaction([
      ...updates.map((entry) =>
        db.orderItem.update({
          where: { id: entry.itemId },
          data: { hsnCode: entry.hsn || null },
        }),
      ),
      ...[...byProduct].map(([productId, hsn]) =>
        db.product.update({
          where: { id: productId },
          data: { hsnCode: hsn || null },
        }),
      ),
    ]);
    return { ok: true, saved: updates.length };
  } catch (err) {
    console.error("[invoices] failed to save HSN codes:", err);
    return { ok: false, message: "Could not save the HSN code. Try again." };
  }
}
