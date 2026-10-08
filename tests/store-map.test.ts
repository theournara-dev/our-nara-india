import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveStoreMapQuery,
  storeDetailValue,
  storeMapEmbedUrl,
  storeMapOpenUrl,
} from "../src/lib/store-map";

test("resolveStoreMapQuery prefers the map location", () => {
  assert.equal(
    resolveStoreMapQuery("  Room 1816, Incheon  ", "Other address"),
    "Room 1816, Incheon",
  );
});

test("resolveStoreMapQuery falls back to the store address when empty", () => {
  assert.equal(resolveStoreMapQuery("", " 94 Galsan-dong "), "94 Galsan-dong");
  assert.equal(resolveStoreMapQuery("   ", "Malad West"), "Malad West");
});

test("storeMapEmbedUrl encodes the query and requests the embed view", () => {
  assert.equal(
    storeMapEmbedUrl("Malad West, Mumbai & Thane"),
    "https://www.google.com/maps?q=Malad%20West%2C%20Mumbai%20%26%20Thane&output=embed",
  );
});

test("storeMapOpenUrl builds a Maps search link for the same query", () => {
  assert.equal(
    storeMapOpenUrl("94 Galsan-dong, Incheon"),
    "https://www.google.com/maps/search/?api=1&query=94%20Galsan-dong%2C%20Incheon",
  );
});

test("storeDetailValue shows a dash for blank values", () => {
  assert.equal(storeDetailValue(""), "-");
  assert.equal(storeDetailValue("   "), "-");
});

test("storeDetailValue keeps the line breaks of multi-line hours", () => {
  assert.equal(
    storeDetailValue(" Week 09:00 - 18:00\nSat, Sun, Holiday OFF "),
    "Week 09:00 - 18:00\nSat, Sun, Holiday OFF",
  );
});
