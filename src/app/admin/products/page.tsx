import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import {
  toggleProductActive,
  softDeleteProduct,
  hardDeleteProduct,
} from "./actions";
import { ProductRowActions } from "./row-actions";
import { ProductFilters } from "./filters";
import { currentQuery } from "./lib";

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

type SearchParams = Promise<{
  page?: string;
  search?: string;
  brand?: string;
  category?: string;
  active?: string;
}>;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() ?? "";
  const brand = params.brand ?? "";
  const category = params.category ?? "";
  const active = params.active ?? "";

  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(brand ? { brandId: brand } : {}),
    ...(category ? { categoryId: category } : {}),
    ...(active === "active"
      ? { isActive: true }
      : active === "inactive"
        ? { isActive: false }
        : {}),
  };

  const [products, total, brands, categories] = await Promise.all([
    db.product.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: { brand: true, category: true, variants: true },
    }),
    db.product.count({ where }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Query string that captures the current list state, so New/Edit links carry
  // it forward and returning preserves the page + filters.
  const filterQuery = currentQuery({
    search,
    brand,
    category,
    active,
    page: String(page),
  });

  function href(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    if (brand) sp.set("brand", brand);
    if (category) sp.set("category", category);
    if (active) sp.set("active", active);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const qs = sp.toString();
    return `/admin/products${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
            Products
          </h1>
          <p className="text-sm text-zinc-500">
            Showing {(page - 1) * PAGE_SIZE + 1}
            {"–"}
            {Math.min(page * PAGE_SIZE, total)} of {total} product
            {total === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href={`/admin/products/new${filterQuery}`}
          className="inline-flex h-9 items-center justify-center rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600"
        >
          + New product
        </Link>
      </div>

      {/* Filters */}
      <ProductFilters
        search={search}
        brand={brand}
        category={category}
        active={active}
        brands={brands}
        categories={categories}
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-100 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Brand</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-zinc-500"
                >
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const stock = p.variants.reduce((s, v) => s + v.stock, 0);
                return (
                  <tr
                    key={p.id}
                    className="border-b border-zinc-50 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.images[0] ? (
                          <Image
                            src={p.images[0]}
                            alt={p.name}
                            width={40}
                            height={40}
                            unoptimized
                            loading="lazy"
                            className="h-10 w-10 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded bg-zinc-100" />
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${p.id}/edit${filterQuery}`}
                            className="block max-w-[260px] truncate font-medium text-zinc-900 hover:text-point-500"
                          >
                            {p.name}
                          </Link>
                          <span className="text-xs text-zinc-400">
                            {p.slug}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{p.brand.name}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {p.category.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-900">
                      {formatMoney(p.priceCents, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{stock}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ProductRowActions
                        id={p.id}
                        isActive={p.isActive}
                        editHref={`/admin/products/${p.id}/edit${filterQuery}`}
                        toggle={toggleProductActive}
                        remove={softDeleteProduct}
                        hardDelete={hardDeleteProduct}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
