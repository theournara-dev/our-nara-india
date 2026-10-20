import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CartChangedError,
  applyQuote,
  type CartQuote,
  type CartQuoteLine,
} from "../src/lib/cart-quote";
import type { CartItem } from "../src/lib/cart";

function item(over: Partial<CartItem> = {}): CartItem {
  return {
    productId: "p1",
    slug: "p1-slug",
    name: "Product one",
    image: "/p1.jpg",
    priceCents: 1000,
    globalPriceCents: 1200,
    currency: "INR",
    qty: 2,
    ...over,
  };
}

function line(over: Partial<CartQuoteLine> = {}): CartQuoteLine {
  return {
    productId: "p1",
    variantId: null,
    listPriceCents: 1000,
    chargedPriceCents: 800,
    globalListPriceCents: 1200,
    globalChargedPriceCents: 960,
    discountTitle: "Diwali",
    ...over,
  };
}

function quote(lines: CartQuoteLine[]): CartQuote {
  return {
    lines,
    subtotalCents: 1600,
    coupon: {
      code: null,
      valid: false,
      discountCents: 0,
      freeShipping: false,
      title: null,
    },
    shippingCents: 0,
    totalCents: 1600,
  };
}

test("quote line updates both store prices and leaves the rest of the line", () => {
  const cart = [item({ option: "v1", optionLabel: "Shade: 01 Rose" })];
  const [out] = applyQuote(cart, quote([line({ variantId: "v1" })]));

  assert.equal(out.priceCents, 800);
  assert.equal(out.globalPriceCents, 960);
  assert.equal(out.qty, 2);
  assert.equal(out.option, "v1");
  assert.equal(out.optionLabel, "Shade: 01 Rose");
  assert.equal(out.productId, "p1");
});

test("an item without an option matches a null variant line", () => {
  const cart = [item({ option: undefined })];
  const [out] = applyQuote(cart, quote([line({ variantId: null })]));

  assert.equal(out.priceCents, 800);
  assert.equal(out.globalPriceCents, 960);
});

test("unmatched cart items come back unchanged", () => {
  const untouched = item({ productId: "p2", slug: "p2-slug" });
  const [out] = applyQuote([untouched], quote([line({ variantId: "v1" })]));

  assert.deepEqual(out, untouched);
});

test("applyQuote does not mutate the input array or its items", () => {
  const original = item({ option: "v1" });
  const cart = [original];
  const result = applyQuote(cart, quote([line({ variantId: "v1" })]));

  assert.notEqual(result, cart);
  assert.deepEqual(cart[0], {
    productId: "p1",
    slug: "p1-slug",
    name: "Product one",
    image: "/p1.jpg",
    priceCents: 1000,
    globalPriceCents: 1200,
    currency: "INR",
    qty: 2,
    option: "v1",
  });
  assert.equal(original.priceCents, 1000);
  assert.equal(original.globalPriceCents, 1200);
  assert.equal(result[0].priceCents, 800);
});

test("a quote line for another variant does not touch the item", () => {
  const original = item({ option: "v1" });
  const [out] = applyQuote([original], quote([line({ variantId: "v2" })]));

  assert.deepEqual(out, original);
});

test("CartChangedError carries the quote object", () => {
  const q = quote([]);
  const err = new CartChangedError(q);

  assert.ok(err instanceof Error);
  assert.equal(err.quote, q);
});
