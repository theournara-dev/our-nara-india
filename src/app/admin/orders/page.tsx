import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import type { OrderStatus } from "@/generated/prisma/client";
import { OrderDeleteAction, OrderRowActions } from "./row-actions";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  type OrderStatusValue,
} from "./status";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

/** Compact list of page numbers, collapsing long ranges with an ellipsis. */
function pageList(current: number, total: number): (number | "…")[] {
  const candidates = new Set([1, total, current, current - 1, current + 1]);
  const pages = [...candidates]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
}

type SearchParams = Promise<{ page?: string; status?: string }>;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  // Validate against the known enum — an arbitrary ?status= value would make
  // Prisma throw and crash the page.
  const status = (ORDER_STATUSES as readonly string[]).includes(
    params.status ?? "",
  )
    ? (params.status as OrderStatus)
    : "";

  const where = status ? { status: status as OrderStatus } : {};

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        items: { select: { id: true, name: true, quantity: true } },
        shipments: {
          select: {
            id: true,
            waybill: true,
            status: true,
            providerStatus: true,
            lastSyncedAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    db.order.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function href(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const qs = sp.toString();
    return `/admin/orders${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Orders</h1>
        <p className="text-sm text-zinc-500">
          Showing {(page - 1) * PAGE_SIZE + 1}
          {"–"}
          {Math.min(page * PAGE_SIZE, total)} of {total} order
          {total === 1 ? "" : "s"}
        </p>
      </div>

      {/* Status filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href={href({ status: undefined, page: undefined })}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            !status
              ? "bg-point-500 text-white"
              : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          All
        </Link>
        {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
          <Link
            key={value}
            href={href({ status: value, page: undefined })}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              status === value
                ? "bg-point-500 text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-100 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
              <th className="px-4 py-3 text-right font-medium">Set status</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-zinc-500"
                >
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const shipping =
                  (o.shipping as
                    | {
                        name?: string;
                        phone?: string | null;
                        addressLine1?: string | null;
                        addressLine2?: string | null;
                        city?: string | null;
                        state?: string | null;
                        postal?: string | null;
                      }
                    | null
                    | undefined) ?? {};
                const itemCount = o.items.reduce(
                  (sum, i) => sum + i.quantity,
                  0,
                );
                // Show the "active" shipment (latest non-terminal one) so
                // cancelling in the app frees the row for a fresh shipment;
                // cancelled/failed history stays in the DB.
                const activeShipment =
                  o.shipments.find(
                    (s) => s.status !== "CANCELLED" && s.status !== "FAILED",
                  ) ?? undefined;
                return (
                  <tr
                    key={o.id}
                    className="border-b border-zinc-50 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900">
                        {o.orderNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[220px]">
                        <p className="truncate text-zinc-900">
                          {shipping.name || "—"}
                        </p>
                        <p className="truncate text-xs text-zinc-400">
                          {o.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {formatMoney(o.totalCents, o.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          ORDER_STATUS_STYLES[o.status as OrderStatusValue]
                        }`}
                      >
                        {ORDER_STATUS_LABELS[o.status as OrderStatusValue]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(o.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <OrderDeleteAction
                        id={o.id}
                        orderNumber={o.orderNumber}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <OrderRowActions
                        id={o.id}
                        status={o.status as OrderStatusValue}
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
                        totalCents={o.totalCents}
                        orderNumber={o.orderNumber}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <p className="text-sm text-zinc-500">
            Showing {(page - 1) * PAGE_SIZE + 1}
            {"–"}
            {Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            {page > 1 && (
              <Link
                href={href({ page: String(page - 1) })}
                className="inline-flex h-9 items-center justify-center rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                Prev
              </Link>
            )}
            {pageList(page, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="px-2 text-sm text-zinc-400">
                  …
                </span>
              ) : (
                <Link
                  key={p}
                  href={href({ page: String(p) })}
                  aria-current={p === page ? "page" : undefined}
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded border px-3 text-sm ${
                    p === page
                      ? "border-point-500 bg-point-500 font-semibold text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {p}
                </Link>
              ),
            )}
            {page < totalPages && (
              <Link
                href={href({ page: String(page + 1) })}
                className="inline-flex h-9 items-center justify-center rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
