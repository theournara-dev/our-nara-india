import { SITE } from "@/lib/constants";
import {
  getActiveVersion,
  getVersionConfig,
  type SiteVersion,
} from "@/lib/site-version";

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, locale: string) {
  // Cache key includes the locale: INR wants en-IN digit grouping (₹1,80,000),
  // USD wants en-US grouping ($1,800.00).
  const key = `${locale}:${currency}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

export interface FormatMoneyOptions {
  /**
   * Site version whose display currency/locale to use. Defaults to the active
   * version (env/domain, or the runtime override from the header switch).
   */
  version?: SiteVersion;
  /**
   * Display the amount in the version's display currency/locale. Defaults to
   * true — storefront surfaces display in the version currency. Pass `false`
   * to show the stored currency as-is (admin surfaces and historical order
   * data, where the stored amount is the source of truth).
   */
  convert?: boolean;
}

/**
 * Format an amount stored in integer minor units (paise) as a currency string.
 * All money is persisted as integer minor units to avoid float drift; convert
 * here at the presentation edge only.
 *
 * The amount is formatted AS-IS — no fx conversion is applied. Callers that
 * need a version-appropriate amount should use `priceForVersion` first and
 * pass the result here. Storefront call sites keep their existing
 * `formatMoney(x, currency)` shape — the active site version decides the
 * display currency/locale. Admin call sites should pass `{ convert: false }`
 * to keep showing the stored currency.
 */
export function formatMoney(
  minorUnits: number,
  currency: string = SITE.currency,
  options: FormatMoneyOptions = {},
) {
  const version = options.version ?? getActiveVersion();
  const config = getVersionConfig(version);
  const convert = options.convert ?? true;
  const displayCurrency = convert ? config.currency : currency;
  // When not converting, the stored currency is the source of truth, so the
  // locale must match that currency (USD → en-US, INR → en-IN) rather than the
  // active version's locale — otherwise a USD total would render with Indian
  // digit grouping ($1,80,000.00).
  const locale = convert
    ? config.locale
    : displayCurrency === "INR"
      ? "en-IN"
      : "en-US";
  const amount = minorUnits / 100;
  return getFormatter(displayCurrency, locale).format(amount);
}

/**
 * Pick the price for a product for a given store version.
 *
 * The two stores charge their own amounts, both in INR (Razorpay only settles
 * INR): the local (India) store charges `localCents`, the global
 * (International) store charges `globalCents` — a real INR amount, not a
 * converted legacy value. The global amount is optional: when unset
 * (null/undefined) the global store falls back to the local price.
 */
export function priceForVersion(
  localCents: number,
  globalCents: number | null | undefined,
  version: SiteVersion = getActiveVersion(),
): number {
  return version === "global" && globalCents != null ? globalCents : localCents;
}
