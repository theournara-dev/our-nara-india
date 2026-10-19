import { NextRequest, NextResponse } from "next/server";
import { getProductListing } from "@/data/products";
import { parseCategoryFilters } from "@/lib/category-filters";
import {
  parseListingPage,
  parseListingSort,
  PRODUCTS_PER_PAGE,
} from "@/lib/product-listing";
import { getRequestSiteVersion } from "@/lib/site-version.server";
import { parseSiteVersion } from "@/lib/site-version";

export const dynamic = "force-dynamic";

/**
 * One page of a storefront product listing. Used by the infinite loader after
 * the server-rendered first batch.
 *
 * `version` is optional and validated to `local | global`. The client sends the
 * version the page was rendered with, so later batches cannot come back priced
 * for the other store while the switcher's cookie is still catching up. It only
 * selects one of the two public storefronts and grants no extra access.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const categorySlug = params.get("category")?.trim() || undefined;
  const brandSlug = params.get("brandSlug")?.trim() || undefined;
  const query = params.get("q")?.trim() || undefined;

  if (!categorySlug && !brandSlug && !query) {
    return NextResponse.json(
      { error: "A category, brand or search query is required." },
      { status: 400 },
    );
  }
  if (
    (categorySlug?.length ?? 0) > 200 ||
    (brandSlug?.length ?? 0) > 200 ||
    (query?.length ?? 0) > 200
  ) {
    return NextResponse.json(
      { error: "Invalid listing filters." },
      { status: 400 },
    );
  }

  const filters = parseCategoryFilters({
    sub: params.get("sub") ?? undefined,
    brand: params.get("brand") ?? undefined,
    min: params.get("min") ?? undefined,
    max: params.get("max") ?? undefined,
    avail: params.get("avail") ?? undefined,
  });

  const version =
    parseSiteVersion(params.get("version") ?? undefined) ??
    (await getRequestSiteVersion());
  const listing = await getProductListing({
    categorySlug,
    brandSlug,
    query,
    filters,
    sort: parseListingSort(params.get("sort") ?? undefined),
    page: parseListingPage(params.get("page") ?? undefined),
    pageSize: PRODUCTS_PER_PAGE,
    version,
    // Category and brand pages render the brand/availability facets.
    includeFacets: Boolean(categorySlug || brandSlug),
  });

  return NextResponse.json(listing, {
    headers: { "Cache-Control": "no-store" },
  });
}
