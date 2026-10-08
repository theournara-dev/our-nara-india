import assert from "node:assert/strict";
import { test } from "node:test";
import {
  availabilityCounts,
  brandCounts,
  categoryFilterQuery,
  countActiveFilters,
  EMPTY_CATEGORY_FILTERS,
  filterCategoryProducts,
  parseCategoryFilters,
  priceBounds,
  resolveForStore,
  type FilterableProduct,
} from "../src/lib/category-filters";

type P = {
  slug: string;
  priceCents: number;
  saleState: "preorder" | "buynow" | "unavailable";
  brand: { slug: string; name: string };
};

const products: P[] = [
  {
    slug: "a",
    priceCents: 29_900,
    saleState: "buynow",
    brand: { slug: "acnes", name: "ACNES" },
  },
  {
    slug: "b",
    priceCents: 50_000,
    saleState: "preorder",
    brand: { slug: "hyggee", name: "HYGGEE" },
  },
  {
    slug: "c",
    priceCents: 190_000,
    saleState: "preorder",
    brand: { slug: "hyggee", name: "HYGGEE" },
  },
  {
    slug: "d",
    priceCents: 153_000,
    saleState: "buynow",
    brand: { slug: "la-theorie", name: "LA THEORIE" },
  },
];

const subs: Record<string, string> = {
  a: "masks",
  b: "masks",
  c: "cleansing",
  d: "cleansing",
};
const subOf = (slug: string) => subs[slug];

test("parseCategoryFilters reads the URL params and drops nonsense", () => {
  const f = parseCategoryFilters({
    sub: "masks",
    brand: "acnes,hyggee,acnes",
    min: "500",
    max: "200",
    avail: "ready,bogus",
  });
  assert.equal(f.sub, "masks");
  assert.deepEqual(f.brands, ["acnes", "hyggee"]);
  assert.equal(f.minRupees, 500);
  // A ceiling below the floor is dropped rather than emptying the listing.
  assert.equal(f.maxRupees, undefined);
  assert.deepEqual(f.availability, ["ready"]);
});

test("categoryFilterQuery round-trips", () => {
  const f = parseCategoryFilters({
    sub: "cleansing",
    brand: "hyggee",
    min: "100",
    max: "2000",
    avail: "preorder",
  });
  const q = categoryFilterQuery(f);
  assert.equal(q, "sub=cleansing&brand=hyggee&min=100&max=2000&avail=preorder");
  assert.deepEqual(
    parseCategoryFilters(Object.fromEntries(new URLSearchParams(q))),
    f,
  );
});

test("filters combine across facets", () => {
  const f = parseCategoryFilters({
    brand: "hyggee",
    min: "1000",
    avail: "preorder",
  });
  const out = filterCategoryProducts(products, f, subOf);
  assert.deepEqual(
    out.map((p) => p.slug),
    ["c"],
  );
  const none = filterCategoryProducts(
    products,
    parseCategoryFilters({ brand: "acnes", avail: "preorder" }),
    subOf,
  );
  assert.deepEqual(none, []);
});

test("brandCounts ignores the brand facet but honours the others", () => {
  const f = parseCategoryFilters({ sub: "masks", brand: "acnes" });
  const counts = brandCounts(products, f, subOf);
  assert.deepEqual(counts, [
    { slug: "acnes", name: "ACNES", count: 1 },
    { slug: "hyggee", name: "HYGGEE", count: 1 },
  ]);
});

test("priceBounds and countActiveFilters", () => {
  assert.deepEqual(priceBounds(products), { min: 299, max: 1900 });
  assert.equal(countActiveFilters(EMPTY_CATEGORY_FILTERS), 0);
  assert.equal(
    countActiveFilters(
      parseCategoryFilters({
        sub: "masks",
        brand: "a,b",
        min: "1",
        avail: "ready",
      }),
    ),
    5,
  );
});

// ── Store resolution ───────────────────────────────────────────────────────

/** One product that the two stores sell differently. */
const dualStore = {
  slug: "x",
  priceCents: 100_000,
  globalPriceCents: 220_000,
  isActive: true,
  isPreOrder: true,
  buyNowEnabled: false,
  globalIsActive: true,
  globalIsPreOrder: false,
  globalBuyNowEnabled: true,
  brand: { slug: "moolda", name: "MOOLDA" },
};

test("resolveForStore prices and buckets per store", () => {
  const local = resolveForStore(dualStore, "local");
  assert.equal(local.priceCents, 100_000, "local store uses the local price");
  assert.equal(local.saleState, "preorder");

  const global = resolveForStore(dualStore, "global");
  assert.equal(global.priceCents, 220_000, "global store uses its own price");
  assert.equal(global.saleState, "buynow");
});

test("a pre-order locally is ready-to-ship internationally", () => {
  // The exact confusion the facet used to have: the shared pre-order flag put
  // this product in the pre-order bucket on both storefronts.
  const local = resolveForStore(dualStore, "local");
  const global = resolveForStore(dualStore, "global");
  const ready = parseCategoryFilters({ avail: "ready" });
  const preorder = parseCategoryFilters({ avail: "preorder" });

  assert.deepEqual(
    filterCategoryProducts([global], ready, subOf).map((p) => p.slug),
    ["x"],
  );
  assert.deepEqual(filterCategoryProducts([global], preorder, subOf), []);
  assert.deepEqual(
    filterCategoryProducts([local], preorder, subOf).map((p) => p.slug),
    ["x"],
  );
  assert.deepEqual(filterCategoryProducts([local], ready, subOf), []);
});

test("the price facet follows the store's price", () => {
  const global = resolveForStore(dualStore, "global");
  const under1500 = parseCategoryFilters({ max: "1500" });
  assert.deepEqual(filterCategoryProducts([global], under1500, subOf), []);
  const local = resolveForStore(dualStore, "local");
  assert.deepEqual(
    filterCategoryProducts([local], under1500, subOf).map((p) => p.slug),
    ["x"],
  );
});

test("a not-yet-sellable product sits in no availability bucket", () => {
  const comingSoon = resolveForStore(
    {
      slug: "soon",
      priceCents: 10_000,
      isActive: true,
      isPreOrder: false,
      buyNowEnabled: false,
      globalIsActive: true,
      globalIsPreOrder: false,
      globalBuyNowEnabled: false,
      brand: { slug: "acnes", name: "ACNES" },
    },
    "local",
  );
  assert.equal(comingSoon.saleState, "unavailable");
  const counts = availabilityCounts(
    [comingSoon] as FilterableProduct[],
    EMPTY_CATEGORY_FILTERS,
    subOf,
  );
  assert.deepEqual(counts, { preorder: 0, ready: 0 });
  const ready = parseCategoryFilters({ avail: "ready" });
  assert.deepEqual(filterCategoryProducts([comingSoon], ready, subOf), []);
  // With no availability facet it still shows.
  assert.equal(
    filterCategoryProducts([comingSoon], EMPTY_CATEGORY_FILTERS, subOf).length,
    1,
  );
});

test("availabilityCounts counts each store's buckets", () => {
  const store = products.map((p) => ({
    slug: p.slug,
    priceCents: p.priceCents,
    saleState: p.saleState,
    brand: p.brand,
  }));
  const counts = availabilityCounts(
    store as FilterableProduct[],
    EMPTY_CATEGORY_FILTERS,
    subOf,
  );
  assert.deepEqual(counts, { preorder: 2, ready: 2 });
});
