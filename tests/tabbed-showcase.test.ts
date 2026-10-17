import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sectionConfigSchemas,
  showcaseTabSchema,
} from "../src/lib/page-builder/types";

const showcase = sectionConfigSchemas["tabbed-showcase"];

test("a filter no longer carries its own grid", () => {
  const tab = showcaseTabSchema.parse({ id: "t1", productSlugs: [] });
  // The old defaults (4 × 1) silently overrode the section's shape; a tab must
  // stay silent about columns and rows so the section's fixed grid wins.
  assert.equal(tab.columns, undefined);
  assert.equal(tab.rows, undefined);
});

test("an old tab's stored columns and rows are still readable", () => {
  const tab = showcaseTabSchema.parse({ id: "t1", columns: 4, rows: 2 });
  assert.equal(tab.columns, 4);
  assert.equal(tab.rows, 2);
});

test("the showcase's grid defaults to 4 × 2", () => {
  const config = showcase.parse({});
  assert.equal(config.columns, 4);
  assert.equal(config.rows, 2);
});

test("changing the columns really changes them", () => {
  const config = showcase.parse({ columns: 5, rows: 3 });
  assert.equal(config.columns, 5);
  assert.equal(config.rows, 3);
});

test("the grid stays inside the sizes the page can draw", () => {
  assert.throws(() => showcase.parse({ columns: 1 }));
  assert.throws(() => showcase.parse({ columns: 7 }));
  assert.throws(() => showcase.parse({ rows: 0 }));
  assert.throws(() => showcase.parse({ rows: 6 }));
});
