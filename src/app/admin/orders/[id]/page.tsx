import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { trackingUrl } from "@/lib/delhivery-client";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
  SHIPMENT_LABELS,
  SHIPMENT_STYLES,
  badgeStyle,
} from "@/lib/order-status";
import { OrderRowActions } from "../row-actions";

export const dynamic = "force-dynamic";

type Params = { id: string };

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const cardClass = "rounded-2xl border border-zinc-100 bg-white";
const cardHeaderClass =
  "border-b border-zinc-100 px-5 py-3.5 text-sm font-semibold text-zinc-900";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { id: "asc" } },
      payments: { orderBy: { createdAt: "asc" } },
      shipments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  const shipping = (order.shipping as
    | {
        name?: string;
        phone?: string | null;
        addressLine1?: string | null;
        addressLine2?: string | null;
        city?: string | null;
        state?: string | null;
        postal?: string | null;
        country?: string | null;
      }
    | null
    | undefined) ?? {};

  // Latest non-terminal shipment drives the fulfillment controls, matching
  // the orders list; cancelled/failed history stays visible in the table.
  const activeShipment =
    order.shipments.find(
      (s) => s.status !== "CANCELLED" && s.status !== "FAILED",
    ) ?? undefined;

  return (
    <div>
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        ← Back to orders
      </Link>

      <div className="mb-6 mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {order.orderNumber}
        </h1>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            ORDER_STATUS_STYLES[order.status]
          }`}
        >
          {ORDER_STATUS_LABELS[order.status]}
        </span>
        {order.isPreOrder && (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
            Pre-order
          </span>
        )}
        <span className="text-sm text-zinc-500">
          Placed {formatDate(order.createdAt)}
        </span>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* Main column: items, payments, shipments */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* Items */}
          <section className={cardClass}>
            <h2 className={cardHeaderClass}>
              Items ({order.items.reduce((sum, i) => sum + i.quantity, 0)})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-5 py-2.5 font-medium">Item</th>
                    <th className="px-5 py-2.5 text-right font-medium">Price</th>
                    <th className="px-5 py-2.5 text-center font-medium">Qty</th>
                    <th className="px-5 py-2.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-zinc-50 last:border-0"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-zinc-900">{item.name}</p>
                        {(item.optionValue || item.sku) && (
                          <p className="mt-0.5 text-xs text-zinc-400">
                            {[item.optionValue, item.sku]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-600">
                        {formatMoney(item.priceCents, item.currency)}
                      </td>
                      <td className="px-5 py-3 text-center text-zinc-600">
                        {item.quantity}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-zinc-900">
                        {formatMoney(
                          item.priceCents * item.quantity,
                          item.currency,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Payments */}
          <section className={cardClass}>
            <h2 className={cardHeaderClass}>Payments</h2>
            {order.payments.length === 0 ? (
              <p className="px-5 py-6 text-sm text-zinc-500">
                No payments recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-50">
                {order.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm"
                  >
                    <span className="font-medium capitalize text-zinc-900">
                      {p.provider}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyle(
                        PAYMENT_STATUS_STYLES,
                        p.status,
                      )}`}
                    >
                      {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                    </span>
                    <span className="ml-auto font-medium text-zinc-900">
                      {formatMoney(p.amountCents, p.currency)}
                    </span>
                    <span className="w-full text-xs text-zinc-400 sm:w-auto">
                      {formatDate(p.createdAt)}
                      {p.providerRef ? ` · ${p.providerRef}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Shipments */}
          <section className={cardClass}>
            <h2 className={cardHeaderClass}>Shipments</h2>
            {order.shipments.length === 0 ? (
              <p className="px-5 py-6 text-sm text-zinc-500">
                No shipments yet. Fulfilment actions are in the sidebar.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-50">
                {order.shipments.map((s) => (
                  <li key={s.id} className="px-5 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <a
                        href={trackingUrl(s.waybill)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-point-500 hover:underline"
                        title="Open tracking at Delhivery"
                      >
                        {s.waybill} ↗
                      </a>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyle(
                          SHIPMENT_STYLES,
                          s.status,
                        )}`}
                      >
                        {SHIPMENT_LABELS[s.status] ?? s.status}
                      </span>
                      <span className="ml-auto text-xs text-zinc-400">
                        {s.lastSyncedAt
                          ? `Synced ${formatDateTime(s.lastSyncedAt)}`
                          : "Never synced"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {[
                        s.providerStatus
                          ? `Delhivery: ${s.providerStatus}`
                          : null,
                        `Source: ${s.source.toLowerCase()}`,
                        `Created ${formatDate(s.createdAt)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar: summary, customer, address, actions */}
        <div className="min-w-0 space-y-6">
          {/* Summary */}
          <section className={cardClass}>
            <h2 className={cardHeaderClass}>Summary</h2>
            <dl className="space-y-1.5 px-5 py-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Subtotal</dt>
                <dd className="text-zinc-900">
                  {formatMoney(order.subtotalCents, order.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Shipping</dt>
                <dd className="text-zinc-900">
                  {order.shippingCents === 0
                    ? "Free"
                    : formatMoney(order.shippingCents, order.currency)}
                </dd>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Discount</dt>
                  <dd className="text-zinc-900">
                    −{formatMoney(order.discountCents, order.currency)}
                  </dd>
                </div>
              )}
              <div className="mt-2 flex justify-between gap-4 border-t border-zinc-100 pt-2.5">
                <dt className="font-semibold text-zinc-900">Total</dt>
                <dd className="font-semibold text-zinc-900">
                  {formatMoney(order.totalCents, order.currency)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Customer */}
          <section className={cardClass}>
            <h2 className={cardHeaderClass}>Customer</h2>
            <dl className="space-y-1.5 px-5 py-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-zinc-500">Email</dt>
                <dd className="min-w-0 break-all text-right text-zinc-900">
                  {order.email}
                </dd>
              </div>
              {shipping.phone && (
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-zinc-500">Phone</dt>
                  <dd className="text-right text-zinc-900">{shipping.phone}</dd>
                </div>
              )}
              {order.userId && (
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-zinc-500">Account</dt>
                  <dd
                    className="min-w-0 truncate text-right font-mono text-xs text-zinc-500"
                    title={order.userId}
                  >
                    {order.userId}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* Shipping address */}
          <section className={cardClass}>
            <h2 className={cardHeaderClass}>Shipping address</h2>
            <div className="px-5 py-4 text-sm leading-relaxed text-zinc-600">
              {shipping.name || shipping.addressLine1 ? (
                <>
                  {shipping.name && (
                    <p className="font-medium text-zinc-900">{shipping.name}</p>
                  )}
                  {shipping.addressLine1 && <p>{shipping.addressLine1}</p>}
                  {shipping.addressLine2 && <p>{shipping.addressLine2}</p>}
                  {(shipping.city || shipping.state || shipping.postal) && (
                    <p>
                      {[shipping.city, shipping.state, shipping.postal]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  {shipping.country && <p>{shipping.country}</p>}
                </>
              ) : (
                <p className="text-zinc-400">No address provided.</p>
              )}
            </div>
          </section>

          {/* Fulfillment actions */}
          <section className={cardClass}>
            <h2 className={cardHeaderClass}>Actions</h2>
            <div className="px-5 py-4">
              <OrderRowActions
                id={order.id}
                status={order.status}
                shipment={
                  activeShipment
                    ? {
                        waybill: activeShipment.waybill,
                        status: activeShipment.status,
                        providerStatus:
                          activeShipment.providerStatus ?? undefined,
                        lastSyncedAt:
                          activeShipment.lastSyncedAt?.toISOString(),
                      }
                    : undefined
                }
                shipping={shipping}
                totalCents={order.totalCents}
                orderNumber={order.orderNumber}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
