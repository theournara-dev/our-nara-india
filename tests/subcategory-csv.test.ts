import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseSubcategoryCsv,
  subcategoriesByProduct,
} from "../src/lib/subcategory-csv";

test("parses rows, skips a header, tolerates quotes and comments", () => {
  const parsed = parseSubcategoryCsv(
    [
      "product slug, category, subcategory",
      "cica-panthenol-soothing-cream, skin-care, facial-care",
      '"daiso-roll-type-cleansing-towel-20-sheets", "skin-care", "cleansing"',
      "# a note between blocks",
      "",
      "daiso-roll-type-cleansing-towel-20-sheets, skin-care, masks-patches",
    ].join("\n"),
  );
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.rows.length, 3);
  assert.deepEqual(parsed.rows[0], {
    line: 2,
    productSlug: "cica-panthenol-soothing-cream",
    categorySlug: "skin-care",
    subcategorySlug: "facial-care",
  });
  assert.equal(parsed.rows[1].productSlug, "daiso-roll-type-cleansing-towel-20-sheets");
});

test("reports lines it cannot read", () => {
  const parsed = parseSubcategoryCsv(
    [
      "only-one-column",
      "slug, skin-care,",
      "Bad Slug, skin-care, facial-care",
      "ok-slug, skin-care, Not A Slug",
    ].join("\n"),
  );
  assert.equal(parsed.rows.length, 0);
  assert.equal(parsed.errors.length, 4);
  assert.match(parsed.errors[0], /Line 1/);
  assert.match(parsed.errors[3], /subcategory slug/);
});

test("groups several subcategories into one product entry", () => {
  const { rows } = parseSubcategoryCsv(
    [
      "tissue, skin-care, cleansing",
      "tissue, skin-care, masks-patches",
      "tissue, skin-care, cleansing",
      "other, makeup, lip-makeup",
    ].join("\n"),
  );
  const grouped = subcategoriesByProduct(rows);
  assert.deepEqual(grouped.get("tissue"), {
    categorySlug: "skin-care",
    subcategorySlugs: ["cleansing", "masks-patches"],
  });
  assert.deepEqual(grouped.get("other")?.subcategorySlugs, ["lip-makeup"]);
});
