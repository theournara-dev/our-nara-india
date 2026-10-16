import { test } from "node:test";
import assert from "node:assert/strict";
import { LONG_BANNER_NONE } from "../src/lib/page-builder/types";
import {
  growLongBannerSlots,
  longBannerCellBox,
  longBannerPhoneBox,
  normalizeLongBannerSlots,
  resolveLongBannerCells,
} from "../src/lib/long-banner";

/**
 * The long banner's column rules and box sizes are shared by the storefront
 * loader, the section editor's preview and the banner editor's previews
 * (client's slide 3). One drifting copy shows the admin a strip the page does
 * not render — the mismatch the client reported — so the shared behaviour is
 * pinned here.
 */

const pool = [{ id: "a" }, { id: "b" }, { id: "c" }];

test("a section saved before the cell split keeps its banners as cells", () => {
  assert.deepEqual(normalizeLongBannerSlots({ bannerIds: ["a", "b"] }, 2), [
    { id: "cell-1", bannerId: "a" },
    { id: "cell-2", bannerId: "b" },
  ]);
});

test("normalising pads to the column count with automatic slots", () => {
  const cells = normalizeLongBannerSlots(
    { cells: [{ id: "cell-1", bannerId: "a" }] },
    3,
  );
  assert.equal(cells.length, 3);
  assert.deepEqual(cells[1], { id: "cell-2", bannerId: "" });
  assert.deepEqual(cells[2], { id: "cell-3", bannerId: "" });
});

test("growing the count keeps the picks the hidden columns held", () => {
  const three = [
    { id: "cell-1", bannerId: "a" },
    { id: "cell-2", bannerId: "b" },
    { id: "cell-3", bannerId: "c" },
  ];
  // Lowering never drops the stored slots, so the third column's pick is still
  // there when the count goes back up.
  assert.deepEqual(growLongBannerSlots(three, 2), three);
  assert.deepEqual(growLongBannerSlots(three.slice(0, 2), 3)[2], {
    id: "cell-3",
    bannerId: "",
  });
});

test("automatic columns drain the pool in order, without repeating a pick", () => {
  const out = resolveLongBannerCells(normalizeLongBannerSlots({}, 2), pool);
  assert.deepEqual(
    out.map((cell) => cell.banner?.id),
    ["a", "b"],
  );
});

test("a column on None shows nothing and hands the next banner on", () => {
  const out = resolveLongBannerCells(
    [
      { id: "cell-1", bannerId: LONG_BANNER_NONE },
      { id: "cell-2", bannerId: "" },
    ],
    pool,
  );
  assert.deepEqual(
    out.map((cell) => cell.banner?.id ?? null),
    [null, "a"],
  );
});

test("a picked column wins, and automatic columns fill around it", () => {
  const out = resolveLongBannerCells(
    [
      { id: "cell-1", bannerId: "" },
      { id: "cell-2", bannerId: "c" },
    ],
    pool,
  );
  assert.deepEqual(
    out.map((cell) => cell.banner?.id),
    ["a", "c"],
  );
});

test("a pick the pool no longer offers falls through to the next banner", () => {
  const out = resolveLongBannerCells(
    [
      { id: "cell-1", bannerId: "hidden" },
      { id: "cell-2", bannerId: "" },
    ],
    pool,
  );
  assert.deepEqual(
    out.map((cell) => cell.banner?.id),
    ["a", "b"],
  );
});

test("the quoted boxes are the ones the page renders at its widest", () => {
  // The strip sits in the 1560px container's 1544px content column, between
  // 10px gaps; auto height keeps the artwork's own 2172:260 proportions.
  assert.deepEqual(longBannerCellBox(1, 0), { width: 1544, height: 185 });
  assert.deepEqual(longBannerCellBox(2, 0), { width: 767, height: 92 });
  assert.deepEqual(longBannerCellBox(2, 100), { width: 767, height: 100 });
  assert.deepEqual(longBannerCellBox(3, 0), { width: 508, height: 61 });
  assert.deepEqual(longBannerPhoneBox(0), { width: 358, height: 94 });
});
