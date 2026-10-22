import assert from "node:assert/strict";
import { test } from "node:test";
import { withSaved } from "../src/lib/wishlist";

test("saving is idempotent and removing only drops the named product", () => {
  assert.deepEqual(withSaved([], "p1", true), ["p1"]);
  assert.deepEqual(withSaved(["p1", "p2"], "p1", true), ["p1", "p2"]);
  assert.deepEqual(withSaved(["p1", "p2"], "p1", false), ["p2"]);
  assert.deepEqual(withSaved(["p1"], "p9", false), ["p1"]);
});
