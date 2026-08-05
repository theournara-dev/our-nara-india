/**
 * Global site configuration and shared constants.
 * Keep presentation-independent values here so they stay in one place.
 */

export const SITE = {
  name: "OUR:NARA",
  tagline: "Your new K-Beauty destination",
  description: "Korean beauty, now in India.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "http://localhost:3000"),
  /** Default store currency (ISO 4217). Multi-currency support can layer on later. */
  currency: "INR",
  supportPhone: "+91-88283-38323",
  supportEmail: "theournara@gmail.com",
} as const;

/** Shop categories surfaced in the storefront navigation. */
export const NAV_CATEGORIES = [
  { slug: "skin-care", name: "Skin Care" },
  { slug: "makeup", name: "Makeup" },
  { slug: "hair-care", name: "Hair Care" },
  { slug: "pre-order", name: "PRE-ORDER" },
] as const;

/**
 * Cache revalidation window (seconds) for read-only catalog data.
 * The catalog only changes when staff update products, so a 1h stale window
 * is a good default between on-demand invalidation and freshness.
 */
export const REVALIDATE_CATALOG = 3600;

/** Shared cache tags so future admin mutations can invalidate precisely. */
export const CACHE_TAGS = {
  products: "products",
  brands: "brands",
  categories: "categories",
  homepage: "homepage",
} as const;
