import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buyNowForVersion,
  preOrderForVersion,
  saleStateForVersion,
  visibleForVersion,
  type ProductStoreFlags,
} from "../src/lib/product-flags";

/** The two shapes the catalogue actually holds, plus a "coming soon" one. */
const localPreOrder: ProductStoreFlags = {
  isActive: true,
  isPreOrder: true,
  buyNowEnabled: false,
  globalIsActive: true,
  globalIsPreOrder: false,
  globalBuyNowEnabled: true,
};

const localBuyNow: ProductStoreFlags = {
  isActive: true,
  isPreOrder: false,
  buyNowEnabled: true,
  globalIsActive: true,
  globalIsPreOrder: false,
  globalBuyNowEnabled: true,
};

const comingSoon: ProductStoreFlags = {
  isActive: true,
  isPreOrder: false,
  buyNowEnabled: false,
  globalIsActive: true,
  globalIsPreOrder: false,
  globalBuyNowEnabled: false,
};

test("visibleForVersion reads each store's own show flag", () => {
  const hiddenOnGlobal: ProductStoreFlags = { isActive: true, globalIsActive: false };
  assert.equal(visibleForVersion(hiddenOnGlobal, "local"), true);
  assert.equal(visibleForVersion(hiddenOnGlobal, "global"), false);

  const hiddenLocally: ProductStoreFlags = { isActive: false, globalIsActive: true };
  assert.equal(visibleForVersion(hiddenLocally, "local"), false);
  assert.equal(visibleForVersion(hiddenLocally, "global"), true);

  // Rows without the global twin (static catalogue) mirror the local flag.
  assert.equal(visibleForVersion({ isActive: false }, "global"), false);
  assert.equal(visibleForVersion({}, "global"), true);
});

test("pre-order and buy-now are answered per store", () => {
  assert.equal(preOrderForVersion(localPreOrder, "local"), true);
  assert.equal(preOrderForVersion(localPreOrder, "global"), false);
  assert.equal(buyNowForVersion(localPreOrder, "local"), false);
  assert.equal(buyNowForVersion(localPreOrder, "global"), true);

  assert.equal(preOrderForVersion(localBuyNow, "local"), false);
  assert.equal(buyNowForVersion(localBuyNow, "local"), true);
});

test("saleStateForVersion picks the store's state", () => {
  assert.equal(saleStateForVersion(localPreOrder, "local"), "preorder");
  assert.equal(saleStateForVersion(localPreOrder, "global"), "buynow");
  assert.equal(saleStateForVersion(localBuyNow, "local"), "buynow");
  assert.equal(saleStateForVersion(comingSoon, "local"), "unavailable");
  assert.equal(saleStateForVersion(comingSoon, "global"), "unavailable");
});

test("buy-now wins when a store has both flags", () => {
  const both: ProductStoreFlags = {
    isPreOrder: true,
    buyNowEnabled: true,
    globalIsPreOrder: true,
    globalBuyNowEnabled: true,
  };
  assert.equal(saleStateForVersion(both, "local"), "buynow");
  assert.equal(saleStateForVersion(both, "global"), "buynow");
});

test("a brand rollout enables buy-now on both stores", () => {
  assert.equal(saleStateForVersion(localPreOrder, "local", true), "buynow");
  assert.equal(saleStateForVersion(localPreOrder, "global", true), "buynow");
  assert.equal(buyNowForVersion({}, "local", true), true);
});

test("missing global twins fall back to the local flags", () => {
  const legacy: ProductStoreFlags = { isPreOrder: true, buyNowEnabled: false };
  assert.equal(preOrderForVersion(legacy, "global"), true);
  assert.equal(buyNowForVersion(legacy, "global"), false);
  assert.equal(saleStateForVersion(legacy, "global"), "preorder");
});
