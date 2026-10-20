import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_DISCOUNT_BADGE_STYLE,
  discountBadgeVars,
  normalizeDiscountBadgeStyle,
} from "../src/lib/discount-badge-style";

test("the default badge is the original hardcoded look", () => {
  assert.deepEqual(DEFAULT_DISCOUNT_BADGE_STYLE, {
    background: "#6f2dbd",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 600,
    radius: 4,
    paddingX: 6,
    paddingY: 2,
  });
});

test("nothing stored keeps every default", () => {
  assert.deepEqual(
    normalizeDiscountBadgeStyle(null),
    DEFAULT_DISCOUNT_BADGE_STYLE,
  );
  assert.deepEqual(
    normalizeDiscountBadgeStyle("nope"),
    DEFAULT_DISCOUNT_BADGE_STYLE,
  );
});

test("a saved style round-trips", () => {
  const saved = {
    background: "#FF0066",
    color: "#111111",
    fontSize: 14,
    fontWeight: 700,
    radius: 0,
    paddingX: 8,
    paddingY: 3,
  };
  assert.deepEqual(normalizeDiscountBadgeStyle(saved), {
    ...saved,
    // Lowercase keeps the admin's colour input in sync with the stored value.
    background: "#ff0066",
  });
});

test("bad values fall back or clamp, field by field", () => {
  assert.deepEqual(
    normalizeDiscountBadgeStyle({
      background: "red",
      color: "#12345",
      fontSize: 99,
      fontWeight: 333,
      radius: -4,
      paddingX: "wide",
      paddingY: 2.4,
    }),
    {
      background: DEFAULT_DISCOUNT_BADGE_STYLE.background,
      color: DEFAULT_DISCOUNT_BADGE_STYLE.color,
      fontSize: 24,
      fontWeight: 400,
      radius: 0,
      paddingX: DEFAULT_DISCOUNT_BADGE_STYLE.paddingX,
      paddingY: 2,
    },
  );
});

test("the preview and the storefront read the same variables", () => {
  assert.deepEqual(discountBadgeVars(DEFAULT_DISCOUNT_BADGE_STYLE), {
    "--discount-badge-bg": "#6f2dbd",
    "--discount-badge-color": "#ffffff",
    "--discount-badge-font-size": "11px",
    "--discount-badge-font-weight": "600",
    "--discount-badge-radius": "4px",
    "--discount-badge-pad-x": "6px",
    "--discount-badge-pad-y": "2px",
  });
});
