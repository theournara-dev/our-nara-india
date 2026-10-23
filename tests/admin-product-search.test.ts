import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_PRODUCT_MAX_PAGE_SIZE,
  ADMIN_PRODUCT_PAGE_SIZE,
  ADMIN_PRODUCT_SELECTED_LIMIT,
  parseProductSearchParams,
  parseSelectedSlugs,
} from "../src/lib/admin-product-search";

test("admin product search clamps page and page size", () => {
  const parsed = parseProductSearchParams(
    new URLSearchParams({ q: "  serum  ", page: "0", pageSize: "9999" }),
  );
  assert.equal(parsed.q, "serum");
  assert.equal(parsed.page, 1);
  assert.equal(parsed.pageSize, ADMIN_PRODUCT_MAX_PAGE_SIZE);
  assert.equal(parsed.brand, "");
  assert.equal(parsed.category, "");
});

test("admin product search defaults to the first page", () => {
  const parsed = parseProductSearchParams(new URLSearchParams());
  assert.equal(parsed.page, 1);
  assert.equal(parsed.pageSize, ADMIN_PRODUCT_PAGE_SIZE);
});

test("admin product search trims long terms", () => {
  const parsed = parseProductSearchParams(
    new URLSearchParams({ q: "x".repeat(300), brand: " brand ", category: "cat" }),
  );
  assert.equal(parsed.q.length, 200);
  assert.equal(parsed.brand, "brand");
  assert.equal(parsed.category, "cat");
});

test("selected slugs are trimmed, deduped and capped", () => {
  assert.deepEqual(parseSelectedSlugs(" a, b ,a, ,"), ["a", "b"]);
  assert.deepEqual(parseSelectedSlugs(null), []);
  const many = Array.from({ length: 250 }, (_, i) => `s${i}`).join(",");
  assert.equal(parseSelectedSlugs(many).length, ADMIN_PRODUCT_SELECTED_LIMIT);
});
