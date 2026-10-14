/**
 * India GST arithmetic.
 *
 * Prices on this site are tax-INCLUSIVE (the Indian retail norm): the admin
 * enters one price and the customer pays it. An invoice therefore has to
 * *extract* the tax from that gross amount:
 *
 *   taxable value = round(gross × 10000 / (10000 + bps))
 *   tax           = gross − taxable value
 *
 * The place of supply (the shipping address) decides only how that tax is
 * shown, not its size: a Maharashtra delivery is intra-State and splits into
 * CGST + SGST at half the rate each, anywhere else is inter-State and carries a
 * single IGST at the full rate.
 *
 * Everything here is pure so the invoice and the checkout can share it, and so
 * it can be unit-tested (see tests/tax.test.ts).
 */

/** 18% — the storewide default until an admin sets something else. */
export const DEFAULT_GST_BPS = 1800;

/** Rates are basis points: 1800 = 18%, 500 = 5%. Clamped to 0–50%. */
export const MAX_GST_BPS = 5000;

export type TaxRates = {
  /** Rate for a Maharashtra (intra-State) delivery, in basis points. */
  intraBps: number | null;
  /** Rate for every other State/UT (inter-State), in basis points. */
  interBps: number | null;
};

/** A product row's overrides (its own column names) in the shape above. */
export function productTaxRates(product: {
  taxRateMhBps: number | null;
  taxRateOtherBps: number | null;
}): TaxRates {
  return {
    intraBps: product.taxRateMhBps,
    interBps: product.taxRateOtherBps,
  };
}

/** The storewide defaults from Site settings, in the shape above. */
export function siteTaxRates(
  site: { mhBps: number; otherBps: number } | null | undefined,
): TaxRates | null {
  return site ? { intraBps: site.mhBps, interBps: site.otherBps } : null;
}

/** The State our GST registration sits in (the seller's address). */
export const SELLER_STATE = "Maharashtra";

/** Normalise a free-text State so "MH", "Maharashtra" and " maharashtra " match. */
function normaliseState(state: string | null | undefined): string {
  return (state ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

/** Whether a shipping address is inside Maharashtra (the seller's State). */
export function isMaharashtra(state: string | null | undefined): boolean {
  const normalised = normaliseState(state);
  return normalised === "maharashtra" || normalised === "mh";
}

/** Clamp a stored rate into the sane band; null when unset. */
export function clampBps(bps: number | null | undefined): number | null {
  if (bps == null || !Number.isFinite(bps)) return null;
  return Math.min(MAX_GST_BPS, Math.max(0, Math.round(bps)));
}

/**
 * The rate to apply: the product's own override wins, then the storewide
 * default, then 18%. The place picks which of the two to use.
 */
export function resolveTaxBps(
  intraState: boolean,
  product: TaxRates | null | undefined,
  site: TaxRates | null | undefined,
): number {
  const pick = (rates: TaxRates | null | undefined) =>
    clampBps(intraState ? rates?.intraBps : rates?.interBps);
  return pick(product) ?? pick(site) ?? DEFAULT_GST_BPS;
}

export interface TaxSplit {
  /** Value before tax, paise. */
  taxableCents: number;
  /** Total tax, paise (= the three parts below summed). */
  taxCents: number;
  cgstCents: number;
  sgstCents: number;
  igstCents: number;
}

/**
 * Extract the tax from a tax-inclusive amount. Intra-State fills CGST + SGST
 * (the tax is split so the halves always add back up exactly), inter-State
 * fills IGST.
 */
export function splitInclusiveTax(
  grossCents: number,
  bps: number,
  intraState: boolean,
): TaxSplit {
  const rate = clampBps(bps) ?? 0;
  const gross = Math.max(0, Math.round(grossCents));
  const taxableCents =
    rate === 0 ? gross : Math.round((gross * 10_000) / (10_000 + rate));
  const taxCents = gross - taxableCents;
  if (rate === 0 || taxCents === 0) {
    return {
      taxableCents,
      taxCents: 0,
      cgstCents: 0,
      sgstCents: 0,
      igstCents: 0,
    };
  }
  if (!intraState) {
    return {
      taxableCents,
      taxCents,
      cgstCents: 0,
      sgstCents: 0,
      igstCents: taxCents,
    };
  }
  const cgstCents = Math.floor(taxCents / 2);
  return {
    taxableCents,
    taxCents,
    cgstCents,
    sgstCents: taxCents - cgstCents,
    igstCents: 0,
  };
}

/**
 * The paise adjustment that lifts a total to the nearest whole rupee (Indian
 * invoices round the grand total, showing the difference as "Round off").
 */
export function roundOffCents(totalCents: number): number {
  return Math.round(totalCents / 100) * 100 - totalCents;
}

/** "18%" / "9%" / "12.5%" from basis points. */
export function formatBps(bps: number): string {
  const percent = (clampBps(bps) ?? 0) / 100;
  return `${percent.toFixed(2).replace(/\.?0+$/, "")}%`;
}
