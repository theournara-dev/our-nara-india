import { test } from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "../src/lib/rate-limit";

test("allows up to max hits then blocks", () => {
  const rl = createRateLimiter(3, 1000);
  assert.equal(rl.check("a"), false);
  assert.equal(rl.check("a"), false);
  assert.equal(rl.check("a"), false);
  assert.equal(rl.check("a"), true);
});

test("keys are independent", () => {
  const rl = createRateLimiter(1, 1000);
  assert.equal(rl.check("a"), false);
  assert.equal(rl.check("b"), false);
  assert.equal(rl.check("a"), true);
});

test("count reflects in-window hits without recording one", () => {
  const rl = createRateLimiter(5, 1000);
  rl.check("a");
  rl.check("a");
  assert.equal(rl.count("a"), 2);
});

test("window expiry resets the bucket", async () => {
  const rl = createRateLimiter(1, 30);
  assert.equal(rl.check("a"), false);
  assert.equal(rl.check("a"), true);
  await new Promise((resolve) => setTimeout(resolve, 45));
  assert.equal(rl.check("a"), false);
});
