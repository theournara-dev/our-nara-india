"use client";

import Link from "next/link";
import { InvoicePreviewButton } from "@/components/admin/invoice-preview";
import { formatMoney } from "@/lib/money";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  badgeStyle,
  type OrderStatusValue,
} from "@/lib/order-status";

export interface InvoiceRow {
  id: string;
  number: string;
  issuedAt: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  email: string;
  status: string;
  currency: string;
  totalCents: number;
}

/** Issued invoices, with a live document preview per row. */
export function InvoicesTable({ rows }: { rows: InvoiceRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/60 text-left text-xs uppercase tracking-wide text-zinc-400">
            <th className="px-4 py-3 font-medium">Invoice</th>
            <th className="px-4 py-3 font-medium">Order</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Issued</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-zinc-50 last:border-0">
              <td className="px-4 py-3 font-mono text-xs font-medium text-zinc-900">
                {row.number}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/orders/${row.orderId}`}
                  className="font-mono text-xs text-point-500 hover:underline"
                >
                  {row.orderNumber}
                </Link>
              </td>
              <td className="px-4 py-3">
                <p className="text-zinc-900">{row.customerName}</p>
                <p className="text-xs text-zinc-400">{row.email}</p>
              </td>
              <td className="px-4 py-3 text-zinc-600">
                {new Date(row.issuedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyle(
                    ORDER_STATUS_STYLES,
                    row.status,
                  )}`}
                >
                  {ORDER_STATUS_LABELS[row.status as OrderStatusValue] ??
                    row.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-medium text-zinc-900">
                {formatMoney(row.totalCents, row.currency, { convert: false })}
              </td>
              <td className="px-4 py-3 text-right">
                <InvoicePreviewButton
                  orderId={row.orderId}
                  orderNumber={row.orderNumber}
                />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-10 text-center text-sm text-zinc-400"
              >
                No invoices yet. One is issued automatically when an order is
                confirmed.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
