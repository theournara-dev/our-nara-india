import assert from "node:assert/strict";
import { test } from "node:test";
import { nextUserName } from "../src/lib/profile";

test("the display name follows the contact name until the user customises it", () => {
  assert.equal(nextUserName("Jane Doe", "Jane", "Doe", "Janet", "Doe"), "Janet Doe");
  assert.equal(nextUserName("", null, null, "Janet", "Doe"), "Janet Doe");
  assert.equal(nextUserName("JD", "Jane", "Doe", "Janet", "Doe"), "JD");
});
