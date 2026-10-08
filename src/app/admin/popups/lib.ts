/**
 * The popups admin's list helpers. The popup rules themselves (placements,
 * frequencies, sizes, limits) live in `@/lib/popups` so the storefront, the
 * admin form and the preview all read the same values; they are re-exported
 * here for the admin pages that already import them from this module.
 */

export {
  POPUP_PLACEMENTS,
  PLACEMENT_LABELS,
  POPUP_FREQUENCIES,
  FREQUENCY_LABELS,
  FREQUENCY_HINTS,
  POPUP_SIZES,
  SIZE_LABELS,
  POPUP_CONTENT_LAYOUTS,
  CONTENT_LAYOUT_LABELS,
  CONTENT_LAYOUT_HINTS,
  POPUP_CONTENT_KINDS,
  CONTENT_KIND_LABELS,
  CONTENT_KIND_HINTS,
  POPUP_TEXT_ALIGNS,
  TEXT_ALIGN_LABELS,
  POPUP_LIMITS,
  DEFAULT_POPUP_WIDTH_PX,
  DEFAULT_POPUP_SCALE,
} from "@/lib/popups";
export type {
  PopupPlacement,
  PopupFrequency,
  PopupSize,
  PopupContentLayout,
  PopupContentKind,
  PopupTextAlign,
} from "@/lib/popups";

/** Query params that make up the popups list's filter state. */
export const FILTER_KEYS = [
  "search",
  "placement",
  "frequency",
  "active",
  "page",
] as const;

/**
 * Build a `/admin/popups` URL that preserves the current list filters, so the
 * user returns to the same page/filters after creating or editing a popup.
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
  return `/admin/popups${qs ? `?${qs}` : ""}`;
}

/** The current filter query string for the given filter values. */
export function currentQuery(params: Record<string, string>): string {
  return buildBackHref(params).replace(/^\/admin\/popups/, "");
}
