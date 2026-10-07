import { formatMoney } from "@/lib/money";
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

export function InvoiceDocument({ view }: { view: InvoiceView }) {
  const money = (cents: number) =>
    formatMoney(cents, view.currency, { convert: false });

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
            <th className="py-2 px-3 text-center font-medium">Qty</th>
            <th className="py-2 px-3 text-right font-medium">Unit</th>
            <th className="py-2 pl-3 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {view.lines.map((line, i) => (
            <tr key={i} className="border-b border-zinc-100 align-top">
              <td className="py-2.5 pr-3">
                <p className="font-medium">{line.name}</p>
                {(line.optionValue || line.sku) && (
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {[line.optionValue, line.sku].filter(Boolean).join(" · ")}
                  </p>
                )}
              </td>
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

      {/* Totals */}
      <dl className="mt-4 ml-auto w-full max-w-[16rem] space-y-1.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Subtotal</dt>
          <dd>{money(view.subtotalCents)}</dd>
        </div>
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
        <div className="flex justify-between gap-4 border-t border-zinc-200 pt-2 font-semibold">
          <dt>Total</dt>
          <dd>{money(view.totalCents)}</dd>
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
