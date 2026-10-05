import { test } from "node:test";
import assert from "node:assert/strict";
import { friendlyPaymentError } from "../src/lib/payment-errors";

test("maps an unavailable store to a specific message", () => {
  assert.equal(
    friendlyPaymentError(new Error("Payment is not available for this store yet."))
      .title,
    "Payment unavailable",
  );
});

test("maps a generic gateway failure", () => {
  assert.equal(
    friendlyPaymentError(new Error("Could not initiate payment")).title,
    "Payment gateway issue",
  );
});

test("maps cancellation", () => {
  assert.equal(
    friendlyPaymentError(new Error("Payment cancelled.")).title,
    "Payment cancelled",
  );
});

test("falls back for unknown errors", () => {
  assert.equal(
    friendlyPaymentError(new Error("some opaque digest")).title,
    "Payment failed",
  );
  assert.equal(friendlyPaymentError(null).title, "Payment failed");
});
