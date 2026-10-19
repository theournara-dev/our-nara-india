"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { ProductGrid } from "@/components/product/product-grid";
import {
  countActiveFilters,
  EMPTY_CATEGORY_FILTERS,
  type AvailabilityFilter,
  type CategoryFilters,
} from "@/lib/category-filters";
import {
  LISTING_SORTS,
  listingQueryParams,
  type AvailabilityFacets,
  type BrandFacet,
  type ListingContext,
  type ListingSort,
  type ProductListingPage,
} from "@/lib/product-listing";
import type { ProductCard } from "@/data/products";
import { useSiteVersion } from "@/components/site-version-provider";

/**
 * A mid-level category of the listing. Structurally the data layer's
 * `CategoryTab` — kept structural so this client component never imports the
 * server data module.
 */
export interface ListingTab {
  slug: string;
  name: string;
  /** Tile artwork; empty renders the name alone. */
  image: string | null;
}

interface CategoryProductListProps {
  /** The server-rendered first page (or a deep-linked page). */
  initialListing: ProductListingPage;
  /** What this list is scoped to, used when requesting later batches. */
  context: ListingContext;
  /** Columns on large screens (default 5 for category pages). */
  columns?: 3 | 4 | 5;
  /** Mid-level categories of the listing, already filtered to non-empty. */
  subcategories?: ListingTab[];
  /** Filters parsed from the URL, so a shared link opens pre-filtered. */
  initialFilters?: CategoryFilters;
  initialSort?: ListingSort;
  /** Category-page banners, rendered by the server page above the toolbar. */
  longBanner?: React.ReactNode;
  /** The promo block under the long banner (client's slide 4). */
  promoBanner?: React.ReactNode;
}

/**
 * Category/brand listing: a filter sidebar on desktop (sub-category, brand,
 * price, availability), a filter sheet on phones, the sort toolbar and an
 * infinitely scrolling product grid.
 *
 * The server renders the first batch and the full filtered total/facets; later
 * batches come from `/api/products/listing`. Every count stays the full count,
 * not the number of cards currently mounted.
 */
export function CategoryProductList({
  initialListing,
  context,
  columns = 5,
  subcategories = [],
  initialFilters,
  initialSort = "new",
  longBanner,
  promoBanner,
}: CategoryProductListProps) {
  const [sort, setSort] = useState<ListingSort>(initialSort);
  const [filters, setFilters] = useState<CategoryFilters>(
    initialFilters ?? EMPTY_CATEGORY_FILTERS,
  );
  const [products, setProducts] = useState<ProductCard[]>(
    initialListing.products,
  );
  const [total, setTotal] = useState(initialListing.total);
  const [brands, setBrands] = useState<BrandFacet[]>(
    initialListing.brandFacets,
  );
  const [availability, setAvailability] = useState<AvailabilityFacets>(
    initialListing.availabilityFacets,
  );
  const [nextPage, setNextPage] = useState<number | null>(
    initialListing.hasMore ? initialListing.page + 1 : null,
  );
  const [loading, setLoading] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedPage, setFailedPage] = useState<{
    page: number;
    replace: boolean;
  } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { version } = useSiteVersion();

  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const versionRef = useRef(version);

  // Keep the address bar in step with the filters/sort, without a server
  // round-trip. The page parameter resets because a new filter is a new list.
  const syncUrl = useCallback(
    (nextFilters: CategoryFilters, nextSort: ListingSort) => {
      if (typeof window === "undefined") return;
      const query = listingQueryParams({
        context,
        filters: nextFilters,
        sort: nextSort,
        page: 1,
        includeContext: false,
      }).toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}`,
      );
    },
    [context],
  );

  const fetchPage = useCallback(
    async (
      page: number,
      replace: boolean,
      nextFilters: CategoryFilters,
      nextSort: ListingSort,
    ) => {
      const requestId = ++requestRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setReplacing(replace);
      setError(null);
      setFailedPage(null);

      try {
        const query = listingQueryParams({
          context,
          version,
          filters: nextFilters,
          sort: nextSort,
          page,
        }).toString();
        const response = await fetch(`/api/products/listing?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? "Could not load products.");
        }
        const data = (await response.json()) as ProductListingPage;
        if (requestId !== requestRef.current) return;

        if (replace) {
          setProducts(data.products);
          setTotal(data.total);
          setBrands(data.brandFacets);
          setAvailability(data.availabilityFacets);
        } else {
          setProducts((previous) => {
            const seen = new Set(previous.map((product) => product.id));
            return [
              ...previous,
              ...data.products.filter((product) => !seen.has(product.id)),
            ];
          });
        }
        setNextPage(data.hasMore ? data.page + 1 : null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setFailedPage({ page, replace });
        setError(
          err instanceof Error ? err.message : "Could not load products.",
        );
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false);
          setReplacing(false);
        }
      }
    },
    [context, version],
  );

  const applyFilters = useCallback(
    (next: CategoryFilters) => {
      setFilters(next);
      syncUrl(next, sort);
      void fetchPage(1, true, next, sort);
    },
    [fetchPage, sort, syncUrl],
  );

  const applySort = useCallback(
    (next: ListingSort) => {
      setSort(next);
      syncUrl(filters, next);
      void fetchPage(1, true, filters, next);
    },
    [fetchPage, filters, syncUrl],
  );

  const loadMore = useCallback(() => {
    if (loading || error || nextPage == null) return;
    void fetchPage(nextPage, false, filters, sort);
  }, [loading, error, nextPage, fetchPage, filters, sort]);

  function retry() {
    if (!failedPage) return;
    void fetchPage(failedPage.page, failedPage.replace, filters, sort);
  }

  // A store switch changes prices and visibility, so restart from page one.
  useEffect(() => {
    if (versionRef.current === version) return;
    versionRef.current = version;
    void fetchPage(1, true, filters, sort);
  }, [version, fetchPage, filters, sort]);

  // Load the next batch before the sentinel actually reaches the viewport.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || nextPage == null || loading || error || replacing) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextPage, loading, error, replacing, loadMore]);

  const activeCount = countActiveFilters(filters);

  const panel = (
    <FilterPanel
      filters={filters}
      onChange={applyFilters}
      brands={brands}
      availability={availability}
    />
  );

  return (
    <div>
      {/* Mid-level categories stay on top, centred, as image tiles (the
          original shows icons here); empty ones never reach this list. */}
      {subcategories.length > 0 && (
        <div className="mb-4 flex justify-center gap-2 overflow-x-auto pb-1 md:gap-5 max-md:justify-start">
          <SubTile
            label="All"
            active={filters.sub == null}
            onClick={() => applyFilters({ ...filters, sub: undefined })}
          />
          {subcategories.map((subcategory) => (
            <SubTile
              key={subcategory.slug}
              label={subcategory.name}
              image={subcategory.image ?? undefined}
              active={filters.sub === subcategory.slug}
              onClick={() =>
                applyFilters({ ...filters, sub: subcategory.slug })
              }
            />
          ))}
        </div>
      )}

      {/* Category banners (admin-managed): the long banner strip and the promo
          block, both under the mid-level tiles. */}
      {longBanner && <div className="mb-3">{longBanner}</div>}
      {promoBanner && <div className="mb-4">{promoBanner}</div>}

      <div className="flex items-start gap-8">
        {/* Sidebar (desktop) */}
        {subcategories.length > 0 || brands.length > 1 ? (
          <aside className="hidden w-[210px] shrink-0 lg:block">
            <div className="sticky top-4 rounded-2xl border border-[#eee] bg-white p-4">
              <p className="mb-3 text-sm font-semibold text-ink">Filters</p>
              {panel}
            </div>
          </aside>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
            <span className="text-sm text-[#555]">
              <strong className="font-semibold text-[#222]">{total}</strong>{" "}
              item{total !== 1 ? "s" : ""} {total === 1 ? "was" : "were"} found.
            </span>
            <div className="ml-auto flex items-center gap-2">
              {/* Phones get the same controls in a sheet */}
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                Filters
                {activeCount > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-point-500 px-1 text-[11px] font-semibold text-white">
                    {activeCount}
                  </span>
                )}
              </button>
              <label className="flex items-center gap-2">
                <span className="text-xs text-[#888]">Sort</span>
                <select
                  value={sort}
                  onChange={(event) =>
                    applySort(event.target.value as ListingSort)
                  }
                  className="h-9 cursor-pointer rounded border border-[#e9e9e9] bg-white px-2 text-sm text-[#222] outline-none focus:border-point-500"
                >
                  {LISTING_SORTS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-6">
            <div
              className={`transition-opacity duration-200 ${
                replacing ? "opacity-50" : "opacity-100"
              }`}
            >
              <ProductGrid products={products} columns={columns} />
            </div>

            {nextPage != null && !error && (
              <div className="mt-8 text-center">
                <div ref={sentinelRef} aria-hidden className="h-px" />
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loading}
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[#6f2dbd] bg-white px-8 text-sm font-medium text-[#6f2dbd] transition-colors duration-300 hover:bg-[#6f2dbd] hover:text-white disabled:opacity-60"
                >
                  {loading
                    ? "Loading…"
                    : `Load more${
                        total > products.length
                          ? ` (${total - products.length})`
                          : ""
                      }`}
                </button>
              </div>
            )}

            {loading && (
              <p className="mt-3 text-center text-xs text-[#888]">
                {replacing ? "Loading products…" : "Loading more products…"}
              </p>
            )}

            {error && (
              <div className="mt-6 rounded border border-red-100 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
                {error}{" "}
                <button
                  type="button"
                  onClick={retry}
                  className="cursor-pointer font-semibold underline"
                >
                  Try again
                </button>
              </div>
            )}

            {nextPage == null && !loading && !error && products.length > 0 && (
              <p className="mt-8 text-center text-xs text-[#999]">
                All {total} items shown.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filter sheet (phones) */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[120] lg:hidden" data-overlay>
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 cursor-pointer bg-black/40"
          />
          <div
            role="dialog"
            aria-label="Filters"
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 pb-8"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-semibold text-ink">Filters</p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-full hover:bg-zinc-100"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {panel}
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-6 h-12 w-full cursor-pointer rounded-lg bg-point-500 text-sm font-bold text-white"
            >
              Show {total} item{total !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPanel({
  filters,
  onChange,
  brands,
  availability,
}: {
  filters: CategoryFilters;
  onChange: (next: CategoryFilters) => void;
  brands: { slug: string; name: string; count: number }[];
  availability: Record<AvailabilityFilter, number>;
}) {
  const [minInput, setMinInput] = useState("");
  const [maxInput, setMaxInput] = useState("");

  function applyPrice() {
    const min = minInput.trim() === "" ? undefined : Number(minInput);
    const max = maxInput.trim() === "" ? undefined : Number(maxInput);
    onChange({
      ...filters,
      minRupees:
        min != null && Number.isFinite(min) && min >= 0 ? min : undefined,
      maxRupees:
        max != null && Number.isFinite(max) && max >= 0 ? max : undefined,
    });
  }

  function toggleBrand(slug: string) {
    onChange({
      ...filters,
      brands: filters.brands.includes(slug)
        ? filters.brands.filter((brand) => brand !== slug)
        : [...filters.brands, slug],
    });
  }

  function toggleAvailability(bucket: AvailabilityFilter) {
    onChange({
      ...filters,
      availability: filters.availability.includes(bucket)
        ? filters.availability.filter((item) => item !== bucket)
        : [...filters.availability, bucket],
    });
  }

  const activeCount = countActiveFilters(filters);

  return (
    <div className="space-y-6">
      <FilterGroup title="Brand">
        <ul className="space-y-1.5">
          {brands.map((brand) => (
            <li key={brand.slug}>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#444]">
                <input
                  type="checkbox"
                  checked={filters.brands.includes(brand.slug)}
                  onChange={() => toggleBrand(brand.slug)}
                  className="h-4 w-4 accent-point-500"
                />
                <span className="flex-1">{brand.name}</span>
                <span className="text-[#999]">{brand.count}</span>
              </label>
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Price">
        <div className="flex items-center gap-1.5">
          <input
            key={`min-${filters.minRupees ?? ""}`}
            inputMode="numeric"
            defaultValue={
              filters.minRupees != null ? String(filters.minRupees) : ""
            }
            onChange={(event) =>
              setMinInput(event.target.value.replace(/[^\d]/g, ""))
            }
            onBlur={applyPrice}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyPrice();
            }}
            placeholder="Min"
            aria-label="Minimum price"
            className="h-8 w-full min-w-0 rounded border border-[#e9e9e9] px-2 text-[13px] outline-none focus:border-point-500"
          />
          <span className="text-[#999]">–</span>
          <input
            key={`max-${filters.maxRupees ?? ""}`}
            inputMode="numeric"
            defaultValue={
              filters.maxRupees != null ? String(filters.maxRupees) : ""
            }
            onChange={(event) =>
              setMaxInput(event.target.value.replace(/[^\d]/g, ""))
            }
            onBlur={applyPrice}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyPrice();
            }}
            placeholder="Max"
            aria-label="Maximum price"
            className="h-8 w-full min-w-0 rounded border border-[#e9e9e9] px-2 text-[13px] outline-none focus:border-point-500"
          />
        </div>
      </FilterGroup>

      <FilterGroup title="Availability">
        <ul className="space-y-1.5">
          <li>
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#444]">
              <input
                type="checkbox"
                checked={filters.availability.includes("ready")}
                onChange={() => toggleAvailability("ready")}
                className="h-4 w-4 accent-point-500"
              />
              <span className="flex-1">Ready to ship</span>
              <span className="text-[#999]">{availability.ready}</span>
            </label>
          </li>
          <li>
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#444]">
              <input
                type="checkbox"
                checked={filters.availability.includes("preorder")}
                onChange={() => toggleAvailability("preorder")}
                className="h-4 w-4 accent-point-500"
              />
              <span className="flex-1">Pre-order</span>
              <span className="text-[#999]">{availability.preorder}</span>
            </label>
          </li>
        </ul>
      </FilterGroup>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_CATEGORY_FILTERS)}
          className="w-full cursor-pointer rounded border border-[#e9e9e9] py-2 text-[13px] font-medium text-[#555] hover:bg-zinc-50"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-ink">{title}</p>
      {children}
    </div>
  );
}

/**
 * A mid-level category tile: artwork (name alone when no image is uploaded)
 * over the label, tinted while the listing is filtered by it.
 */
function SubTile({
  label,
  image,
  active,
  onClick,
}: {
  label: string;
  image?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="group flex w-[76px] shrink-0 cursor-pointer flex-col items-center gap-1.5 md:w-[92px]"
    >
      {/* With artwork the tile renders the image as-is — a plain rectangle,
          no circle and no border, so nothing is cropped (the client's
          follow-up); only the letter fallback keeps the circle. */}
      {image ? (
        <span className="block w-[62px] md:w-[76px]">
          <Image
            src={image}
            alt=""
            width={160}
            height={160}
            unoptimized
            className="h-auto w-full"
          />
        </span>
      ) : (
        <span
          className={`grid h-[62px] w-[62px] place-items-center overflow-hidden rounded-full border-2 bg-white transition-colors md:h-[76px] md:w-[76px] ${
            active
              ? "border-point-500"
              : "border-transparent group-hover:border-[#e9e9e9]"
          }`}
        >
          <span
            className={`text-[11px] font-semibold md:text-xs ${
              active ? "text-point-500" : "text-[#999]"
            }`}
            aria-hidden
          >
            {label.slice(0, 1).toUpperCase()}
          </span>
        </span>
      )}
      <span
        className={`line-clamp-2 text-center text-[12px] leading-4 md:text-[13px] ${
          active ? "font-semibold text-point-500" : "text-[#555]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
