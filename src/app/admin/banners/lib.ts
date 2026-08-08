/** Query params that make up the banners list's filter state. */
export const FILTER_KEYS = [
  "search",
  "placement",
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
export const BANNER_PLACEMENTS = ["long", "hero", "triple"] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];

export const PLACEMENT_LABELS: Record<BannerPlacement, string> = {
  long: "Long banner",
  hero: "Hero carousel",
  triple: "Triple banner",
};
