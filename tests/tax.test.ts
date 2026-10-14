import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_GST_BPS,
  clampBps,
  formatBps,
  isMaharashtra,
  resolveTaxBps,
  roundOffCents,
  splitInclusiveTax,
} from "../src/lib/tax";

// ── Place of supply ────────────────────────────────────────────────────────

test("Maharashtra is recognised however it is written", () => {
  for (const value of ["Maharashtra", "maharashtra", " MH ", "maharastra"]) {
    assert.equal(isMaharashtra(value), value !== "maharastra", `raw: ${value}`);
  }
  assert.equal(isMaharashtra("MH"), true);
});

test("other states and blanks are not Maharashtra", () => {
  for (const value of ["Karnataka", "Delhi", "", null, undefined, "Mumbai"]) {
    assert.equal(isMaharashtra(value), false, `raw: ${value}`);
  }
});

// ── Rate resolution ────────────────────────────────────────────────────────

test("the product override wins over the storewide default", () => {
  const site = { intraBps: 1800, interBps: 1800 };
  assert.equal(
    resolveTaxBps(true, { intraBps: 500, interBps: 1200 }, site),
    500,
  );
  assert.equal(
    resolveTaxBps(false, { intraBps: 500, interBps: 1200 }, site),
    1200,
  );
});

test("the storewide default fills in where the product is silent", () => {
  const site = { intraBps: 1200, interBps: 500 };
  assert.equal(
    resolveTaxBps(true, { intraBps: null, interBps: 500 }, site),
    1200,
  );
  assert.equal(
    resolveTaxBps(false, { intraBps: 1200, interBps: null }, site),
    500,
  );
  assert.equal(resolveTaxBps(true, null, null), DEFAULT_GST_BPS);
});

test("rates clamp to 0–50%", () => {
  assert.equal(clampBps(-10), 0);
  assert.equal(clampBps(9000), 5000);
  assert.equal(clampBps(1850), 1850);
  assert.equal(clampBps(null), null);
});

// ── Extracting tax from an inclusive price ─────────────────────────────────

test("18% intra-State splits into equal halves that add back up", () => {
  // ₹699.00 inclusive at 18% → taxable 592.37, tax 106.63 (9% + 9%)
  const split = splitInclusiveTax(69_900, 1800, true);
  assert.equal(split.taxableCents, 59_237);
  assert.equal(split.taxCents, 10_663);
  assert.equal(split.cgstCents, 5_331);
  assert.equal(split.sgstCents, 5_332);
  assert.equal(split.igstCents, 0);
  assert.equal(split.cgstCents + split.sgstCents, split.taxCents);
  assert.equal(split.taxableCents + split.taxCents, 69_900);
});

test("18% inter-State charges the whole tax as IGST", () => {
  const split = splitInclusiveTax(69_900, 1800, false);
  assert.equal(split.taxableCents, 59_237);
  assert.equal(split.igstCents, 10_663);
  assert.equal(split.cgstCents, 0);
  assert.equal(split.sgstCents, 0);
});

test("a zero rate leaves the amount untouched", () => {
  const split = splitInclusiveTax(12_345, 0, true);
  assert.deepEqual(split, {
    taxableCents: 12_345,
    taxCents: 0,
    cgstCents: 0,
    sgstCents: 0,
    igstCents: 0,
  });
});

test("odd paise still add up exactly", () => {
  for (const gross of [1, 3, 99, 101, 266_667, 450_001]) {
    for (const intra of [true, false]) {
      const split = splitInclusiveTax(gross, 1800, intra);
      assert.equal(
        split.taxableCents + split.taxCents,
        gross,
        `gross ${gross} intra ${intra}`,
      );
      assert.equal(
        split.cgstCents + split.sgstCents + split.igstCents,
        split.taxCents,
      );
    }
  }
});

// ── Rounding and labels ────────────────────────────────────────────────────

test("round off lifts a total to the nearest rupee, both ways", () => {
  assert.equal(roundOffCents(69_900), 0);
  assert.equal(roundOffCents(69_950), 50);
  assert.equal(roundOffCents(69_960), 40);
  assert.equal(roundOffCents(266_667), 33);
  assert.equal(roundOffCents(450_149), -49);
});

test("round off plus the total is a whole number of rupees", () => {
  for (const total of [1, 49, 50, 51, 149, 266_667]) {
    const rounded = total + roundOffCents(total);
    assert.equal(rounded % 100, 0, `total ${total}`);
  }
});

test("basis points read as percentages", () => {
  assert.equal(formatBps(1800), "18%");
  assert.equal(formatBps(900), "9%");
  assert.equal(formatBps(1250), "12.5%");
  assert.equal(formatBps(0), "0%");
});
