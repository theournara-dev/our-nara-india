import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BRAND_BANNER_HEIGHT_DEFAULT,
  BRAND_BANNER_HEIGHT_MAX,
  BRAND_BANNER_HEIGHT_MIN,
  BRAND_BANNER_VIEWPORT_WIDTH,
  brandBannerHeight,
} from "../src/lib/brand-banner";

test("a brand banner is 300px tall until an admin says otherwise", () => {
  assert.equal(BRAND_BANNER_HEIGHT_DEFAULT, 300);
  assert.equal(brandBannerHeight(undefined), 300);
  assert.equal(brandBannerHeight(null), 300);
  assert.equal(brandBannerHeight(300), 300);
});

test("a stored height survives a round trip", () => {
  assert.equal(brandBannerHeight(420), 420);
  assert.equal(brandBannerHeight(420.4), 420);
});

test("a height never collapses or runs away", () => {
  assert.equal(brandBannerHeight(0), BRAND_BANNER_HEIGHT_MIN);
  assert.equal(brandBannerHeight(-400), BRAND_BANNER_HEIGHT_MIN);
  assert.equal(brandBannerHeight(100000), BRAND_BANNER_HEIGHT_MAX);
});

test("junk in a stored row falls back to the default, never NaN", () => {
  assert.equal(brandBannerHeight(Number.NaN), BRAND_BANNER_HEIGHT_DEFAULT);
  assert.equal(
    brandBannerHeight(Number.POSITIVE_INFINITY),
    BRAND_BANNER_HEIGHT_DEFAULT,
  );
  assert.equal(brandBannerHeight("300"), BRAND_BANNER_HEIGHT_DEFAULT);
});

test("the preview quotes a desktop screen width", () => {
  assert.equal(BRAND_BANNER_VIEWPORT_WIDTH, 1440);
});
