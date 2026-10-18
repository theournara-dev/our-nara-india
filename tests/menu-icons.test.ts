import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultMenuIcon,
  filterMenuIcons,
  isMenuIconImage,
  MENU_ICON_GROUPS,
  MENU_ICONS,
  MENU_ICON_LABELS,
  MENU_STATIC_ROWS,
  menuIconKey,
  menuIconSetting,
} from "../src/lib/menu-icons";
import { normalizeMenuIcons } from "../src/lib/site-content";

test("every menu row keeps its designed default icon", () => {
  assert.equal(defaultMenuIcon("home"), "lucide:home");
  assert.equal(defaultMenuIcon("category-skin-care"), "lucide:sparkles");
  assert.equal(defaultMenuIcon("category-makeup"), "lucide:brush");
  assert.equal(defaultMenuIcon("category-hair-care"), "lucide:scissors");
  assert.equal(defaultMenuIcon("category-pre-order"), "lucide:clock");
  assert.equal(defaultMenuIcon("brand"), "lucide:tags");
  assert.equal(defaultMenuIcon("review"), "lucide:star");
  assert.equal(defaultMenuIcon("coupons"), "lucide:ticket");
});

test("a category nobody mapped still gets an icon", () => {
  assert.equal(defaultMenuIcon("category-brand-new"), "lucide:grid");
  assert.equal(defaultMenuIcon("some-future-row"), "lucide:grid");
});

test("the picker lists icons from ten libraries", () => {
  assert.equal(MENU_ICON_GROUPS.length, 10);
  assert.equal(MENU_ICON_GROUPS[0].id, "lucide");
  assert.equal(MENU_ICON_GROUPS[1].id, "material");
  for (const group of MENU_ICON_GROUPS) {
    assert.ok(group.icons.length >= 20, `${group.id} is too small`);
    assert.ok(group.label.length > 0);
    assert.ok(group.shortLabel.length > 0);
    for (const icon of group.icons) {
      assert.ok(
        icon.key.startsWith(`${group.id}:`),
        `${icon.key} is not in ${group.id}`,
      );
      assert.ok(icon.label.length > 0);
      assert.ok(icon.Icon);
    }
  }
});

test("search matches labels, keys and library names, across libraries", () => {
  const all = filterMenuIcons(MENU_ICON_GROUPS, "");
  assert.equal(all.length, MENU_ICON_GROUPS.length);

  const home = filterMenuIcons(MENU_ICON_GROUPS, "home");
  assert.ok(home.length >= 8);
  assert.ok(home.every((entry) => entry.icons.length > 0));
  assert.ok(
    home.some((entry) => entry.group.id === "lucide") &&
      home.some((entry) => entry.group.id === "pi"),
  );

  const tabler = filterMenuIcons(MENU_ICON_GROUPS, "tabler");
  assert.deepEqual(
    tabler.map((entry) => entry.group.id),
    ["tb"],
  );

  const none = filterMenuIcons(MENU_ICON_GROUPS, "no-such-icon");
  assert.deepEqual(none, []);
});

test("every key is unique and has a lookup and a label", () => {
  const keys = MENU_ICON_GROUPS.flatMap((group) =>
    group.icons.map((icon) => icon.key),
  );
  assert.equal(new Set(keys).size, keys.length);
  for (const key of keys) {
    assert.ok(MENU_ICONS[key], `${key} has no component`);
    assert.ok(MENU_ICON_LABELS[key]?.length > 0, `${key} has no label`);
  }
});

test("every default is a real, labelled icon", () => {
  for (const row of MENU_STATIC_ROWS) {
    assert.ok(MENU_ICONS[row.defaultIcon], `${row.id} default is unknown`);
    assert.ok(MENU_ICON_LABELS[row.defaultIcon]?.length > 0);
  }
  assert.ok(MENU_ICONS[defaultMenuIcon("home")]);
  assert.ok(MENU_ICONS[defaultMenuIcon("category-skin-care")]);
});

test("an untouched row resolves to its default icon and no image", () => {
  assert.deepEqual(menuIconSetting("brand"), {
    icon: "lucide:tags",
    image: null,
  });
});

test("the admin's choice wins, from either library", () => {
  assert.deepEqual(
    menuIconSetting("brand", { brand: { icon: "lucide:crown" } }),
    { icon: "lucide:crown", image: null },
  );
  assert.equal(
    menuIconKey("brand", { brand: { icon: "material:store" } }),
    "material:store",
  );
});

test("the first round's bare Lucide keys still resolve", () => {
  assert.deepEqual(menuIconSetting("brand", { brand: "crown" }), {
    icon: "lucide:crown",
    image: null,
  });
  assert.deepEqual(menuIconSetting("brand", { brand: { icon: "flame" } }), {
    icon: "lucide:flame",
    image: null,
  });
});

test("an uploaded image is kept alongside the icon and wins in use", () => {
  const setting = menuIconSetting("brand", {
    brand: { icon: "material:store", image: "/upload/menu/brand.png" },
  });
  assert.equal(setting.icon, "material:store");
  assert.equal(setting.image, "/upload/menu/brand.png");
});

test("unknown values fall back, but never leave a row blank", () => {
  assert.deepEqual(menuIconSetting("brand", { brand: { icon: "nope" } }), {
    icon: "lucide:tags",
    image: null,
  });
  assert.deepEqual(menuIconSetting("brand", { brand: { image: "" } }), {
    icon: "lucide:tags",
    image: null,
  });
  assert.deepEqual(menuIconSetting("brand", { brand: 42 }), {
    icon: "lucide:tags",
    image: null,
  });
});

test("only URLs and site paths count as images", () => {
  assert.equal(isMenuIconImage("https://x.example/a.png"), true);
  assert.equal(isMenuIconImage("/upload/a.png"), true);
  assert.equal(isMenuIconImage("lucide:crown"), false);
  assert.equal(isMenuIconImage(""), false);
  assert.equal(isMenuIconImage(null), false);
});

test("the stored map keeps both shapes and drops the rest", () => {
  assert.deepEqual(normalizeMenuIcons(null), {});
  assert.deepEqual(normalizeMenuIcons("nope"), {});
  assert.deepEqual(
    normalizeMenuIcons({
      brand: { icon: "material:store", image: "/upload/brand.png" },
      home: { icon: "lucide:sparkles" },
      review: "lucide:star",
      "category-x": 7,
      empty: {},
    }),
    {
      brand: { icon: "material:store", image: "/upload/brand.png" },
      home: { icon: "lucide:sparkles" },
      review: "lucide:star",
    },
  );
});
