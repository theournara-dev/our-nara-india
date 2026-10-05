import { test } from "node:test";
import assert from "node:assert/strict";
import { findCountry, toAlpha3 } from "../src/data/countries";

test("toAlpha3 converts alpha-2 codes", () => {
  assert.equal(toAlpha3("IN"), "IND");
  assert.equal(toAlpha3("in"), "IND");
  assert.equal(toAlpha3("US"), "USA");
  assert.equal(toAlpha3("KR"), "KOR");
});

test("toAlpha3 passes alpha-3 codes through", () => {
  assert.equal(toAlpha3("ind"), "IND");
  assert.equal(toAlpha3("GBR"), "GBR");
});

test("toAlpha3 converts country names", () => {
  assert.equal(toAlpha3("India"), "IND");
  assert.equal(toAlpha3("South Korea"), "KOR");
});

test("toAlpha3 returns undefined for unknown input", () => {
  assert.equal(toAlpha3("Atlantis"), undefined);
  assert.equal(toAlpha3("ZZ"), undefined);
});

test("findCountry matches alpha-3 codes too", () => {
  assert.equal(findCountry("IND")?.name, "India");
});
