import { test } from "node:test";
import assert from "node:assert/strict";
import {
  discountStatus,
  discountTargetFor,
  isDiscountLive,
  resolvePrice,
  type DiscountRecord,
  type DiscountTarget,
} from "../src/lib/discounts";

const now = new Date("2026-10-20T12:00:00Z");
const target: DiscountTarget = {
  productId: "p1",
  brandId: "b1",
  categoryIds: ["c1", "parent"],
};

const base = {
  brandId: null,
  categoryId: null,
  productId: null,
  siteVersion: "all",
  startsAt: null,
  endsAt: null,
  isActive: true,
  deletedAt: null,
  createdAt: new Date("2026-10-01T00:00:00Z"),
} satisfies Omit<DiscountRecord, "id" | "title" | "type" | "value" | "scope">;

let seq = 0;
function discount(over: Partial<DiscountRecord> = {}): DiscountRecord {
  seq += 1;
  return {
    id: `d${seq}`,
    title: `Deal ${seq}`,
    type: "PERCENT",
    value: 10,
    scope: "ALL",
    ...base,
    ...over,
  };
}

test("percent discount applies and reports the amount", () => {
  const d = discount({ id: "diwali", title: "Diwali", value: 20 });
  const result = resolvePrice(1000, target, [d], "local", now);

  assert.equal(result.listCents, 1000);
  assert.equal(result.amountCents, 200);
  assert.equal(result.chargedCents, 800);
  assert.equal(result.applied?.title, "Diwali");
  assert.deepEqual(result.options.map((o) => o.discount.id), ["diwali"]);
});

test("fixed discount is capped at the list price", () => {
  const cheap = resolvePrice(1000, target, [discount({ type: "FIXED", value: 300 })], "local", now);
  assert.equal(cheap.amountCents, 300);
  assert.equal(cheap.chargedCents, 700);

  const huge = resolvePrice(1000, target, [discount({ type: "FIXED", value: 1500 })], "local", now);
  assert.equal(huge.amountCents, 1000);
  assert.equal(huge.chargedCents, 0);
});

test("100 percent discount makes the item free", () => {
  const result = resolvePrice(1000, target, [discount({ value: 100 })], "local", now);
  assert.equal(result.amountCents, 1000);
  assert.equal(result.chargedCents, 0);
});

test("percent amounts round half up", () => {
  // 10% of 999 = 99.9 paise -> 100
  const result = resolvePrice(999, target, [discount({ value: 10 })], "local", now);
  assert.equal(result.amountCents, 100);
  assert.equal(result.chargedCents, 899);
});

test("product discount beats a smaller brand discount", () => {
  const brand = discount({ id: "brand", title: "Brand sale", scope: "BRAND", brandId: "b1", value: 10 });
  const product = discount({ id: "product", title: "Product sale", scope: "PRODUCT", productId: "p1", value: 20 });

  const result = resolvePrice(1000, target, [brand, product], "local", now);

  assert.equal(result.applied?.id, "product");
  assert.equal(result.amountCents, 200);
  assert.deepEqual(result.options.map((o) => o.discount.title), ["Product sale", "Brand sale"]);
});

test("same amount: more specific scope wins even when its id sorts later", () => {
  const brand = discount({ id: "a-brand", scope: "BRAND", brandId: "b1", value: 20 });
  const product = discount({ id: "z-product", scope: "PRODUCT", productId: "p1", value: 20 });

  const result = resolvePrice(1000, target, [brand, product], "local", now);

  assert.deepEqual(result.options.map((o) => o.discount.id), ["z-product", "a-brand"]);
  assert.equal(result.applied?.id, "z-product");
});

test("same amount and scope: newer createdAt wins, then lower id", () => {
  const older = discount({
    id: "z-old",
    scope: "PRODUCT",
    productId: "p1",
    value: 20,
    createdAt: new Date("2026-09-01T00:00:00Z"),
  });
  const newer = discount({
    id: "a-new",
    scope: "PRODUCT",
    productId: "p1",
    value: 20,
    createdAt: new Date("2026-10-01T00:00:00Z"),
  });

  const result = resolvePrice(1000, target, [older, newer], "local", now);
  assert.deepEqual(result.options.map((o) => o.discount.id), ["a-new", "z-old"]);

  const a = discount({ id: "a", scope: "PRODUCT", productId: "p1", value: 20 });
  const b = discount({ id: "b", scope: "PRODUCT", productId: "p1", value: 20 });
  const tied = resolvePrice(1000, target, [b, a], "local", now);
  assert.deepEqual(tied.options.map((o) => o.discount.id), ["a", "b"]);
});

test("category discounts match the product category or its parent", () => {
  const own = discount({ id: "own", scope: "CATEGORY", categoryId: "c1", value: 10 });
  const parent = discount({ id: "parent-deal", scope: "CATEGORY", categoryId: "parent", value: 20 });
  const unrelated = discount({ id: "unrelated", scope: "CATEGORY", categoryId: "c9", value: 50 });

  const result = resolvePrice(1000, target, [own, parent, unrelated], "local", now);

  assert.deepEqual(result.options.map((o) => o.discount.id), ["parent-deal", "own"]);
  assert.equal(result.applied?.id, "parent-deal");
});

test("brand discount for another brand does not match", () => {
  const other = discount({ scope: "BRAND", brandId: "b2", value: 50 });
  const result = resolvePrice(1000, target, [other], "local", now);

  assert.equal(result.options.length, 0);
  assert.equal(result.applied, null);
  assert.equal(result.chargedCents, 1000);
});

test("siteVersion: 'all' matches both stores, 'local' and 'global' do not cross", () => {
  const globalOnly = discount({ id: "g", value: 50, siteVersion: "global" });
  const everywhere = discount({ id: "e", value: 10, siteVersion: "all" });
  const localOnly = discount({ id: "l", value: 20, siteVersion: "local" });
  const all = [globalOnly, everywhere, localOnly];

  const local = resolvePrice(1000, target, all, "local", now);
  assert.deepEqual(local.options.map((o) => o.discount.id), ["l", "e"]);

  const global = resolvePrice(1000, target, all, "global", now);
  assert.deepEqual(global.options.map((o) => o.discount.id), ["g", "e"]);

  assert.equal(isDiscountLive(localOnly, "global", now), false);
  assert.equal(isDiscountLive(globalOnly, "global", now), true);
  assert.equal(isDiscountLive(everywhere, "local", now), true);
  assert.equal(isDiscountLive(everywhere, "global", now), true);
});

test("window boundaries are inclusive, one millisecond outside is not", () => {
  const startsNow = discount({ startsAt: now });
  const endsNow = discount({ endsAt: now });
  const startsLater = discount({ startsAt: new Date(now.getTime() + 1) });
  const endedEarlier = discount({ endsAt: new Date(now.getTime() - 1) });

  assert.equal(isDiscountLive(startsNow, "local", now), true);
  assert.equal(isDiscountLive(endsNow, "local", now), true);
  assert.equal(isDiscountLive(startsLater, "local", now), false);
  assert.equal(isDiscountLive(endedEarlier, "local", now), false);

  assert.equal(resolvePrice(1000, target, [startsNow], "local", now).options.length, 1);
  assert.equal(resolvePrice(1000, target, [endsNow], "local", now).options.length, 1);
  assert.equal(resolvePrice(1000, target, [startsLater], "local", now).options.length, 0);
  assert.equal(resolvePrice(1000, target, [endedEarlier], "local", now).options.length, 0);
});

test("paused, deleted, expired and scheduled discounts are excluded", () => {
  const paused = discount({ isActive: false, type: "FIXED", value: 900 });
  const deleted = discount({ deletedAt: now, type: "FIXED", value: 900 });
  const expired = discount({ endsAt: new Date(now.getTime() - 1), type: "FIXED", value: 900 });
  const scheduled = discount({ startsAt: new Date(now.getTime() + 1), type: "FIXED", value: 900 });

  const result = resolvePrice(1000, target, [paused, deleted, expired, scheduled], "local", now);

  assert.deepEqual(result.options, []);
  assert.equal(result.applied, null);
  assert.equal(result.amountCents, 0);
  assert.equal(result.chargedCents, 1000);
});

test("no eligible discount leaves the price untouched", () => {
  const result = resolvePrice(1000, target, [], "local", now);
  assert.equal(result.listCents, 1000);
  assert.equal(result.chargedCents, 1000);
  assert.equal(result.applied, null);
  assert.equal(result.amountCents, 0);
  assert.deepEqual(result.options, []);

  // A discount worth less than one paise is dropped.
  const zero = resolvePrice(1000, target, [discount({ type: "FIXED", value: 0 })], "local", now);
  assert.deepEqual(zero.options, []);

  // Negative list prices clamp to zero.
  const negative = resolvePrice(-50, target, [], "local", now);
  assert.equal(negative.listCents, 0);
  assert.equal(negative.chargedCents, 0);
});

test("discountStatus maps deleted, paused, scheduled, expired and active", () => {
  assert.equal(discountStatus(discount({ deletedAt: now }), now), "deleted");
  assert.equal(discountStatus(discount({ deletedAt: now, isActive: false }), now), "deleted");
  assert.equal(discountStatus(discount({ isActive: false }), now), "paused");
  assert.equal(
    discountStatus(discount({ startsAt: new Date(now.getTime() + 1) }), now),
    "scheduled",
  );
  assert.equal(
    discountStatus(discount({ endsAt: new Date(now.getTime() - 1) }), now),
    "expired",
  );
  assert.equal(discountStatus(discount({ startsAt: now, endsAt: now }), now), "active");
});

test("discountTargetFor dedupes primary, parent, subcategory and subcategory parent ids", () => {
  const result = discountTargetFor({
    productId: "p1",
    brandId: "b1",
    categoryId: "c1",
    categoryParentId: "parent",
    subcategories: [
      { category: { id: "s1", parentId: "c1" } },
      { category: { id: "c1", parentId: "parent" } },
      { category: { id: "s2", parentId: "parent" } },
      { category: { id: "s3", parentId: null } },
    ],
  });

  assert.equal(result.productId, "p1");
  assert.equal(result.brandId, "b1");
  assert.deepEqual(result.categoryIds, ["c1", "parent", "s1", "s2", "s3"]);
});

test("discountTargetFor dedupes when the primary category is its own parent", () => {
  const result = discountTargetFor({
    productId: "p1",
    brandId: "b1",
    categoryId: "c1",
    categoryParentId: "c1",
    subcategories: [{ category: { id: "c1", parentId: "c1" } }],
  });

  assert.deepEqual(result.categoryIds, ["c1"]);
  assert.equal(
    new Set(result.categoryIds).size,
    result.categoryIds.length,
    "no duplicate category ids",
  );
});
