import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BRAND_INDEX_KEYS,
  brandIndexAnchor,
  brandIndexKey,
  groupBrandsByLetter,
} from "../src/lib/brand-index";

function brand(name: string) {
  return { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name };
}

test("BRAND_INDEX_KEYS is # followed by A-Z", () => {
  assert.equal(BRAND_INDEX_KEYS.length, 27);
  assert.equal(BRAND_INDEX_KEYS[0], "#");
  assert.equal(BRAND_INDEX_KEYS[1], "A");
  assert.equal(BRAND_INDEX_KEYS[26], "Z");
});

test("digits and symbols go to the # bucket", () => {
  assert.equal(brandIndexKey("3CE"), "#");
  assert.equal(brandIndexKey("9 Wonders"), "#");
  assert.equal(brandIndexKey("©Brand"), "#");
  assert.equal(brandIndexKey("★ Star"), "#");
  assert.equal(brandIndexKey("한국 브랜드"), "#");
});

test("leading [ ( quotes and spaces are skipped before choosing the letter", () => {
  assert.equal(brandIndexKey("[LAB] Brand"), "L");
  assert.equal(brandIndexKey("(Dr) Foo"), "D");
  assert.equal(brandIndexKey('"Quoted"'), "Q");
  assert.equal(brandIndexKey("\u201cSmart\u201d"), "S");
  assert.equal(brandIndexKey("   spaced"), "S");
  assert.equal(brandIndexKey("[[3CE]] Skin"), "#");
});

test("letters are case-insensitive and empty names go to #", () => {
  assert.equal(brandIndexKey("skinfood"), "S");
  assert.equal(brandIndexKey(""), "#");
  assert.equal(brandIndexKey("   "), "#");
});

test("accented letters are not folded into A-Z and go to #", () => {
  assert.equal(brandIndexKey("Élan"), "#");
});

test("empty input returns no groups", () => {
  assert.deepEqual(groupBrandsByLetter([]), []);
});

test("only non-empty groups are returned, in # then A-Z order", () => {
  const groups = groupBrandsByLetter([
    brand("Zeta"),
    brand("3CE"),
    brand("Alpha"),
  ]);
  assert.deepEqual(
    groups.map((g) => g.key),
    ["#", "A", "Z"],
  );
  assert.deepEqual(
    groups.map((g) => g.brands.map((b) => b.name)),
    [["3CE"], ["Alpha"], ["Zeta"]],
  );
});

test("brands inside a group are sorted by name, case-insensitively", () => {
  const groups = groupBrandsByLetter([
    brand("Hyggee"),
    brand("hevvy"),
    brand("HEARIM"),
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(
    groups[0].brands.map((b) => b.name),
    ["HEARIM", "hevvy", "Hyggee"],
  );
});

test("numbers inside a name sort naturally within a group", () => {
  const groups = groupBrandsByLetter([brand("Brand 10"), brand("Brand 2")]);
  assert.deepEqual(
    groups[0].brands.map((b) => b.name),
    ["Brand 2", "Brand 10"],
  );
});

test("grouping does not reorder the input array", () => {
  const brands = [brand("Zeta"), brand("Alpha")];
  groupBrandsByLetter(brands);
  assert.deepEqual(
    brands.map((b) => b.name),
    ["Zeta", "Alpha"],
  );
});

test("group anchors use the letter- prefix", () => {
  assert.equal(brandIndexAnchor("A"), "letter-A");
  assert.equal(brandIndexAnchor("#"), "letter-#");
});
