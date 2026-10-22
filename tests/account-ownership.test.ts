import assert from "node:assert/strict";
import { test } from "node:test";
import { orderAccountWhere, orderBelongsToUser } from "../src/lib/order-ownership";

const user = { id: "u2", email: "a@example.com", emailVerified: true };

test("an order belongs to its owner, or to the verified account matching a guest order's email", () => {
  assert.equal(orderBelongsToUser({ userId: "u2", email: "other@example.com" }, user), true);
  assert.equal(orderBelongsToUser({ userId: null, email: "A@Example.com" }, user), true);
  assert.equal(orderBelongsToUser({ userId: "u3", email: "a@example.com" }, user), false);
  assert.equal(orderBelongsToUser({ userId: null, email: "b@example.com" }, user), false);
});

test("an unverified account never inherits guest orders by email", () => {
  const unverified = { ...user, emailVerified: false };
  assert.equal(
    orderBelongsToUser({ userId: null, email: "a@example.com" }, unverified),
    false,
  );
  assert.deepEqual(orderAccountWhere(unverified), { userId: "u2" });
});

test("the account where clause lowercases the email", () => {
  assert.deepEqual(orderAccountWhere({ id: "u2", email: "A@Example.com", emailVerified: true }), {
    OR: [{ userId: "u2" }, { userId: null, email: "a@example.com" }],
  });
});
