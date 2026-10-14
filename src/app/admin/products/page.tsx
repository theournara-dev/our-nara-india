import Link from "next/link";
import { db } from "@/lib/db";
import { toggleBrandBuyNow } from "./actions";
import { ProductFilters } from "./filters";
import { FeatureToggle } from "@/components/admin/feature-toggle";
import { ProductsTabs } from "@/components/admin/products-tabs";
import { ProductsTable } from "@/components/admin/products-table";
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
  sub?: string;
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
  const sub = params.sub ?? "";
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
    // A mid-level category filter asks for the products filed under it.
    ...(sub ? { subcategories: { some: { categoryId: sub } } } : {}),
    ...(active === "active"
      ? { isActive: true }
      : active === "inactive"
        ? { isActive: false }
        : {}),
  };

  const [products, total, brands, categories, subcategories] =
    await Promise.all([
      db.product.findMany({
        where,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: { createdAt: "desc" },
        include: {
          brand: true,
          category: true,
          variants: true,
          subcategories: {
            include: { category: { select: { id: true, name: true } } },
          },
        },
      }),
      db.product.count({ where }),
      db.brand.findMany({ orderBy: { name: "asc" } }),
      db.category.findMany({ orderBy: { sortOrder: "asc" } }),
      db.category.findMany({
        where: { parentId: { not: null } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, parent: { select: { name: true } } },
      }),
    ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedBrand = brands.find((b) => b.id === brand);

  // Query string that captures the current list state, so New/Edit links carry
  // it forward and returning preserves the page + filters.
  const filterQuery = currentQuery({
    search,
    brand,
    category,
    sub,
    active,
    page: String(page),
  });

  function href(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    if (brand) sp.set("brand", brand);
    if (category) sp.set("category", category);
    if (sub) sp.set("sub", sub);
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
      <ProductsTabs active="products" />
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
        sub={sub}
        active={active}
        brands={brands}
        categories={categories}
        subcategories={subcategories.map((s) => ({
          id: s.id,
          name: s.name,
          parentName: s.parent?.name ?? "",
        }))}
      />

      {/* Brand-level feature rollout (shown when a brand is filtered) */}
      {selectedBrand && (
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-zinc-100 bg-white px-4 py-3">
          <span className="text-sm font-semibold text-zinc-900">
            {selectedBrand.name}
          </span>
          <span className="text-xs text-zinc-400">
            Applies to every product in this brand
          </span>
          <div className="ml-auto flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              Buy Now
              <FeatureToggle
                id={selectedBrand.id}
                checked={selectedBrand.buyNowEnabled}
                onChange={toggleBrandBuyNow}
                label={`Buy Now for ${selectedBrand.name}`}
              />
            </label>
          </div>
        </div>
      )}

      {/* Table */}
      <p className="mb-2 text-xs text-zinc-400">
        Stores — IN (India) · GL (International):{" "}
        <span className="font-medium text-zinc-500">show</span> ·{" "}
        <span className="font-medium text-zinc-500">pre-order</span> ·{" "}
        <span className="font-medium text-zinc-500">buy now</span>. Click a
        button to toggle it; hover for the full label.
      </p>
      <ProductsTable
        filterQuery={filterQuery}
        subcategoryOptions={subcategories.map((s) => ({
          id: s.id,
          name: s.name,
          parentName: s.parent?.name ?? "",
        }))}
        rows={products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          image: p.images[0] ?? null,
          brandName: p.brand.name,
          categoryName: p.category.name,
          priceCents: p.priceCents,
          globalPriceCents: p.globalPriceCents,
          currency: p.currency,
          stock: p.variants.reduce((sum, v) => sum + v.stock, 0),
          isActive: p.isActive,
          isPreOrder: p.isPreOrder,
          buyNowEnabled: p.buyNowEnabled,
          globalIsActive: p.globalIsActive,
          globalIsPreOrder: p.globalIsPreOrder,
          globalBuyNowEnabled: p.globalBuyNowEnabled,
          taxRateMhBps: p.taxRateMhBps,
          taxRateOtherBps: p.taxRateOtherBps,
          subcategories: p.subcategories.map((s) => ({
            id: s.category.id,
            name: s.category.name,
          })),
        }))}
      />

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
