import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatCutoffLabel,
  nextDispatchLabel,
  shippingProgress,
} from "../src/lib/shipping";

test("formatCutoffLabel renders a 12-hour clock label", () => {
  assert.equal(formatCutoffLabel(15), "3:00 PM");
  assert.equal(formatCutoffLabel(9), "9:00 AM");
  assert.equal(formatCutoffLabel(12), "12:00 PM");
  assert.equal(formatCutoffLabel(0), "12:00 AM");
});

test("an order before the cut-off ships on the next business day", () => {
  // Monday 5 Oct 2026, 10:00 → Tuesday.
  assert.equal(
    nextDispatchLabel(new Date(2026, 9, 5, 10, 0), 15),
    "Tomorrow 10/06(TUE)",
  );
});

test("an order after the cut-off misses today's batch", () => {
  // Monday 5 Oct 2026, 16:00 → the batch closes, so Wednesday.
  assert.equal(
    nextDispatchLabel(new Date(2026, 9, 5, 16, 0), 15),
    "Wednesday 10/07(WED)",
  );
});

test("weekends are not dispatch days", () => {
  // Friday 9 Oct 2026, 10:00 → Monday, not Saturday.
  assert.equal(
    nextDispatchLabel(new Date(2026, 9, 9, 10, 0), 15),
    "Monday 10/12(MON)",
  );
  // Saturday order → Monday too.
  assert.equal(
    nextDispatchLabel(new Date(2026, 9, 10, 10, 0), 15),
    "Monday 10/12(MON)",
  );
});

test("shippingProgress reports the three states the bar renders", () => {
  // A store that never charges: always free, fully filled.
  const always = shippingProgress(0, {
    shippingCents: 0,
    freeShippingOverCents: null,
  });
  assert.equal(always.reason, "always-free");
  assert.equal(always.percent, 100);

  // Fee with a milestone: progress towards it.
  const settings = { shippingCents: 4900, freeShippingOverCents: 10_000_00 };
  const halfway = shippingProgress(5_000_00, settings);
  assert.equal(halfway.isFree, false);
  assert.equal(halfway.percent, 50);
  assert.equal(halfway.remainingCents, 5_000_00);
  const met = shippingProgress(10_000_00, settings);
  assert.equal(met.isFree, true);
  assert.equal(met.percent, 100);
  assert.equal(met.feeCents, 4900);
});

test("a milestone drives the bar even while the store charges no fee", () => {
  // The India store's setup: delivery is free today, but a ₹1,000 milestone is
  // configured. The bar must follow the cart, not sit at 100% while it is
  // empty (the client's report).
  const settings = { shippingCents: 0, freeShippingOverCents: 1_000_00 };

  const empty = shippingProgress(0, settings);
  assert.equal(empty.percent, 0);
  assert.equal(empty.isFree, false);
  assert.equal(empty.remainingCents, 1_000_00);

  const partway = shippingProgress(800_00, settings);
  assert.equal(partway.percent, 80);
  assert.equal(partway.isFree, false);
  assert.equal(partway.remainingCents, 200_00);

  const met = shippingProgress(1_000_00, settings);
  assert.equal(met.percent, 100);
  assert.equal(met.isFree, true);
  assert.equal(met.remainingCents, 0);
  assert.equal(met.reason, "always-free");
});

test("a free-shipping coupon (no milestone) still fills the bar", () => {
  // The cart swaps in FREE_SHIPPING when a coupon waives delivery — there is
  // nothing left to progress towards, so the bar reads as complete.
  const coupon = shippingProgress(1200, {
    shippingCents: 0,
    freeShippingOverCents: null,
  });
  assert.equal(coupon.percent, 100);
  assert.equal(coupon.isFree, true);
  assert.equal(coupon.feeCents, 0);
  assert.equal(coupon.milestoneCents, null);
});

test("a fee with no milestone shows an empty bar", () => {
  const fee = shippingProgress(500_00, {
    shippingCents: 9900,
    freeShippingOverCents: null,
  });
  assert.equal(fee.percent, 0);
  assert.equal(fee.isFree, false);
  assert.equal(fee.feeCents, 9900);
});
