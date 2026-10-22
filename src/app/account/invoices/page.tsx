import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { InvoicePreviewButton } from "@/components/admin/invoice-preview";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { orderAccountWhere } from "@/lib/order-ownership";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  type OrderStatusValue,
} from "@/lib/order-status";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Every issued invoice for this account's orders, newest first. */
export default async function AccountInvoicesPage() {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    session = null;
  }
  if (!session) redirect("/login?session=expired");

  const orders = await db.order.findMany({
    where: { ...orderAccountWhere(session.user), invoice: { isNot: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      totalCents: true,
      currency: true,
      invoice: { select: { number: true, issuedAt: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Invoices</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Invoices are issued when a payment is confirmed. Preview or download
        one here, or open its order for the full details.
      </p>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center">
          <p className="text-sm text-zinc-500">
            No invoices yet. They appear here after a paid order.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-100 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-zinc-50 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {order.invoice?.number ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {order.invoice ? formatDate(order.invoice.issuedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/account/orders?order=${order.id}#order-${order.id}`}
                      className="text-zinc-600 transition-colors hover:text-point-500"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ORDER_STATUS_STYLES[order.status as OrderStatusValue]
                      }`}
                    >
                      {ORDER_STATUS_LABELS[order.status as OrderStatusValue]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900">
                    {formatMoney(order.totalCents, order.currency, {
                      convert: false,
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <InvoicePreviewButton
                      orderId={order.id}
                      orderNumber={order.orderNumber}
                      variant="customer"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
