/**
 * A brand page's banner, in one place (client's slide 7): one raw image, edge to
 * edge — no page margins — drawn at a height the admin sets, 300px until they
 * say otherwise. The storefront renderer and the admin's preview both read these
 * numbers, so the two cannot disagree.
 */

export const BRAND_BANNER_HEIGHT_DEFAULT = 300;
export const BRAND_BANNER_HEIGHT_MIN = 60;
export const BRAND_BANNER_HEIGHT_MAX = 900;

/** The stored height, repaired: a brand saved before the setting existed (or
 * with an unusable value) draws at the default. */
export function brandBannerHeight(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : NaN;
  if (Number.isNaN(n)) return BRAND_BANNER_HEIGHT_DEFAULT;
  return Math.min(
    Math.max(Math.round(n), BRAND_BANNER_HEIGHT_MIN),
    BRAND_BANNER_HEIGHT_MAX,
  );
}

/**
 * The screen the admin preview quotes. A full-bleed banner is as wide as the
 * window, and a fixed-height `object-cover` crop depends on that width, so the
 * preview draws the banner at 1440px and scales the picture down to its panel
 * rather than drawing it at the panel's own — narrower — width.
 */
export const BRAND_BANNER_VIEWPORT_WIDTH = 1440;
