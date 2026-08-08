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

export const POPUP_PLACEMENTS = ["center", "bottom"] as const;
export type PopupPlacement = (typeof POPUP_PLACEMENTS)[number];

export const PLACEMENT_LABELS: Record<PopupPlacement, string> = {
  center: "Center modal",
  bottom: "Bottom banner",
};

export const POPUP_FREQUENCIES = ["once", "every"] as const;
export type PopupFrequency = (typeof POPUP_FREQUENCIES)[number];

export const FREQUENCY_LABELS: Record<PopupFrequency, string> = {
  once: "Once per session",
  every: "Every visit",
};
