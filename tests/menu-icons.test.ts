import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultMenuIcon,
  MENU_ICONS,
  MENU_ICON_LABELS,
  MENU_STATIC_ROWS,
  menuIconKey,
} from "../src/lib/menu-icons";
import { normalizeMenuIcons } from "../src/lib/site-content";

test("every menu row keeps its designed default", () => {
  assert.equal(defaultMenuIcon("home"), "home");
  assert.equal(defaultMenuIcon("category-skin-care"), "sparkles");
  assert.equal(defaultMenuIcon("category-makeup"), "brush");
  assert.equal(defaultMenuIcon("category-hair-care"), "scissors");
  assert.equal(defaultMenuIcon("category-pre-order"), "clock");
  assert.equal(defaultMenuIcon("brand"), "tags");
  assert.equal(defaultMenuIcon("review"), "star");
  assert.equal(defaultMenuIcon("coupons"), "ticket");
});

test("a category nobody mapped still gets an icon", () => {
  assert.equal(defaultMenuIcon("category-brand-new"), "grid");
  assert.equal(defaultMenuIcon("some-future-row"), "grid");
});

test("every default is a real icon with a label", () => {
  for (const row of MENU_STATIC_ROWS) {
    assert.ok(MENU_ICONS[row.defaultIcon], `${row.id} default is unknown`);
    assert.ok(MENU_ICON_LABELS[row.defaultIcon]?.length > 0);
  }
  for (const key of Object.keys(MENU_ICONS)) {
    assert.ok(MENU_ICON_LABELS[key as keyof typeof MENU_ICONS]?.length > 0);
  }
});

test("the admin's choice wins over the default", () => {
  assert.equal(menuIconKey("brand", { brand: "crown" }), "crown");
  assert.equal(menuIconKey("home", { home: "sparkles" }), "sparkles");
  assert.equal(
    menuIconKey("category-skin-care", { "category-skin-care": "droplets" }),
    "droplets",
  );
});

test("an unknown or missing choice falls back, never draws nothing", () => {
  assert.equal(menuIconKey("brand", { brand: "not-an-icon" }), "tags");
  assert.equal(menuIconKey("brand", { brand: 42 }), "tags");
  assert.equal(menuIconKey("brand", null), "tags");
  assert.equal(menuIconKey("brand", {}), "tags");
});

test("the stored map keeps usable pairs and drops the rest", () => {
  assert.deepEqual(normalizeMenuIcons(null), {});
  assert.deepEqual(normalizeMenuIcons("nope"), {});
  assert.deepEqual(
    normalizeMenuIcons({
      brand: "crown",
      home: "",
      "category-x": 7,
      review: "star",
    }),
    { brand: "crown", review: "star" },
  );
});
