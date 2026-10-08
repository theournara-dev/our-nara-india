/**
 * Category listing filters. Pure (no React, no database) so the URL parsing,
 * the filtering rules and the facet counts can be unit tested directly.
 *
 * The sidebar writes its selection into the URL query, so a filtered listing is
 * shareable and the back button works:
 *
 *   /category/skin-care?sub=mask&brand=acnes,hyggee&min=500&max=2000&avail=ready
 */

export type AvailabilityFilter = "preorder" | "ready";

export interface CategoryFilters {
  /** One sub-category slug, or undefined for the whole category. */
  sub?: string;
  /** Selected brand slugs (any of them matches). */
  brands: string[];
  /** Inclusive bounds in whole rupees. */
  minRupees?: number;
  maxRupees?: number;
  /** Selected availability buckets (any of them matches). */
  availability: AvailabilityFilter[];
}

export const EMPTY_CATEGORY_FILTERS: CategoryFilters = {
  brands: [],
  availability: [],
};

export type CategoryFilterParams = {
  sub?: string;
  brand?: string;
  min?: string;
  max?: string;
  avail?: string;
};

function parseRupees(raw: string | undefined): number | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function parseCategoryFilters(
  params: CategoryFilterParams,
): CategoryFilters {
  const availability = (params.avail ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v): v is AvailabilityFilter => v === "preorder" || v === "ready");
  const brands = (params.brand ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const minRupees = parseRupees(params.min);
  const maxRupees = parseRupees(params.max);
  return {
    ...(params.sub ? { sub: params.sub } : {}),
    brands: [...new Set(brands)],
    ...(minRupees != null ? { minRupees } : {}),
    // A ceiling below the floor is meaningless; drop it rather than showing
    // an empty listing for a typo.
    ...(maxRupees != null && (minRupees == null || maxRupees >= minRupees)
      ? { maxRupees }
      : {}),
    availability: [...new Set(availability)],
  };
}

/** The query string for a filter selection (empty values are dropped). */
export function categoryFilterQuery(filters: CategoryFilters): string {
  const params = new URLSearchParams();
  if (filters.sub) params.set("sub", filters.sub);
  if (filters.brands.length > 0) params.set("brand", filters.brands.join(","));
  if (filters.minRupees != null) params.set("min", String(filters.minRupees));
  if (filters.maxRupees != null) params.set("max", String(filters.maxRupees));
  if (filters.availability.length > 0)
    params.set("avail", filters.availability.join(","));
  return params.toString();
}

export function countActiveFilters(filters: CategoryFilters): number {
  return (
    (filters.sub ? 1 : 0) +
    filters.brands.length +
    filters.availability.length +
    (filters.minRupees != null || filters.maxRupees != null ? 1 : 0)
  );
}

/** The slice of a product the filters read. */
export interface FilterableProduct {
  slug: string;
  priceCents: number;
  isPreOrder: boolean;
  brand: { slug: string; name?: string };
}

export function matchesFilters(
  product: FilterableProduct,
  filters: CategoryFilters,
  subcategoryOf: (slug: string) => string | undefined,
): boolean {
  if (filters.sub && subcategoryOf(product.slug) !== filters.sub) return false;
  if (
    filters.brands.length > 0 &&
    !filters.brands.includes(product.brand.slug)
  ) {
    return false;
  }
  const rupees = Math.round(product.priceCents / 100);
  if (filters.minRupees != null && rupees < filters.minRupees) return false;
  if (filters.maxRupees != null && rupees > filters.maxRupees) return false;
  if (filters.availability.length > 0) {
    const bucket: AvailabilityFilter = product.isPreOrder
      ? "preorder"
      : "ready";
    if (!filters.availability.includes(bucket)) return false;
  }
  return true;
}

/** Products matching every active filter, in catalogue order. */
export function filterCategoryProducts<T extends FilterableProduct>(
  products: readonly T[],
  filters: CategoryFilters,
  subcategoryOf: (slug: string) => string | undefined,
): T[] {
  return products.filter((p) => matchesFilters(p, filters, subcategoryOf));
}

/** How many products each brand has, ignoring the brand facet itself. */
export function brandCounts<T extends FilterableProduct>(
  products: readonly T[],
  filters: CategoryFilters,
  subcategoryOf: (slug: string) => string | undefined,
): { slug: string; name: string; count: number }[] {
  const withoutBrand = { ...filters, brands: [] };
  const counts = new Map<
    string,
    { slug: string; name: string; count: number }
  >();
  for (const product of products) {
    if (!matchesFilters(product, withoutBrand, subcategoryOf)) continue;
    const existing = counts.get(product.brand.slug);
    if (existing) existing.count += 1;
    else
      counts.set(product.brand.slug, {
        slug: product.brand.slug,
        name: product.brand.name ?? product.brand.slug,
        count: 1,
      });
  }
  return [...counts.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** How many products each availability bucket holds, ignoring that facet. */
export function availabilityCounts<T extends FilterableProduct>(
  products: readonly T[],
  filters: CategoryFilters,
  subcategoryOf: (slug: string) => string | undefined,
): Record<AvailabilityFilter, number> {
  const withoutAvail = { ...filters, availability: [] };
  const counts: Record<AvailabilityFilter, number> = { preorder: 0, ready: 0 };
  for (const product of products) {
    if (!matchesFilters(product, withoutAvail, subcategoryOf)) continue;
    counts[product.isPreOrder ? "preorder" : "ready"] += 1;
  }
  return counts;
}

/** The cheapest and dearest product in whole rupees. */
export function priceBounds(products: readonly FilterableProduct[]): {
  min: number;
  max: number;
} {
  if (products.length === 0) return { min: 0, max: 0 };
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (const product of products) {
    const rupees = Math.round(product.priceCents / 100);
    if (rupees < min) min = rupees;
    if (rupees > max) max = rupees;
  }
  return { min: Number.isFinite(min) ? min : 0, max };
}
