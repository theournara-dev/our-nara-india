import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BANNER_PLACEMENTS,
  BRAND_PLACEMENTS,
  CATEGORY_PLACEMENTS,
  PLACEMENT_LABELS,
} from "../src/app/admin/banners/lib";

/**
 * The banner placements are shared by the admin form, the server actions and
 * the storefront loaders, so a placement without a label (or scoped twice)
 * would silently break one of them.
 */

test("every banner placement has a label", () => {
  for (const placement of BANNER_PLACEMENTS) {
    assert.ok(
      PLACEMENT_LABELS[placement]?.length > 0,
      `placement "${placement}" has no label`,
    );
  }
});

test("a placement is scoped to a category or a brand, never both", () => {
  const overlap = CATEGORY_PLACEMENTS.filter((p) =>
    (BRAND_PLACEMENTS as string[]).includes(p),
  );
  assert.deepEqual(overlap, []);
  for (const placement of [...CATEGORY_PLACEMENTS, ...BRAND_PLACEMENTS]) {
    assert.ok(
      (BANNER_PLACEMENTS as readonly string[]).includes(placement),
      `scoped placement "${placement}" is not a known placement`,
    );
  }
});

test("the brand section placement is the home row above a brand", () => {
  assert.deepEqual(BRAND_PLACEMENTS, ["brand-section"]);
});
