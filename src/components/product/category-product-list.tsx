"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { ProductGrid } from "@/components/product/product-grid";
import {
  availabilityCounts,
  brandCounts,
  categoryFilterQuery,
  countActiveFilters,
  EMPTY_CATEGORY_FILTERS,
  filterCategoryProducts,
  resolveForStore,
  type AvailabilityFilter,
  type CategoryFilters,
  type FilterableProduct,
} from "@/lib/category-filters";
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
  products: ProductCard[];
  /** Columns on large screens (default 5 for category pages). */
  columns?: 3 | 4 | 5;
  /** Mid-level categories of the listing, already filtered to non-empty. */
  subcategories?: ListingTab[];
  /** Filters parsed from the URL, so a shared link opens pre-filtered. */
  initialFilters?: CategoryFilters;
  /** Category-page banners, rendered by the server page above the toolbar. */
  topBanners?: React.ReactNode;
  longBanner?: React.ReactNode;
}

type SortKey =
  "new" | "name" | "lowest" | "highest" | "manufacturer" | "review";

/** Products added per "Show more" click. */
const PAGE_STEP = 48;

/** Sort options matching the original category/brand toolbar. */
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "new", label: "New Item" },
  { key: "name", label: "Product Name" },
  { key: "lowest", label: "Lowest Price" },
  { key: "highest", label: "Highest Price" },
  { key: "manufacturer", label: "Manufacture Company" },
  { key: "review", label: "Product Review" },
];

/**
 * Category/brand listing: a filter sidebar on desktop (sub-category, brand,
 * price, availability), a filter sheet on phones, the sort toolbar and the
 * product grid. Every filter writes into the URL, so a filtered listing can be
 * shared and survives a reload.
 */
export function CategoryProductList({
  products,
  columns = 5,
  subcategories = [],
  initialFilters,
  topBanners,
  longBanner,
}: CategoryProductListProps) {
  const [sort, setSort] = useState<SortKey>("new");
  const [filters, setFilters] = useState<CategoryFilters>(
    initialFilters ?? EMPTY_CATEGORY_FILTERS,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const { version } = useSiteVersion();

  // Keep the address bar in step without asking the server for a re-render.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = categoryFilterQuery(filters);
    const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(null, "", url);
  }, [filters]);

  const rows = useMemo(
    () =>
      products.map((card) => ({
        card,
        view: resolveForStore(card, version) as FilterableProduct,
      })),
    [products, version],
  );
  const views = useMemo(() => rows.map((r) => r.view), [rows]);
  const cardOf = useMemo(
    () => new Map(rows.map((r) => [r.view.slug, r.card] as const)),
    [rows],
  );

  // Facet counts ignore their own facet, the usual listing behaviour.
  const brands = useMemo(() => brandCounts(views, filters), [views, filters]);
  const availability = useMemo(
    () => availabilityCounts(views, filters),
    [views, filters],
  );

  const visible = useMemo(
    () => filterCategoryProducts(views, filters),
    [views, filters],
  );

  const sorted = useMemo(() => {
    const arr = [...visible];
    switch (sort) {
      case "name":
        return arr.sort((a, b) =>
          (cardOf.get(a.slug)?.name ?? a.slug).localeCompare(
            cardOf.get(b.slug)?.name ?? b.slug,
          ),
        );
      case "lowest":
        return arr.sort((a, b) => a.priceCents - b.priceCents);
      case "highest":
        return arr.sort((a, b) => b.priceCents - a.priceCents);
      case "manufacturer":
        return arr.sort((a, b) =>
          (a.brand.name ?? a.brand.slug).localeCompare(
            b.brand.name ?? b.brand.slug,
          ),
        );
      case "new":
      case "review":
      default:
        return arr;
    }
  }, [visible, sort, cardOf]);

  // The cards for the surviving rows, in the sorted order above.
  const sortedCards = useMemo(
    () =>
      sorted
        .map((view) => cardOf.get(view.slug))
        .filter((card): card is ProductCard => Boolean(card)),
    [sorted, cardOf],
  );

  // The listing shows a page at a time so a large category renders quickly;
  // "Show more" reveals the next page of the same filtered, sorted list. A
  // new filter/sort starts over at the first page — reset during render
  // rather than in an effect, so the stale page never paints.
  const listingKey = `${sort}:${categoryFilterQuery(filters)}:${products.length}`;
  const [shown, setShown] = useState({ key: listingKey, count: PAGE_STEP });
  if (shown.key !== listingKey) setShown({ key: listingKey, count: PAGE_STEP });
  const shownCards = sortedCards.slice(0, shown.count);
  const hasMore = sortedCards.length > shownCards.length;

  const activeCount = countActiveFilters(filters);

  const panel = (
    <FilterPanel
      filters={filters}
      onChange={setFilters}
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
            onClick={() => setFilters({ ...filters, sub: undefined })}
          />
          {subcategories.map((s) => (
            <SubTile
              key={s.slug}
              label={s.name}
              image={s.image ?? undefined}
              active={filters.sub === s.slug}
              onClick={() => setFilters({ ...filters, sub: s.slug })}
            />
          ))}
        </div>
      )}

      {/* Category banners (admin-managed): the top pair then the long
          carousel, both under the mid-level tiles. */}
      {topBanners && <div className="mb-3">{topBanners}</div>}
      {longBanner && <div className="mb-4">{longBanner}</div>}

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
              <strong className="font-semibold text-[#222]">
                {visible.length}
              </strong>{" "}
              item{visible.length !== 1 ? "s" : ""}{" "}
              {visible.length === 1 ? "was" : "were"} found.
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
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-9 cursor-pointer rounded border border-[#e9e9e9] bg-white px-2 text-sm text-[#222] outline-none focus:border-point-500"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-6">
            <ProductGrid products={shownCards} columns={columns} />
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() =>
                    setShown((s) => ({ ...s, count: s.count + PAGE_STEP }))
                  }
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[#6f2dbd] bg-white px-8 text-sm font-medium text-[#6f2dbd] transition-colors duration-300 hover:bg-[#6f2dbd] hover:text-white"
                >
                  Show more ({sortedCards.length - shownCards.length})
                </button>
              </div>
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
              Show {visible.length} item{visible.length !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── The filter controls, shared by the sidebar and the phone sheet ── */

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
        ? filters.brands.filter((b) => b !== slug)
        : [...filters.brands, slug],
    });
  }

  function toggleAvailability(bucket: AvailabilityFilter) {
    onChange({
      ...filters,
      availability: filters.availability.includes(bucket)
        ? filters.availability.filter((a) => a !== bucket)
        : [...filters.availability, bucket],
    });
  }

  const activeCount = countActiveFilters(filters);

  return (
    <div className="space-y-6">
      <FilterGroup title="Brand">
        <ul className="space-y-1.5">
          {brands.map((b) => (
            <li key={b.slug}>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#444]">
                <input
                  type="checkbox"
                  checked={filters.brands.includes(b.slug)}
                  onChange={() => toggleBrand(b.slug)}
                  className="h-4 w-4 accent-point-500"
                />
                <span className="flex-1">{b.name}</span>
                <span className="text-[#999]">{b.count}</span>
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
            onChange={(e) => setMinInput(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={applyPrice}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyPrice();
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
            onChange={(e) => setMaxInput(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={applyPrice}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyPrice();
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
      <span
        className={`grid h-[62px] w-[62px] place-items-center overflow-hidden rounded-full border-2 bg-white transition-colors md:h-[76px] md:w-[76px] ${
          active
            ? "border-point-500"
            : "border-transparent group-hover:border-[#e9e9e9]"
        }`}
      >
        {image ? (
          <Image
            src={image}
            alt=""
            width={160}
            height={160}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className={`text-[11px] font-semibold md:text-xs ${
              active ? "text-point-500" : "text-[#999]"
            }`}
            aria-hidden
          >
            {label.slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>
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
