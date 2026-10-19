import type { ProductCardView } from "@/data/catalog";
import {
  categoryFilterQuery,
  type CategoryFilters,
} from "@/lib/category-filters";
import type { SiteVersion } from "@/lib/site-version";

/** How a product listing can be ordered. */
export type ListingSort =
  "new" | "name" | "lowest" | "highest" | "manufacturer" | "review";

/** The toolbar's sort options, shared by the server parsers and the client UI. */
export const LISTING_SORTS: { key: ListingSort; label: string }[] = [
  { key: "new", label: "New Item" },
  { key: "name", label: "Product Name" },
  { key: "lowest", label: "Lowest Price" },
  { key: "highest", label: "Highest Price" },
  { key: "manufacturer", label: "Manufacture Company" },
  { key: "review", label: "Product Review" },
];

/** Products fetched per batch, both on the server and by the infinite loader. */
export const PRODUCTS_PER_PAGE = 48;

export function parseListingSort(value: string | undefined): ListingSort {
  return LISTING_SORTS.some((option) => option.key === value)
    ? (value as ListingSort)
    : "new";
}

export function parseListingPage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export interface BrandFacet {
  slug: string;
  name: string;
  count: number;
}

export interface AvailabilityFacets {
  preorder: number;
  ready: number;
}

/** One page of a category, brand or search listing. */
export interface ProductListingPage {
  products: ProductCardView[];
  /** Full number of products matching the current filters. */
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  /** Full brand counts; empty when facets were not requested. */
  brandFacets: BrandFacet[];
  /** Full availability counts; zeroes when facets were not requested. */
  availabilityFacets: AvailabilityFacets;
}

/** The fixed context a client list needs in order to request another page. */
export interface ListingContext {
  categorySlug?: string;
  brandSlug?: string;
  query?: string;
}

/** The query string shared by the listing API and client-side URL updates. */
export function listingQueryParams({
  context,
  version,
  filters,
  sort,
  page,
  includeContext = true,
}: {
  context: ListingContext;
  version?: SiteVersion;
  filters: CategoryFilters;
  sort: ListingSort;
  page: number;
  includeContext?: boolean;
}): URLSearchParams {
  const params = new URLSearchParams();
  if (includeContext) {
    if (context.categorySlug) params.set("category", context.categorySlug);
    if (context.brandSlug) params.set("brandSlug", context.brandSlug);
    if (context.query) params.set("q", context.query);
    if (version) params.set("version", version);
  }

  const filterQuery = categoryFilterQuery(filters);
  new URLSearchParams(filterQuery).forEach((value, key) =>
    params.set(key, value),
  );

  if (sort !== "new") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  return params;
}
