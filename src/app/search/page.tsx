import { Container } from "@/components/ui/container";
import { InfiniteProductGrid } from "@/components/product/infinite-product-grid";
import { getProductListing } from "@/data/products";
import { EMPTY_CATEGORY_FILTERS } from "@/lib/category-filters";
import { parseListingPage, PRODUCTS_PER_PAGE } from "@/lib/product-listing";
import { getRequestSiteVersion } from "@/lib/site-version.server";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const query = q?.trim() ?? "";
  const version = await getRequestSiteVersion();

  const listing = query
    ? await getProductListing({
        query,
        filters: EMPTY_CATEGORY_FILTERS,
        sort: "new",
        page: parseListingPage(page),
        pageSize: PRODUCTS_PER_PAGE,
        version,
        includeFacets: false,
      })
    : null;

  return (
    <Container className="py-10">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">
        {listing
          ? `${listing.total} result${listing.total === 1 ? "" : "s"}`
          : "Search"}
      </p>
      <h1 className="font-category mb-6 text-3xl font-semibold text-zinc-900">
        {query ? `Results for “${query}”` : "Search products"}
      </h1>

      {!listing ? (
        <p className="text-zinc-500">
          Use the search box in the header to find products and brands.
        </p>
      ) : listing.total === 0 ? (
        <p className="text-zinc-500">
          No products matched “{query}”. Try a different term.
        </p>
      ) : (
        <InfiniteProductGrid
          key={`${query}:${listing.page}`}
          initialProducts={listing.products}
          initialTotal={listing.total}
          initialNextPage={listing.hasMore ? listing.page + 1 : null}
          query={query}
          version={version}
          columns={4}
        />
      )}
    </Container>
  );
}
