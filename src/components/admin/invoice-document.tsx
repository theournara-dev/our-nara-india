import { formatMoney } from "@/lib/money";
import { formatBps } from "@/lib/tax";
import type { InvoiceView } from "@/lib/invoices";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  PAYMENT_STATUS_LABELS,
  badgeStyle,
  type OrderStatusValue,
  type PaymentStatusValue,
} from "@/lib/order-status";

/**
 * The invoice document itself — presentational only, so both preview
 * surfaces (the invoices list and the order view) render the exact same
 * component and can never drift.
 *
 * Amounts always print in the order's stored currency (`convert: false`): an
 * invoice must show what the customer was actually charged, never a
 * version-converted display amount.
 */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function InvoiceDocument({
  view,
  onHsnChange,
  hsnValues,
  readOnly,
}: {
  view: InvoiceView;
  /**
   * When set, the HSN column becomes editable — the admin can fix codes straight
   * from the invoice table (the value is saved on blur, see the preview dialog).
   */
  onHsnChange?: (itemId: string, hsn: string) => void;
  /** Live values while the admin types (falls back to the invoice's own). */
  hsnValues?: Record<string, string>;
  /**
   * Render the HSN cells as plain text. Print and PDF set this first, so a
   * printed invoice can never carry an input box (or lose the value, which
   * `outerHTML` would drop).
   */
  readOnly?: boolean;
}) {
  const money = (cents: number) =>
    formatMoney(cents, view.currency, { convert: false });
  const editableHsn = Boolean(onHsnChange) && !readOnly;
  const tax = view.tax;
  // Half the uniform rate for the CGST/SGST labels; no percentage when the
  // lines carry different rates.
  const halfRate = tax?.uniformBps != null ? formatBps(tax.uniformBps / 2) : "";
  const fullRate = tax?.uniformBps != null ? formatBps(tax.uniformBps) : "";

  return (
    <div className="mx-auto w-full max-w-2xl text-sm text-zinc-900">
      {/* Issuer (FROM) and document identity */}
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-zinc-200 pb-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            From
          </p>
          <p className="mt-1.5 text-base font-semibold">
            {view.from.legalName}
          </p>
          {view.from.address && (
            <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-zinc-500">
              {view.from.address}
            </p>
          )}
          <p className="mt-1 text-xs text-zinc-500">
            {[view.from.email, view.from.phone].filter(Boolean).join(" · ")}
          </p>
          {view.from.taxId && (
            <p className="text-xs text-zinc-500">Tax ID: {view.from.taxId}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold tracking-wide">INVOICE</p>
          <p className="mt-1 font-mono text-sm">{view.number}</p>
          <p className="mt-1 text-xs text-zinc-500">
            Issued {formatDate(view.issuedAt)}
          </p>
        </div>
      </div>

      {/* Recipient and order reference */}
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-zinc-200 py-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Bill to
          </p>
          {view.billTo.name && (
            <p className="mt-1.5 font-semibold">{view.billTo.name}</p>
          )}
          <div className="mt-0.5 text-zinc-600">
            {view.billTo.addressLine1 && <p>{view.billTo.addressLine1}</p>}
            {view.billTo.addressLine2 && <p>{view.billTo.addressLine2}</p>}
            {(view.billTo.city || view.billTo.state || view.billTo.postal) && (
              <p>
                {[view.billTo.city, view.billTo.state, view.billTo.postal]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {view.billTo.country && <p>{view.billTo.country}</p>}
          </div>
          {view.billTo.phone && (
            <p className="mt-1 text-xs text-zinc-500">{view.billTo.phone}</p>
          )}
          {view.billTo.email && (
            <p className="break-all text-xs text-zinc-500">
              {view.billTo.email}
            </p>
          )}
        </div>
        <dl className="space-y-1 text-right text-xs">
          <div>
            <dt className="text-zinc-400">Order</dt>
            <dd className="font-mono text-zinc-700">{view.orderNumber}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">Placed</dt>
            <dd className="text-zinc-700">{formatDate(view.orderCreatedAt)}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">Status</dt>
            <dd className="mt-0.5">
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${badgeStyle(
                  ORDER_STATUS_STYLES,
                  view.orderStatus,
                )}`}
              >
                {ORDER_STATUS_LABELS[view.orderStatus as OrderStatusValue] ??
                  view.orderStatus}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {/* Line items */}
      <table className="mt-5 w-full text-left">
        <thead>
          <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
            <th className="py-2 pr-3 font-medium">Item</th>
            <th className="py-2 px-3 text-center font-medium">HSN</th>
            {tax && <th className="py-2 px-3 text-center font-medium">Rate</th>}
            <th className="py-2 px-3 text-center font-medium">Qty</th>
            <th className="py-2 px-3 text-right font-medium">Unit</th>
            <th className="py-2 pl-3 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {view.lines.map((line) => (
            <tr key={line.id} className="border-b border-zinc-100 align-top">
              <td className="py-2.5 pr-3">
                <p className="font-medium">{line.name}</p>
                {(line.optionValue || line.sku) && (
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {[line.optionValue, line.sku].filter(Boolean).join(" · ")}
                  </p>
                )}
              </td>
              <td className="py-2.5 px-3 text-center">
                {editableHsn ? (
                  <input
                    value={hsnValues?.[line.id] ?? line.hsn}
                    onChange={(e) => onHsnChange?.(line.id, e.target.value)}
                    inputMode="numeric"
                    maxLength={8}
                    aria-label={`HSN code for ${line.name}`}
                    placeholder="—"
                    className="w-20 rounded border border-zinc-200 px-1.5 py-1 text-center font-mono text-xs outline-none focus:border-point-500"
                  />
                ) : (
                  <span className="font-mono text-xs text-zinc-600">
                    {line.hsn || "—"}
                  </span>
                )}
              </td>
              {tax && (
                <td className="py-2.5 px-3 text-center font-mono text-xs text-zinc-600">
                  {line.rateBps != null ? formatBps(line.rateBps) : "—"}
                </td>
              )}
              <td className="py-2.5 px-3 text-center text-zinc-600">
                {line.quantity}
              </td>
              <td className="py-2.5 px-3 text-right text-zinc-600">
                {money(line.unitCents)}
              </td>
              <td className="py-2.5 pl-3 text-right font-medium">
                {money(line.lineTotalCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals. A local (India) invoice decomposes the tax-inclusive amounts:
          the taxable value, then CGST + SGST (Maharashtra) or IGST, then the
          round-off that lifts the printed total to the nearest rupee. */}
      <dl className="mt-4 ml-auto w-full max-w-[16rem] space-y-1.5 text-sm">
        {tax ? (
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Taxable value</dt>
            <dd>{money(tax.taxableCents)}</dd>
          </div>
        ) : (
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Subtotal</dt>
            <dd>{money(view.subtotalCents)}</dd>
          </div>
        )}
        {tax?.intraState && (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">
                CGST{halfRate ? ` ${halfRate}` : ""}
              </dt>
              <dd>{money(tax.cgstCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">
                SGST{halfRate ? ` ${halfRate}` : ""}
              </dt>
              <dd>{money(tax.sgstCents)}</dd>
            </div>
          </>
        )}
        {tax && !tax.intraState && (
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">
              IGST{fullRate ? ` ${fullRate}` : ""}
            </dt>
            <dd>{money(tax.igstCents)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Shipping</dt>
          <dd>
            {view.shippingCents === 0 ? "Free" : money(view.shippingCents)}
          </dd>
        </div>
        {view.discountCents > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Discount</dt>
            <dd>−{money(view.discountCents)}</dd>
          </div>
        )}
        {tax != null && tax.roundOffCents !== 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Round off</dt>
            <dd>
              {tax.roundOffCents > 0 ? "+" : "−"}
              {money(Math.abs(tax.roundOffCents))}
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-4 border-t border-zinc-200 pt-2 font-semibold">
          <dt>Total</dt>
          <dd>{money(view.totalCents + (tax?.roundOffCents ?? 0))}</dd>
        </div>
      </dl>

      {/* Payments */}
      {view.payments.length > 0 && (
        <div className="mt-6 border-t border-zinc-200 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Payments
          </p>
          <ul className="mt-2 space-y-1 text-xs text-zinc-600">
            {view.payments.map((p, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center gap-x-3 gap-y-0.5"
              >
                <span className="font-medium capitalize text-zinc-700">
                  {p.provider}
                </span>
                <span>
                  {PAYMENT_STATUS_LABELS[p.status as PaymentStatusValue] ??
                    p.status}
                </span>
                {p.providerRef && (
                  <span className="font-mono text-zinc-400">
                    {p.providerRef}
                  </span>
                )}
                <span className="ml-auto font-medium text-zinc-700">
                  {formatMoney(p.amountCents, p.currency, { convert: false })}
                </span>
                <span className="text-zinc-400">{formatDate(p.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Configured note (frozen with the FROM snapshot at issue time) */}
      {view.from.note && (
        <div className="mt-6 rounded border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs leading-relaxed text-zinc-600">
          <p className="whitespace-pre-line">{view.from.note}</p>
        </div>
      )}
    </div>
  );
}
