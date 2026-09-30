import { test } from "node:test";
import assert from "node:assert/strict";
import { friendlyShipmentError } from "../src/lib/shipment-errors";

test("maps the local-only guard to a friendly message", () => {
  const e = new Error(
    "Delhivery fulfillment is only available for local (India) orders. Fulfil global orders manually.",
  );
  assert.equal(friendlyShipmentError(e).title, "Local orders only");
});

test("maps an unpaid order", () => {
  assert.equal(
    friendlyShipmentError(new Error("Only paid orders can be shipped.")).title,
    "Order not paid",
  );
});

test("maps address problems", () => {
  assert.equal(
    friendlyShipmentError(new Error("Order is missing a phone number.")).title,
    "Check the shipping address",
  );
  assert.equal(
    friendlyShipmentError(
      new Error("Order is missing a valid 6-digit Indian postal code."),
    ).title,
    "Check the shipping address",
  );
});

test("maps known Delhivery rejection reasons from the suffix", () => {
  assert.equal(
    friendlyShipmentError(
      new Error("Delhivery rejected the shipment: pincode not serviceable"),
    ).title,
    "Pincode not serviceable",
  );
  assert.equal(
    friendlyShipmentError(
      new Error("Delhivery rejected the shipment: duplicate order"),
    ).title,
    "Duplicate shipment",
  );
});

test("passes through the orphaned-waybill message", () => {
  const e = new Error(
    "Shipment created at Delhivery (waybill ABC123) but saving it failed. Import it with the Import button — do NOT create another shipment.",
  );
  assert.equal(friendlyShipmentError(e).title, "Shipment created — import it");
});

test("maps a missing env var to a config message", () => {
  assert.equal(
    friendlyShipmentError(
      new Error("Missing required environment variable: DELHIVERY_API_TOKEN"),
    ).title,
    "Shipping not configured",
  );
});

test("falls back to a generic message for unknown errors", () => {
  assert.equal(
    friendlyShipmentError(new Error("some opaque masked digest")).title,
    "Shipment failed",
  );
  assert.equal(friendlyShipmentError(null).title, "Shipment failed");
});
