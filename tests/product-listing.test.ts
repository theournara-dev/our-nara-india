import { test } from "node:test";
import assert from "node:assert/strict";
// Loads .env when the suite runs locally, like the other database-backed test.
import "dotenv/config";
import { db } from "../src/lib/db";
import { getProductListing } from "../src/data/products";
import { EMPTY_CATEGORY_FILTERS } from "../src/lib/category-filters";
import {
  listingQueryParams,
  parseListingPage,
  parseListingSort,
} from "../src/lib/product-listing";

test("listing sort and page inputs fall back safely", () => {
  assert.equal(parseListingSort("highest"), "highest");
  assert.equal(parseListingSort("nope"), "new");
  assert.equal(parseListingSort(undefined), "new");
  assert.equal(parseListingPage("3"), 3);
  assert.equal(parseListingPage("0"), 1);
  assert.equal(parseListingPage("-2"), 1);
  assert.equal(parseListingPage("abc"), 1);
});

test("listing query params carry filters, sort and page", () => {
  const params = listingQueryParams({
    context: { categorySlug: "skin-care" },
    filters: {
      ...EMPTY_CATEGORY_FILTERS,
      sub: "facial-care",
      brands: ["vt", "ahc"],
      minRupees: 500,
      maxRupees: 2000,
      availability: ["ready"],
    },
    sort: "lowest",
    page: 2,
  });
  assert.equal(params.get("category"), "skin-care");
  assert.equal(params.get("sub"), "facial-care");
  assert.equal(params.get("brand"), "vt,ahc");
  assert.equal(params.get("min"), "500");
  assert.equal(params.get("max"), "2000");
  assert.equal(params.get("avail"), "ready");
  assert.equal(params.get("sort"), "lowest");
  assert.equal(params.get("page"), "2");
});

test("browser URL params omit the listing context and the first page", () => {
  const params = listingQueryParams({
    context: { categorySlug: "skin-care", query: "serum" },
    filters: { ...EMPTY_CATEGORY_FILTERS, brands: ["vt"] },
    sort: "new",
    page: 1,
    includeContext: false,
  });
  assert.equal(params.get("category"), null);
  assert.equal(params.get("q"), null);
  assert.equal(params.get("page"), null);
  assert.equal(params.get("sort"), null);
  assert.equal(params.get("brand"), "vt");
});

test("listing query params carry the store version only for API calls", () => {
  const api = listingQueryParams({
    context: { categorySlug: "skin-care" },
    version: "global",
    filters: EMPTY_CATEGORY_FILTERS,
    sort: "new",
    page: 1,
  });
  assert.equal(api.get("version"), "global");

  const browser = listingQueryParams({
    context: { categorySlug: "skin-care" },
    version: "global",
    filters: EMPTY_CATEGORY_FILTERS,
    sort: "new",
    page: 1,
    includeContext: false,
  });
  assert.equal(browser.get("version"), null);
});

test(
  "a category listing returns the full total and every brand",
  { skip: !process.env.DATABASE_URL },
  async () => {
    const first = await getProductListing({
      categorySlug: "skin-care",
      filters: EMPTY_CATEGORY_FILTERS,
      sort: "new",
      page: 1,
      pageSize: 5,
      version: "local",
    });

    assert.equal(first.products.length, 5);
    assert.ok(first.total > 300, "the category must not be capped at 300");
    assert.ok(first.hasMore);
    assert.ok(first.brandFacets.length > 1);
    assert.ok(
      first.brandFacets.some((brand) => brand.slug === "vt" && brand.count > 0),
      "VT must be in the full brand facets",
    );

    const second = await getProductListing({
      categorySlug: "skin-care",
      filters: EMPTY_CATEGORY_FILTERS,
      sort: "new",
      page: 2,
      pageSize: 5,
      version: "local",
    });
    assert.equal(second.products.length, 5);
    assert.notEqual(first.products[0]?.id, second.products[0]?.id);
  },
);

test(
  "a brand listing is not capped either",
  { skip: !process.env.DATABASE_URL },
  async () => {
    const first = await getProductListing({
      brandSlug: "medipeel",
      filters: EMPTY_CATEGORY_FILTERS,
      sort: "new",
      page: 1,
      pageSize: 20,
      version: "local",
      includeFacets: true,
    });
    assert.ok(first.total > 20, "the brand spans more than one batch");
    assert.equal(first.products.length, 20);
    assert.ok(first.hasMore);
    assert.ok(
      first.brandFacets.some(
        (facet) => facet.slug === "medipeel" && facet.count === first.total,
      ),
      "brand pages need the facet counts for the filter sheet",
    );

    const second = await getProductListing({
      brandSlug: "medipeel",
      filters: EMPTY_CATEGORY_FILTERS,
      sort: "new",
      page: 2,
      pageSize: 20,
      version: "local",
      includeFacets: false,
    });
    assert.equal(second.products.length, 20);
    assert.notEqual(first.products[0]?.id, second.products[0]?.id);
  },
);

test(
  "a page beyond the end clamps to the last page",
  { skip: !process.env.DATABASE_URL },
  async () => {
    const listing = await getProductListing({
      categorySlug: "skin-care",
      filters: EMPTY_CATEGORY_FILTERS,
      sort: "new",
      page: 9999,
      pageSize: 48,
      version: "local",
    });
    assert.equal(listing.page, listing.totalPages);
    assert.ok(listing.products.length > 0);
  },
);

test(
  "availability facets follow the card flags, not the brand-wide buy-now",
  { skip: !process.env.DATABASE_URL },
  async () => {
    const rows = await db.product.findMany({
      where: { brand: { slug: "nowater" }, isActive: true },
      select: { buyNowEnabled: true, isPreOrder: true },
    });
    const ready = rows.filter((row) => row.buyNowEnabled).length;
    const preorder = rows.filter(
      (row) => !row.buyNowEnabled && row.isPreOrder,
    ).length;

    const listing = await getProductListing({
      brandSlug: "nowater",
      filters: EMPTY_CATEGORY_FILTERS,
      sort: "new",
      page: 1,
      pageSize: 20,
      version: "local",
      includeFacets: true,
    });

    assert.deepEqual(listing.availabilityFacets, { ready, preorder });
  },
);

test(
  "price sorting uses the store price",
  { skip: !process.env.DATABASE_URL },
  async () => {
    const listing = await getProductListing({
      categorySlug: "skin-care",
      filters: EMPTY_CATEGORY_FILTERS,
      sort: "lowest",
      page: 1,
      pageSize: 20,
      version: "local",
    });
    const prices = listing.products.map((product) => product.priceCents);
    assert.deepEqual(
      prices,
      [...prices].sort((a, b) => a - b),
    );
    assert.equal(listing.pageSize, 20);
  },
);
