import assert from "node:assert/strict";
import { test } from "node:test";
import { orderAccountWhere, orderBelongsToUser } from "../src/lib/order-ownership";

const user = { id: "u2", email: "a@example.com" };

test("an order belongs to its owner, or to the account matching a guest order's email", () => {
  assert.equal(orderBelongsToUser({ userId: "u2", email: "other@example.com" }, user), true);
  assert.equal(orderBelongsToUser({ userId: null, email: "A@Example.com" }, user), true);
  assert.equal(orderBelongsToUser({ userId: "u3", email: "a@example.com" }, user), false);
  assert.equal(orderBelongsToUser({ userId: null, email: "b@example.com" }, user), false);
});

test("the account where clause lowercases the email", () => {
  assert.deepEqual(orderAccountWhere({ id: "u2", email: "A@Example.com" }), {
    OR: [{ userId: "u2" }, { email: "a@example.com" }],
  });
});
