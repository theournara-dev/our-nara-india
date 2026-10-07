import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cartSubtotalCents,
  checkCouponEligibility,
  couponEligibleLines,
  evaluateCoupon,
  isCouponInWindow,
  normalizeCouponCode,
  type CouponCartLine,
  type CouponRecord,
  type CouponEligibilityContext,
} from "../src/lib/coupons";

function coupon(over: Partial<CouponRecord> = {}): CouponRecord {
  return {
    id: "c1",
    code: "SAVE10",
    type: "PERCENT",
    value: 10,
    minOrderCents: null,
    maxUses: null,
    perUserLimit: null,
    startsAt: null,
    expiresAt: null,
    isActive: true,
    title: null,
    description: null,
    scope: "ALL",
    brandId: null,
    categoryId: null,
    productIds: [],
    siteVersion: "all",
    firstPurchaseOnly: false,
    preOrderAllowed: false,
    ...over,
  };
}

function line(over: Partial<CouponCartLine> = {}): CouponCartLine {
  return {
    productId: "p1",
    priceCents: 10_000, // ₹100
    qty: 1,
    brandId: "b1",
    categoryId: "cat1",
    isPreOrder: false,
    ...over,
  };
}

function ctx(over: Partial<CouponEligibilityContext> = {}): CouponEligibilityContext {
  return {
    version: "local",
    subtotalCents: cartSubtotalCents([line()]),
    firstTimeBuyer: true,
    redemptionCount: 0,
    userRedemptionCount: 0,
    ...over,
  };
}

// ── Value ──────────────────────────────────────────────────────────────────

test("a percentage coupon discounts the whole cart", () => {
  assert.deepEqual(evaluateCoupon(coupon({ value: 10 }), [line({ qty: 3 })]), {
    discountCents: 3_000,
    freeShipping: false,
  });
});

test("a fixed coupon never discounts more than its base", () => {
  assert.deepEqual(
    evaluateCoupon(coupon({ type: "FIXED", value: 50_000 }), [line()]),
    { discountCents: 10_000, freeShipping: false },
  );
});

test("a shipping coupon waives the fee and takes nothing off the goods", () => {
  assert.deepEqual(evaluateCoupon(coupon({ type: "SHIPPING" }), [line()]), {
    discountCents: 0,
    freeShipping: true,
  });
});

test("a scoped coupon only discounts the lines it covers", () => {
  const brandCoupon = coupon({
    type: "FIXED",
    value: 5_000,
    scope: "BRAND",
    brandId: "b2",
  });
  const lines = [line({ brandId: "b1" }), line({ productId: "p2", brandId: "b2" })];
  assert.deepEqual(evaluateCoupon(brandCoupon, lines), {
    discountCents: 5_000,
    freeShipping: false,
  });
});

test("scope matching narrows to brand, category and product ids", () => {
  const lines = [
    line({ productId: "p1", brandId: "b1", categoryId: "cat1" }),
    line({ productId: "p2", brandId: "b2", categoryId: "cat2" }),
  ];
  assert.equal(
    couponEligibleLines(coupon({ scope: "BRAND", brandId: "b2" }), lines).length,
    1,
  );
  assert.equal(
    couponEligibleLines(coupon({ scope: "CATEGORY", categoryId: "cat1" }), lines)
      .length,
    1,
  );
  assert.equal(
    couponEligibleLines(coupon({ scope: "PRODUCT", productIds: ["p2"] }), lines)
      .length,
    1,
  );
  assert.equal(couponEligibleLines(coupon({ scope: "ALL" }), lines).length, 2);
});

// ── Conditions ─────────────────────────────────────────────────────────────

test("an inactive coupon is refused", () => {
  const result = checkCouponEligibility(coupon({ isActive: false }), [line()], ctx());
  assert.equal(result.ok, false);
});

test("a coupon for the other store is refused", () => {
  const global = coupon({ siteVersion: "global" });
  assert.equal(checkCouponEligibility(global, [line()], ctx()).ok, false);
  assert.equal(
    checkCouponEligibility(global, [line()], ctx({ version: "global" })).ok,
    true,
  );
});

test("a coupon valid on both stores is accepted either way", () => {
  const both = coupon({ siteVersion: "all" });
  assert.equal(checkCouponEligibility(both, [line()], ctx()).ok, true);
  assert.equal(
    checkCouponEligibility(both, [line()], ctx({ version: "global" })).ok,
    true,
  );
});

test("the start date opens the coupon and the end date closes it", () => {
  const window = coupon({
    startsAt: "2026-10-01T00:00:00.000Z",
    expiresAt: "2026-10-31T23:59:59.999Z",
  });
  assert.equal(isCouponInWindow(window, new Date("2026-09-30T12:00:00Z")), false);
  assert.equal(isCouponInWindow(window, new Date("2026-10-15T12:00:00Z")), true);
  assert.equal(isCouponInWindow(window, new Date("2026-11-01T00:00:00Z")), false);

  const before = ctx({ now: new Date("2026-09-30T12:00:00Z") });
  assert.equal(checkCouponEligibility(window, [line()], before).ok, false);
  const inside = ctx({ now: new Date("2026-10-15T12:00:00Z") });
  assert.equal(checkCouponEligibility(window, [line()], inside).ok, true);
  const after = ctx({ now: new Date("2026-11-01T00:00:00Z") });
  assert.equal(checkCouponEligibility(window, [line()], after).ok, false);
});

test("a usage cap refuses the coupon once it is spent", () => {
  const capped = coupon({ maxUses: 5 });
  assert.equal(
    checkCouponEligibility(capped, [line()], ctx({ redemptionCount: 4 })).ok,
    true,
  );
  const spent = checkCouponEligibility(
    capped,
    [line()],
    ctx({ redemptionCount: 5 }),
  );
  assert.equal(spent.ok, false);
});

test("a per-customer limit refuses the coupon for that shopper only", () => {
  const limited = coupon({ perUserLimit: 1 });
  const mine = checkCouponEligibility(
    limited,
    [line()],
    ctx({ userRedemptionCount: 1, redemptionCount: 9 }),
  );
  assert.equal(mine.ok, false);
  assert.equal(
    checkCouponEligibility(limited, [line()], ctx({ redemptionCount: 1 })).ok,
    true,
  );
});

test("a first-purchase coupon is refused for a returning shopper", () => {
  const first = coupon({ firstPurchaseOnly: true });
  assert.equal(
    checkCouponEligibility(first, [line()], ctx({ firstTimeBuyer: true })).ok,
    true,
  );
  assert.equal(
    checkCouponEligibility(first, [line()], ctx({ firstTimeBuyer: false })).ok,
    false,
  );
});

test("the minimum order is measured on the cart subtotal", () => {
  const withMinimum = coupon({ minOrderCents: 20_000 });
  const small = checkCouponEligibility(withMinimum, [line()], ctx());
  assert.equal(small.ok, false);
  const big = checkCouponEligibility(
    withMinimum,
    [line({ qty: 2 })],
    ctx({ subtotalCents: 20_000 }),
  );
  assert.equal(big.ok, true);
});

test("a scoped coupon is refused when the cart holds nothing it covers", () => {
  const brandCoupon = coupon({ scope: "BRAND", brandId: "b9" });
  assert.equal(
    checkCouponEligibility(brandCoupon, [line({ brandId: "b1" })], ctx()).ok,
    false,
  );
});

// ── Pre-orders ─────────────────────────────────────────────────────────────

test("a coupon excludes pre-order items by default", () => {
  const result = checkCouponEligibility(
    coupon(),
    [line({ isPreOrder: true })],
    ctx(),
  );
  assert.equal(result.ok, false);
});

test("a coupon can be opened up to pre-order items", () => {
  const result = checkCouponEligibility(
    coupon({ preOrderAllowed: true }),
    [line({ isPreOrder: true })],
    ctx(),
  );
  assert.equal(result.ok, true);
});

test("pre-orders are only a problem when the cart holds one", () => {
  assert.equal(
    checkCouponEligibility(coupon(), [line({ isPreOrder: false })], ctx()).ok,
    true,
  );
  // One pre-order line anywhere in the cart is enough to refuse the coupon.
  const mixed = checkCouponEligibility(
    coupon(),
    [line({ productId: "p1" }), line({ productId: "p2", isPreOrder: true })],
    ctx({ subtotalCents: 20_000 }),
  );
  assert.equal(mixed.ok, false);
});

// ── Codes ──────────────────────────────────────────────────────────────────

test("a typed code is matched case-insensitively and without spaces", () => {
  assert.equal(normalizeCouponCode("  save10 "), "SAVE10");
  assert.equal(normalizeCouponCode("welcome 10"), "WELCOME10");
});
