import Link from "next/link";
import { db } from "@/lib/db";
import { PreorderRowActions } from "./row-actions";

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

export default async function AdminPreordersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = params.status ?? "";

  const where = status ? { status } : {};

  const [preorders, total] = await Promise.all([
    db.preorder.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true, slug: true } } },
    }),
    db.preorder.count({ where }),
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
    return `/admin/preorders${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
          Pre-orders
        </h1>
        <p className="text-sm text-zinc-500">
          Showing {(page - 1) * PAGE_SIZE + 1}
          {"–"}
          {Math.min(page * PAGE_SIZE, total)} of {total} pre-order
          {total === 1 ? "" : "s"}
        </p>
      </div>

      {/* Status filter */}
      <div className="mb-4 flex items-center gap-2">
        {[
          { value: "", label: "All" },
          { value: "PENDING", label: "Pending" },
          { value: "FULFILLED", label: "Fulfilled" },
        ].map((opt) => (
          <Link
            key={opt.value}
            href={href({ status: opt.value || undefined, page: undefined })}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              status === opt.value
                ? "bg-point-500 text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-100 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Address</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {preorders.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-zinc-500"
                >
                  No pre-orders found.
                </td>
              </tr>
            ) : (
              preorders.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-zinc-50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/products/${p.product.slug}`}
                      className="block max-w-[240px] truncate font-medium text-zinc-900 hover:text-point-500"
                    >
                      {p.product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{p.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.email}</td>
                  <td className="px-4 py-3">
                    <div className="max-w-[220px] text-xs leading-relaxed text-zinc-600">
                      {p.addressLine1 && <p>{p.addressLine1}</p>}
                      {p.addressLine2 && <p>{p.addressLine2}</p>}
                      {(p.city || p.state || p.postal) && (
                        <p>
                          {[p.city, p.state, p.postal]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                      {p.country && <p>{p.country}</p>}
                      {p.phone && <p className="text-zinc-400">{p.phone}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-900">{p.quantity}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.status === "FULFILLED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {p.status === "FULFILLED" ? "Fulfilled" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(p.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PreorderRowActions
                      id={p.id}
                      fulfilled={p.status === "FULFILLED"}
                    />
                  </td>
                </tr>
              ))
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
