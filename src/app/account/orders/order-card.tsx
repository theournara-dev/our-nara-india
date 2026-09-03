"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
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
  type OrderStatusValue,
  type PaymentStatusValue,
  type ShipmentStatusValue,
} from "@/lib/order-status";

export interface AccountOrderItem {
  id: string;
  name: string;
  optionValue: string | null;
  sku: string | null;
  priceCents: number;
  quantity: number;
  currency: string;
}

export interface AccountOrderPayment {
  id: string;
  provider: string;
  status: string;
  amountCents: number;
  currency: string;
  providerRef: string | null;
  createdAt: string;
}

export interface AccountOrderShipment {
  id: string;
  waybill: string;
  status: string;
  providerStatus: string | null;
  createdAt: string;
}

export interface AccountOrder {
  id: string;
  orderNumber: string;
  status: string;
  isPreOrder: boolean;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
  placedAt: string;
  items: AccountOrderItem[];
  payments: AccountOrderPayment[];
  shipments: AccountOrderShipment[];
  shipping: {
    name?: string;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postal?: string | null;
    country?: string | null;
  } | null;
}

const badgeClass =
  "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

/** One expandable order card in the customer's order history. */
export function AccountOrderCard({ order }: { order: AccountOrder }) {
  const [open, setOpen] = useState(false);

  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const preview = order.items
    .slice(0, 2)
    .map((i) => (i.optionValue ? `${i.name} (${i.optionValue})` : i.name))
    .join(", ");
  const previewMore =
    order.items.length > 2 ? ` +${order.items.length - 2} more` : "";
  const activeShipment = order.shipments.find(
    (s) => s.status !== "CANCELLED" && s.status !== "FAILED",
  );

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white">
      {/* Collapsed summary — the whole header toggles the card */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-zinc-900">
              {order.orderNumber}
            </span>
            <span
              className={`${badgeClass} ${badgeStyle(ORDER_STATUS_STYLES, order.status)}`}
            >
              {ORDER_STATUS_LABELS[order.status as OrderStatusValue] ??
                order.status}
            </span>
            {order.isPreOrder && (
              <span className={`${badgeClass} bg-sky-100 text-sky-700`}>
                Pre-order
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-zinc-400">
            {order.placedAt} · {itemCount} {itemCount === 1 ? "item" : "items"}
            {preview ? ` — ${preview}${previewMore}` : ""}
          </p>
        </div>
        <span className="font-semibold text-zinc-900">
          {formatMoney(order.totalCents, order.currency)}
        </span>
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="space-y-5 border-t border-zinc-100 px-5 py-4">
          {/* Items */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Items
            </h3>
            <ul className="space-y-2.5">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900">{item.name}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {[
                        item.optionValue,
                        item.sku,
                        `${item.quantity} × ${formatMoney(item.priceCents, item.currency)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-zinc-900">
                    {formatMoney(
                      item.priceCents * item.quantity,
                      item.currency,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Totals */}
          <dl className="space-y-1 border-t border-zinc-100 pt-3 text-sm">
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
            <div className="flex justify-between gap-4 pt-1 font-semibold">
              <dt className="text-zinc-900">Total</dt>
              <dd className="text-zinc-900">
                {formatMoney(order.totalCents, order.currency)}
              </dd>
            </div>
          </dl>

          {/* Shipping address */}
          {order.shipping?.name || order.shipping?.addressLine1 ? (
            <div className="border-t border-zinc-100 pt-3">
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Delivery address
              </h3>
              <div className="text-sm leading-relaxed text-zinc-600">
                {order.shipping.name && (
                  <p className="font-medium text-zinc-900">
                    {order.shipping.name}
                  </p>
                )}
                {order.shipping.addressLine1 && (
                  <p>{order.shipping.addressLine1}</p>
                )}
                {order.shipping.addressLine2 && (
                  <p>{order.shipping.addressLine2}</p>
                )}
                {(order.shipping.city ||
                  order.shipping.state ||
                  order.shipping.postal) && (
                  <p>
                    {[
                      order.shipping.city,
                      order.shipping.state,
                      order.shipping.postal,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
                {order.shipping.country && <p>{order.shipping.country}</p>}
                {order.shipping.phone && (
                  <p className="text-zinc-400">{order.shipping.phone}</p>
                )}
              </div>
            </div>
          ) : null}

          {/* Payment */}
          {order.payments.length > 0 && (
            <div className="border-t border-zinc-100 pt-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Payment
              </h3>
              <ul className="space-y-1.5">
                {order.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                  >
                    <span className="font-medium capitalize text-zinc-900">
                      {p.provider}
                    </span>
                    <span
                      className={`${badgeClass} ${badgeStyle(PAYMENT_STATUS_STYLES, p.status)}`}
                    >
                      {PAYMENT_STATUS_LABELS[p.status as PaymentStatusValue] ??
                        p.status}
                    </span>
                    <span className="ml-auto text-zinc-900">
                      {formatMoney(p.amountCents, p.currency)}
                    </span>
                    <span className="w-full text-xs text-zinc-400">
                      {p.createdAt}
                      {p.providerRef ? ` · ${p.providerRef}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tracking */}
          {activeShipment ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-zinc-100 pt-3 text-sm">
              <span className="text-zinc-500">Tracking</span>
              <span
                className={`${badgeClass} ${badgeStyle(SHIPMENT_STYLES, activeShipment.status)}`}
              >
                {SHIPMENT_LABELS[activeShipment.status as ShipmentStatusValue] ??
                  activeShipment.status}
              </span>
              <a
                href={trackingUrl(activeShipment.waybill)}
                target="_blank"
                rel="noreferrer"
                className="text-point-500 hover:underline"
                title="Open tracking at Delhivery"
              >
                {activeShipment.waybill} ↗
              </a>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
