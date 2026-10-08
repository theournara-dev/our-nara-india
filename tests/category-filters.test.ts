import assert from "node:assert/strict";
import { test } from "node:test";
import {
  brandCounts,
  categoryFilterQuery,
  countActiveFilters,
  EMPTY_CATEGORY_FILTERS,
  filterCategoryProducts,
  parseCategoryFilters,
  priceBounds,
} from "../src/lib/category-filters";

type P = {
  slug: string;
  priceCents: number;
  isPreOrder: boolean;
  brand: { slug: string; name: string };
};

const products: P[] = [
  {
    slug: "a",
    priceCents: 29_900,
    isPreOrder: false,
    brand: { slug: "acnes", name: "ACNES" },
  },
  {
    slug: "b",
    priceCents: 50_000,
    isPreOrder: true,
    brand: { slug: "hyggee", name: "HYGGEE" },
  },
  {
    slug: "c",
    priceCents: 190_000,
    isPreOrder: true,
    brand: { slug: "hyggee", name: "HYGGEE" },
  },
  {
    slug: "d",
    priceCents: 1_530_00,
    isPreOrder: false,
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
