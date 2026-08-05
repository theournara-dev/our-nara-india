import { SITE } from "@/lib/constants";

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string) {
  let formatter = formatters.get(currency);
  if (!formatter) {
    // en-IN gives the Indian digit grouping the store uses (₹1,80,000 style).
    formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    });
    formatters.set(currency, formatter);
  }
  return formatter;
}

/**
 * Format an amount stored in integer minor units (paise) as a currency string.
 * All money is persisted as integer minor units to avoid float drift; convert
 * here at the presentation edge only.
 */
export function formatMoney(minorUnits: number, currency: string = SITE.currency) {
  return getFormatter(currency).format(minorUnits / 100);
}
