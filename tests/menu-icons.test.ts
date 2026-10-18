import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultMenuIcon,
  isMenuIconImage,
  MENU_ICONS,
  MENU_ICON_LABELS,
  MENU_STATIC_ROWS,
  menuIconKey,
  menuIconSetting,
} from "../src/lib/menu-icons";
import { normalizeMenuIcons } from "../src/lib/site-content";

test("every menu row keeps its designed default icon", () => {
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

test("an untouched row resolves to its default icon and no image", () => {
  assert.deepEqual(menuIconSetting("brand"), { icon: "tags", image: null });
  assert.deepEqual(menuIconSetting("brand", {}), {
    icon: "tags",
    image: null,
  });
});

test("the admin's icon choice wins over the default", () => {
  assert.deepEqual(menuIconSetting("brand", { brand: { icon: "crown" } }), {
    icon: "crown",
    image: null,
  });
  assert.equal(menuIconKey("home", { home: { icon: "sparkles" } }), "sparkles");
});

test("an uploaded image is kept alongside the icon and wins in use", () => {
  const setting = menuIconSetting("brand", {
    brand: { icon: "crown", image: "/upload/menu/brand.png" },
  });
  assert.equal(setting.icon, "crown");
  assert.equal(setting.image, "/upload/menu/brand.png");
});

test("the first round's flat values still resolve", () => {
  assert.deepEqual(menuIconSetting("brand", { brand: "crown" }), {
    icon: "crown",
    image: null,
  });
  assert.deepEqual(
    menuIconSetting("brand", { brand: "https://blob.example/x.png" }),
    { icon: "tags", image: "https://blob.example/x.png" },
  );
});

test("unknown values fall back, but never leave a row blank", () => {
  assert.deepEqual(menuIconSetting("brand", { brand: { icon: "nope" } }), {
    icon: "tags",
    image: null,
  });
  assert.deepEqual(menuIconSetting("brand", { brand: { image: "" } }), {
    icon: "tags",
    image: null,
  });
  assert.deepEqual(menuIconSetting("brand", { brand: 42 }), {
    icon: "tags",
    image: null,
  });
});

test("only URLs and site paths count as images", () => {
  assert.equal(isMenuIconImage("https://x.example/a.png"), true);
  assert.equal(isMenuIconImage("/upload/a.png"), true);
  assert.equal(isMenuIconImage("crown"), false);
  assert.equal(isMenuIconImage(""), false);
  assert.equal(isMenuIconImage(null), false);
});

test("the stored map keeps both shapes and drops the rest", () => {
  assert.deepEqual(normalizeMenuIcons(null), {});
  assert.deepEqual(normalizeMenuIcons("nope"), {});
  assert.deepEqual(
    normalizeMenuIcons({
      brand: { icon: "crown", image: "/upload/brand.png" },
      home: { icon: "sparkles" },
      review: "star",
      "category-x": 7,
      empty: {},
    }),
    {
      brand: { icon: "crown", image: "/upload/brand.png" },
      home: { icon: "sparkles" },
      review: "star",
    },
  );
});
