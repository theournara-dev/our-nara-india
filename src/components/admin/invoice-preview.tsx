"use client";

import { useEffect, useState, useTransition } from "react";
import { InvoiceDocument } from "@/components/admin/invoice-document";
import { fetchInvoiceView } from "@/app/admin/invoices/actions";
import type { InvoiceView } from "@/lib/invoices";

/**
 * Dialog preview of a single invoice. The document is fetched through a
 * server action on every open (never prefetched with the page), so the
 * preview always reflects the order's current state — the entire point of
 * rendering an invoice live from the order.
 */
export function InvoicePreviewButton({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<InvoiceView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Close on Escape, matching the other admin dialogs.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function show() {
    setView(null);
    setError(null);
    setOpen(true);
    startTransition(async () => {
      try {
        const res = await fetchInvoiceView(orderId);
        if (!res.ok) {
          setError(res.message);
          return;
        }
        setView(res.view);
      } catch {
        setError("Could not load the invoice. Try again.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="inline-flex h-7 items-center rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
      >
        Preview
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:static print:block print:p-0">
          <div
            className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm print:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Invoice for order ${orderNumber}`}
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl print:max-h-none print:max-w-none print:rounded-none print:shadow-none"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-6 py-4 print:hidden">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">
                  Invoice preview
                </h3>
                <p className="text-xs text-zinc-500">Order {orderNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={!view || pending}
                  className="h-8 rounded border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
                >
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-8 rounded bg-point-500 px-3 text-xs font-semibold text-white transition-colors hover:bg-point-600"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-6 py-5 print:overflow-visible print:px-0 print:py-0">
              {pending && (
                <p className="py-12 text-center text-sm text-zinc-400">
                  Loading invoice…
                </p>
              )}
              {!pending && error && (
                <p className="py-12 text-center text-sm text-rose-600">
                  {error}
                </p>
              )}
              {!pending && view && <InvoiceDocument view={view} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
