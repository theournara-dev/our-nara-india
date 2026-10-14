import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_CART_LINES,
  MAX_LINE_QTY,
  isIndiaPin,
  isPlausiblePhone,
  validateCheckoutDetails,
  type CheckoutDetails,
} from "../src/lib/checkout-rules";

const VALID: CheckoutDetails = {
  name: "Dilmurod Valiev",
  email: "valiev.dilmurod1998+1@gmail.com",
  phone: "+91-88283-38323",
  addressLine1: "1109, One World, S.V. Road",
  addressLine2: "",
  city: "Mumbai",
  state: "Maharashtra",
  postal: "400064",
  country: "IN",
};

test("a complete India address passes the shared rules", () => {
  assert.deepEqual(validateCheckoutDetails(VALID, { requireIndiaAddress: true }), {});
});

test("phone numbers are judged on their digits", () => {
  for (const ok of [
    "+91 88283 38323",
    "(022) 1234 5678",
    "8828338323",
    "0091-88283-38323",
  ]) {
    assert.equal(isPlausiblePhone(ok), true, `expected ok: ${ok}`);
  }
  for (const bad of ["", "abc", "12 34", "1".repeat(16), "+"]) {
    assert.equal(isPlausiblePhone(bad), false, `expected bad: ${bad}`);
  }
});

test("a phone that is not a number is refused", () => {
  const errors = validateCheckoutDetails(
    { ...VALID, phone: "call me maybe" },
    { requireIndiaAddress: true },
  );
  assert.match(errors.phone ?? "", /phone/i);
});

test("India PINs are six digits and never start with zero", () => {
  assert.equal(isIndiaPin("400064"), true);
  assert.equal(isIndiaPin("400 064"), true);
  assert.equal(isIndiaPin("400-064"), true);
  for (const bad of ["40006", "4000640", "040064", "MH400064", ""]) {
    assert.equal(isIndiaPin(bad), false, `expected bad: ${bad}`);
  }
});

test("the India store insists on a State and a PIN", () => {
  const missing = validateCheckoutDetails(
    { ...VALID, state: "  ", postal: "N/A" },
    { requireIndiaAddress: true },
  );
  assert.match(missing.state ?? "", /required/i);
  assert.match(missing.postal ?? "", /PIN/i);

  // The international store reads addresses by country: no State, no PIN rule.
  assert.deepEqual(
    validateCheckoutDetails(
      { ...VALID, state: "", postal: "22208" },
      { requireIndiaAddress: false },
    ),
    {},
  );
});

test("required fields mirror the server's schema", () => {
  const errors = validateCheckoutDetails(
    {
      name: " ",
      email: "not-an-email",
      phone: "",
      addressLine1: "",
      city: "",
      state: "",
      postal: "",
      country: "",
    },
    { requireIndiaAddress: true },
  );
  assert.deepEqual(Object.keys(errors).sort(), [
    "addressLine1",
    "city",
    "country",
    "email",
    "name",
    "phone",
    "postal",
    "state",
  ]);
});

test("the cart limits stay in the range the checkout accepts", () => {
  assert.equal(MAX_LINE_QTY, 99);
  assert.ok(MAX_CART_LINES > 1 && MAX_CART_LINES <= 200);
});
