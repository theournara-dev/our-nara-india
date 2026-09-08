/**
 * Site-version system: "local" (our-nara.com — INR, Razorpay, pre-orders)
 * vs "global" (our-nara.co.kr — USD, payment disabled for now, no pre-orders).
 *
 * Every version-specific decision in the app should read from this module
 * instead of hardcoding. To add a new per-version behavior, add a field to
 * `SiteVersionConfig` and set it in `SITE_VERSIONS` below — then read it via
 * `getVersionConfig(version)` / `versionFlag(name, version)`.
 *
 * The active version is resolved at build time from env/domain, and can be
 * overridden at runtime by the header switch (localStorage + cookie).
 */

export type SiteVersion = "local" | "global";

export interface SiteVersionConfig {
  /** Display currency (ISO 4217) for the storefront. */
  currency: "INR" | "USD";
  /** Intl locale used to format money for this version. */
  locale: string;
  /** Whether checkout/payment is enabled. Global is disabled while the new gateway is prepared. */
  paymentsEnabled: boolean;
  /** Whether the pre-order feature is available. Global sells everything directly. */
  preOrderEnabled: boolean;
  /** Whether India-specific UI (footer address, support phone, etc.) is shown. */
  showIndianAddress: boolean;
  /**
   * Display-only FX rate: how many minor units of the STORED currency (INR
   * paise) equal one minor unit of the DISPLAY currency. Local = 1.
   * Global = 1 USD cent per 83 INR paise (1/83). Display-only — orders are
   * still stored and charged in the stored currency.
   */
  fxRate: number;
  /** Arbitrary UI toggles — add new flags here as the versions diverge. */
  flags: Record<string, boolean>;
}

export const SITE_VERSIONS: Record<SiteVersion, SiteVersionConfig> = {
  local: {
    currency: "INR",
    locale: "en-IN",
    paymentsEnabled: true,
    preOrderEnabled: true,
    showIndianAddress: true,
    fxRate: 1,
    flags: {},
  },
  global: {
    currency: "USD",
    locale: "en-US",
    paymentsEnabled: false,
    preOrderEnabled: false,
    showIndianAddress: false,
    fxRate: 1 / 83, // 1 USD cent = 83 INR paise (display-only)
    flags: {},
  },
};

/** Default version when nothing else says otherwise. */
export const DEFAULT_SITE_VERSION: SiteVersion = "local";

/** Cookie name used to persist the runtime switch (read by server components). */
export const SITE_VERSION_COOKIE = "site_version";

/**
 * Production domains for each version. The header switch navigates between
 * these in production (each domain is its own version); in development it
 * toggles the runtime variable instead.
 */
export const SITE_DOMAINS: Record<SiteVersion, string> = {
  local: "https://our-nara.com",
  global: "https://our-nara.co.kr",
};

/** localStorage key used by the client provider for instant re-render. */
export const SITE_VERSION_STORAGE_KEY = "ournara-site-version";

/**
 * Resolve the version from the environment: an explicit
 * `NEXT_PUBLIC_SITE_VERSION` wins, otherwise the domain is inspected
 * (our-nara.co.kr → global, everything else → local).
 */
export function resolveSiteVersion(): SiteVersion {
  const explicit = process.env.NEXT_PUBLIC_SITE_VERSION;
  if (explicit === "global" || explicit === "local") return explicit;
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (url.includes("our-nara.co.kr")) return "global";
  return DEFAULT_SITE_VERSION;
}

/** The version baked in at build time (server + client initial render). */
export const SITE_VERSION: SiteVersion = resolveSiteVersion();

/**
 * Runtime-active version. Server components always see `SITE_VERSION`;
 * the client provider calls `setActiveVersion` when the user switches, so
 * client-side renders (prices, buttons) react instantly.
 */
let activeVersion: SiteVersion = SITE_VERSION;

export function setActiveVersion(version: SiteVersion): void {
  activeVersion = version;
}

export function getActiveVersion(): SiteVersion {
  return activeVersion;
}

export function isGlobal(version: SiteVersion = SITE_VERSION): boolean {
  return version === "global";
}

export function getVersionConfig(
  version: SiteVersion = SITE_VERSION,
): SiteVersionConfig {
  return SITE_VERSIONS[version];
}

/** Convenience: read a generic flag for the active version. */
export function versionFlag(
  name: string,
  version: SiteVersion = SITE_VERSION,
): boolean {
  return SITE_VERSIONS[version].flags[name] ?? false;
}

/** Parse a raw value (cookie/localStorage/env) into a valid version. */
export function parseSiteVersion(value: string | null | undefined): SiteVersion | null {
  if (value === "global" || value === "local") return value;
  return null;
}
