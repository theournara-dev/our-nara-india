"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { InvoiceDocument } from "@/components/admin/invoice-document";
import { fetchInvoiceView, saveInvoiceHsn } from "@/app/admin/invoices/actions";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { printElement } from "@/lib/print";
import type { InvoiceView } from "@/lib/invoices";
import { notify } from "@/lib/toast";

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
  // The rendered document, so Print can hand exactly this node to the printer
  // and Download can keep using the data it was rendered from.
  const documentRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  /** True only while the document is being printed or rasterised. */
  const [plain, setPlain] = useState(false);

  // ── HSN editing ────────────────────────────────────────────────────────
  // The admin can fix codes right in the table. Typing is local; blur marks the
  // row dirty and a short timer batches every dirty row into ONE request, so
  // tabbing through a long invoice costs a single round trip. The rows keep the
  // typed values while the save is in flight (optimistic), and the indicator
  // tells the admin where it stands.
  const [hsnValues, setHsnValues] = useState<Record<string, string>>({});
  const [hsnStatus, setHsnStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const hsnDirty = useRef(new Map<string, string>());
  const hsnTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function flushHsn() {
    const entries = [...hsnDirty.current].map(([itemId, hsn]) => ({
      itemId,
      hsn,
    }));
    if (entries.length === 0) return;
    hsnDirty.current.clear();
    setHsnStatus("saving");
    const res = await saveInvoiceHsn(entries);
    if (!res.ok) {
      setHsnStatus("idle");
      notify.error("hsn-save", "HSN not saved", res.message);
      return;
    }
    setHsnStatus("saved");
  }

  function onHsnChange(itemId: string, hsn: string) {
    setHsnValues((prev) => ({ ...prev, [itemId]: hsn }));
    hsnDirty.current.set(itemId, hsn);
    setHsnStatus("saving");
    clearTimeout(hsnTimer.current);
    hsnTimer.current = setTimeout(() => void flushHsn(), 600);
  }

  // Never lose a pending edit: flush on unmount (Escape, Close, backdrop).
  useEffect(
    () => () => {
      clearTimeout(hsnTimer.current);
      if (hsnDirty.current.size > 0) {
        void saveInvoiceHsn(
          [...hsnDirty.current].map(([itemId, hsn]) => ({ itemId, hsn })),
        );
      }
    },
    [],
  );

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
    setHsnValues({});
    setHsnStatus("idle");
    hsnDirty.current.clear();
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

  function onPrint() {
    const node = documentRef.current;
    if (!node) return;
    // Drop the editable HSN inputs before the snapshot: `outerHTML` (and a
    // PDF raster) would otherwise print an empty box instead of the code.
    void withPlainDocument(() => {
      // A blocked popup falls back to printing the page, where the @media print
      // rules keep only the invoice.
      if (!printElement(node)) window.print();
    });
  }

  async function onDownload() {
    const node = documentRef.current;
    if (!node || !view) return;
    setDownloading(true);
    try {
      await withPlainDocument(() => downloadInvoicePdf(node, view.number));
    } catch (err) {
      console.error("[invoices] PDF download failed:", err);
      notify.error(
        "invoice-download",
        "Could not create the PDF",
        "Please try again, or use Print and save as PDF.",
      );
    } finally {
      setDownloading(false);
    }
  }

  /**
   * Run `capture` with the document rendered read-only, then bring the editor
   * back. The double rAF lets React commit the plain document and the browser
   * paint it before the node is cloned or rasterised.
   */
  async function withPlainDocument(capture: () => void | Promise<void>) {
    setPlain(true);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    try {
      await capture();
    } finally {
      setPlain(false);
    }
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
        // Above the site header (z-99): the dialog's action row sits where the
        // header is, and below it the buttons would be covered and unclickable.
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 print:static print:block print:p-0">
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
                <p className="text-xs text-zinc-500">
                  Order {orderNumber}
                  {hsnStatus !== "idle" && (
                    <span className="ml-2 text-zinc-400">
                      {hsnStatus === "saving" ? "· saving HSN…" : "· HSN saved"}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onPrint}
                  disabled={!view || pending}
                  className="h-8 rounded border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
                >
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => void onDownload()}
                  disabled={!view || pending || downloading}
                  className="h-8 rounded border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
                >
                  {downloading ? "Preparing…" : "Download PDF"}
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
              {!pending && view && (
                <div ref={documentRef} data-print-root>
                  <InvoiceDocument
                    view={view}
                    onHsnChange={onHsnChange}
                    hsnValues={hsnValues}
                    readOnly={plain}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
