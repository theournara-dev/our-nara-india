import { test } from "node:test";
import assert from "node:assert/strict";
import { pruneStaleCurrency, type CartItem } from "../src/lib/cart";

function item(over: Partial<CartItem> = {}): CartItem {
  return {
    productId: "p1",
    slug: "p1",
    name: "Product 1",
    image: "",
    priceCents: 100,
    currency: "INR",
    qty: 1,
    ...over,
  };
}

test("pruneStaleCurrency drops lines saved in another currency", () => {
  const current = item();
  // A cart line saved while the global store displayed USD.
  const stale = item({ productId: "p2", currency: "USD", priceCents: 842 });
  assert.deepEqual(pruneStaleCurrency([current, stale], "INR"), [current]);
});

test("pruneStaleCurrency keeps every line in the current currency", () => {
  const a = item({ productId: "p1" });
  const b = item({ productId: "p2", qty: 3 });
  assert.deepEqual(pruneStaleCurrency([a, b], "INR"), [a, b]);
});

test("pruneStaleCurrency returns nothing when all lines are stale", () => {
  assert.deepEqual(
    pruneStaleCurrency([item({ currency: "USD" })], "INR"),
    [],
  );
});
