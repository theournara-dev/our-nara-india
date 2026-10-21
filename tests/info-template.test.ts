import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INFO_TEMPLATE_KEY,
  selectInfoRows,
  type InfoRow,
} from "../src/lib/info-rows";

const indiaDefault: InfoRow[] = [
  { heading: "PAYMENT", body: "UPI and cards" },
  { heading: "RETURNS & EXCHANGES", body: "7 days" },
];
const kdropDefault: InfoRow[] = [
  { heading: "PAYMENT & BILLING", body: "Cards" },
  { heading: "SHIPPING & DELIVERY", body: "7–15 business days" },
];
const indiaOverride: InfoRow[] = [
  { heading: "PAYMENT", body: "UPI only" },
  { heading: "RETURNS & EXCHANGES", body: "Hidden here", visible: false },
];
const kdropOverride: InfoRow[] = [{ heading: "PAYMENT & BILLING", body: "Cards and wallets" }];

test("each store reads its own storewide default row", () => {
  assert.equal(INFO_TEMPLATE_KEY.local, "default");
  assert.equal(INFO_TEMPLATE_KEY.global, "global");
});

test("India shows the product's own rows, hidden ones excluded", () => {
  assert.deepEqual(
    selectInfoRows(indiaOverride, [], indiaDefault, "local"),
    [{ heading: "PAYMENT", body: "UPI only" }],
  );
});

test("International shows its own override, never the India rows", () => {
  assert.deepEqual(
    selectInfoRows(indiaOverride, kdropOverride, kdropDefault, "global"),
    kdropOverride,
  );
});

test("a product with no International rows shows the K-Drop default", () => {
  assert.deepEqual(
    selectInfoRows(indiaOverride, [], kdropDefault, "global"),
    kdropDefault,
  );
});

test("a product with no India rows shows the India default", () => {
  assert.deepEqual(selectInfoRows([], kdropOverride, indiaDefault, "local"), indiaDefault);
});
