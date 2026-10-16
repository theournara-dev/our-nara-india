/** Query params that make up the banners list's filter state. */
export const FILTER_KEYS = [
  "search",
  "placement",
  "category",
  "active",
  "page",
] as const;

/**
 * Build a `/admin/banners` URL that preserves the current list filters, so the
 * user returns to the same page/filters after creating or editing a banner.
 */
export function buildBackHref(
  params: Record<string, string | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const v = params[key];
    if (v) sp.set(key, v);
  }
  const qs = sp.toString();
  return `/admin/banners${qs ? `?${qs}` : ""}`;
}

/** The current filter query string for the given filter values. */
export function currentQuery(params: Record<string, string>): string {
  return buildBackHref(params).replace(/^\/admin\/banners/, "");
}

/** The placements a banner can belong to. Kept in sync with the storefront. */
export const BANNER_PLACEMENTS = [
  "long",
  "hero",
  "triple",
  "category-top",
  "category-long",
  "category-ad",
  "brand-top",
  "brand-section",
] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];

export const PLACEMENT_LABELS: Record<BannerPlacement, string> = {
  long: "Long banner (home)",
  hero: "Hero carousel",
  triple: "Triple banner",
  "category-top": "Category page — top pair",
  "category-long": "Category page — long banner",
  "category-ad": "Category page — ad block",
  "brand-top": "Brands page — top pair",
  "brand-section": "Brand section (home) — row above a brand",
};

/** Placements that need a category to attach to. */
export const CATEGORY_PLACEMENTS: BannerPlacement[] = [
  "category-top",
  "category-long",
  "category-ad",
];

/**
 * Placements that need a brand to attach to: the promo row above a brand's
 * home section (client slides 5–6 — NOWATER, SKIN APPLE, HYGEE).
 */
export const BRAND_PLACEMENTS: BannerPlacement[] = ["brand-section"];
