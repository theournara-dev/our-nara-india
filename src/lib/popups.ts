/**
 * Popup presentation rules, shared by the storefront host, the admin form and
 * its live preview. Pure and free of React so the queueing/timing rules can be
 * unit tested directly.
 *
 * Every popup stores its own layout (size / scale), timing (delay / auto-close)
 * and dismissal options (overlay, click-outside, "don't show again today");
 * these helpers turn the raw values into the numbers the components use.
 */

export const POPUP_PLACEMENTS = ["center", "bottom"] as const;
export type PopupPlacement = (typeof POPUP_PLACEMENTS)[number];

export const PLACEMENT_LABELS: Record<PopupPlacement, string> = {
  center: "Center modal",
  bottom: "Bottom banner",
};

export const POPUP_FREQUENCIES = ["once", "day", "every"] as const;
export type PopupFrequency = (typeof POPUP_FREQUENCIES)[number];

export const FREQUENCY_LABELS: Record<PopupFrequency, string> = {
  once: "Once per session",
  day: "Once a day",
  every: "Every visit",
};

export const FREQUENCY_HINTS: Record<PopupFrequency, string> = {
  once: "Shows once per browser session — a reload in a new session shows it again.",
  day: "Shows once every 24 hours per browser.",
  every: "Shows on every page load.",
};

export const POPUP_SIZES = ["sm", "md", "lg", "xl", "full", "custom"] as const;
export type PopupSize = (typeof POPUP_SIZES)[number];

/** Width presets in px, matching the card's rendered width. */
export const POPUP_SIZE_WIDTHS: Record<
  Exclude<PopupSize, "custom" | "full">,
  number
> = {
  sm: 360,
  md: 440,
  lg: 560,
  xl: 720,
};

export const SIZE_LABELS: Record<PopupSize, string> = {
  sm: "Small — 360px",
  md: "Medium — 440px",
  lg: "Large — 560px",
  xl: "Extra large — 720px",
  full: "Full screen",
  custom: "Custom width",
};

/** "full" fills the viewport instead of using a width. */
export function isFullScreenSize(size: string | null | undefined): boolean {
  return size === "full";
}

/** How the image and the text share the card. */
export const POPUP_CONTENT_LAYOUTS = ["auto", "image", "text"] as const;
export type PopupContentLayout = (typeof POPUP_CONTENT_LAYOUTS)[number];

export const CONTENT_LAYOUT_LABELS: Record<PopupContentLayout, string> = {
  auto: "Image above text",
  image: "Image only — fills the card",
  text: "Text only",
};

export const CONTENT_LAYOUT_HINTS: Record<PopupContentLayout, string> = {
  auto: "The image sits above the title, body and button.",
  image: "The image is the popup — title, body and button stay hidden.",
  text: "The image is not shown.",
};

/** Text alignment inside the card. */
export const POPUP_TEXT_ALIGNS = ["left", "center"] as const;
export type PopupTextAlign = (typeof POPUP_TEXT_ALIGNS)[number];

export const TEXT_ALIGN_LABELS: Record<PopupTextAlign, string> = {
  left: "Left",
  center: "Center",
};

/** Bounds the admin form and the server action both enforce. */
export const POPUP_LIMITS = {
  widthMin: 280,
  widthMax: 960,
  scaleMin: 50,
  scaleMax: 150,
  delayMax: 120,
  timeoutMax: 600,
  overlayOpacityMax: 90,
  imageHeightMin: 120,
  imageHeightMax: 1200,
} as const;

export const DEFAULT_POPUP_SIZE: PopupSize = "md";
export const DEFAULT_POPUP_WIDTH_PX = POPUP_SIZE_WIDTHS.md;
export const DEFAULT_POPUP_SCALE = 100;
export const DEFAULT_OVERLAY_OPACITY = 50;

export function isPopupSize(value: unknown): value is PopupSize {
  return POPUP_SIZES.includes(value as PopupSize);
}

export function isPopupFrequency(value: unknown): value is PopupFrequency {
  return POPUP_FREQUENCIES.includes(value as PopupFrequency);
}

export function isPopupPlacement(value: unknown): value is PopupPlacement {
  return POPUP_PLACEMENTS.includes(value as PopupPlacement);
}

/** Number or null: `Number(null)` is 0, which several helpers must not treat
 * as a real value. */
function toNumberOrNull(value: number | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function isPopupContentLayout(
  value: unknown,
): value is PopupContentLayout {
  return POPUP_CONTENT_LAYOUTS.includes(value as PopupContentLayout);
}

export function isPopupTextAlign(value: unknown): value is PopupTextAlign {
  return POPUP_TEXT_ALIGNS.includes(value as PopupTextAlign);
}

/**
 * The media box height in px, or null when the image keeps its own aspect
 * ratio (the default). A set height crops the image to fill the box.
 */
export function popupImageHeight(
  imageHeightPx: number | null | undefined,
): number | null {
  const raw = toNumberOrNull(imageHeightPx);
  if (raw == null || raw <= 0) return null;
  return Math.min(
    POPUP_LIMITS.imageHeightMax,
    Math.max(POPUP_LIMITS.imageHeightMin, Math.round(raw)),
  );
}

/**
 * The rendered width of a popup card: the preset for the chosen size, or the
 * stored custom width (clamped to the allowed range) when size is "custom".
 * For "full" the card fills the viewport, so the returned width is unused.
 */
export function popupWidthPx(
  size: string | null | undefined,
  widthPx: number | null | undefined,
): number {
  if (size === "custom") {
    // A missing/blank width falls back to the medium preset (note that
    // `Number(null)` is 0, which must not clamp down to the minimum).
    const raw = toNumberOrNull(widthPx);
    if (raw == null || raw <= 0) return DEFAULT_POPUP_WIDTH_PX;
    return Math.min(
      POPUP_LIMITS.widthMax,
      Math.max(POPUP_LIMITS.widthMin, Math.round(raw)),
    );
  }
  const preset = isPopupSize(size) ? size : DEFAULT_POPUP_SIZE;
  if (preset === "custom" || preset === "full") return DEFAULT_POPUP_WIDTH_PX;
  return POPUP_SIZE_WIDTHS[preset];
}

/** Clamp a stored scale (percent) into the allowed range. */
export function popupScale(scale: number | null | undefined): number {
  const raw = toNumberOrNull(scale);
  if (raw == null || raw <= 0) return DEFAULT_POPUP_SCALE;
  return Math.min(
    POPUP_LIMITS.scaleMax,
    Math.max(POPUP_LIMITS.scaleMin, Math.round(raw)),
  );
}

/** Clamp the overlay tint (percent, 0 = no dimming). */
export function popupOverlayOpacity(
  opacity: number | null | undefined,
): number {
  const raw = toNumberOrNull(opacity);
  if (raw == null) return DEFAULT_OVERLAY_OPACITY;
  return Math.min(POPUP_LIMITS.overlayOpacityMax, Math.max(0, Math.round(raw)));
}

/** The slice of a popup the queueing rules read. */
export interface QueueablePopup {
  id: string;
  frequency: string;
}

/** How long a "once a day" popup or a "don't show today" choice is honoured. */
export const POPUP_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether a popup should be shown now, given:
 *  - `alreadyShown`: ids already put on screen — this page load for "every"
 *    popups, this browser session for "once" ones (the host keeps both in one
 *    set),
 *  - `suppressedAt`: per-id timestamp of the last "don't show again today" click
 *    or last "once a day" display.
 */
export function isPopupDue(
  popup: QueueablePopup,
  alreadyShown: ReadonlySet<string>,
  suppressedAt: Readonly<Record<string, number>>,
  now: number,
): boolean {
  // Shown to this visitor already (this load, or this session for "once").
  if (alreadyShown.has(popup.id)) return false;
  if (popup.frequency === "day") {
    const at = suppressedAt[popup.id];
    return at == null || now - at >= POPUP_DAY_MS;
  }
  // "once" (per session) and "every" (per page load, filtered above) are due.
  return true;
}

/**
 * The next popup to show: the first queue entry that is due and wasn't already
 * shown, so a stack of active popups is shown one after another.
 */
export function nextDuePopup<T extends QueueablePopup>(
  queue: readonly T[],
  alreadyShown: ReadonlySet<string>,
  suppressedAt: Readonly<Record<string, number>>,
  now: number,
  skipId?: string,
): T | null {
  for (const popup of queue) {
    if (popup.id === skipId) continue;
    if (isPopupDue(popup, alreadyShown, suppressedAt, now)) return popup;
  }
  return null;
}
