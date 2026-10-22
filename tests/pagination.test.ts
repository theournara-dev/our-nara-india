import assert from "node:assert/strict";
import { test } from "node:test";
import { clampPage } from "../src/lib/pagination";

test("page numbers are whole and inside the list", () => {
  assert.equal(clampPage("3", 5), 3);
  assert.equal(clampPage("2.5", 5), 1);
  assert.equal(clampPage("999", 5), 5);
  assert.equal(clampPage("0", 5), 1);
  assert.equal(clampPage("-2", 5), 1);
  assert.equal(clampPage(undefined, 5), 1);
  assert.equal(clampPage("1", 0), 1);
});