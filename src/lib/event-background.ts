/**
 * How an event card's background image fills the card, in one place (client's
 * slide 6): the admin frames the uploaded artwork — where it focuses and how far
 * it is magnified — and the storefront renders exactly that. The card itself and
 * the admin's live preview both build their CSS from here, so an editor sees
 * what visitors get.
 */

/** One event card's background framing. */
export interface EventBackground {
  /** Focus point across, 0–100 (a percentage of the image, like object-position). */
  focusX: number;
  /** Focus point down, 0–100. */
  focusY: number;
  /** Magnification as a percentage; 100 is the plain cover the card always had. */
  zoom: number;
}

export const EVENT_BACKGROUND_DEFAULT: EventBackground = {
  focusX: 50,
  focusY: 50,
  zoom: 100,
};

export const EVENT_ZOOM_MIN = 100;
export const EVENT_ZOOM_MAX = 250;

/**
 * The widest the /event grid goes: the 1280px container less its 32px side
 * padding, less the 16px gap between the two columns, halved. Every admin
 * preview quotes this box, the same way the long-banner previews quote the strip
 * at its widest.
 */
export const EVENT_CARD_REFERENCE_WIDTH = 600;
/** The card's own corner (`rounded-2xl`). */
export const EVENT_CARD_RADIUS = 16;

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : NaN;
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(Math.round(n), min), max);
}

/**
 * The stored framing, repaired: a card saved before the tools existed (or with
 * an unusable value) falls back to the plain cover it used to render.
 */
export function eventBackground(
  input: Partial<EventBackground> | null | undefined,
): EventBackground {
  return {
    focusX: clamp(input?.focusX, 0, 100, EVENT_BACKGROUND_DEFAULT.focusX),
    focusY: clamp(input?.focusY, 0, 100, EVENT_BACKGROUND_DEFAULT.focusY),
    zoom: clamp(
      input?.zoom,
      EVENT_ZOOM_MIN,
      EVENT_ZOOM_MAX,
      EVENT_BACKGROUND_DEFAULT.zoom,
    ),
  };
}

/**
 * The CSS the card's artwork carries: it covers the whole card, anchored on the
 * focus point and magnified around that same point — so zooming never walks away
 * from what the admin picked. At 100% there is no transform at all, which keeps
 * an untouchted card byte-for-byte what it rendered before.
 */
export function eventBackgroundStyle(
  input: Partial<EventBackground> | null | undefined,
): { objectPosition: string; transform?: string; transformOrigin?: string } {
  const { focusX, focusY, zoom } = eventBackground(input);
  const style: {
    objectPosition: string;
    transform?: string;
    transformOrigin?: string;
  } = { objectPosition: `${focusX}% ${focusY}%` };
  if (zoom !== EVENT_BACKGROUND_DEFAULT.zoom) {
    style.transform = `scale(${zoom / 100})`;
    style.transformOrigin = `${focusX}% ${focusY}%`;
  }
  return style;
}

/**
 * A preview's scale: the reference card drawn at its real size, then scaled down
 * to whatever the panel is (never up — a preview larger than the page would
 * flatter it).
 */
export function eventCardPreviewScale(
  panelWidth: number,
  reference = EVENT_CARD_REFERENCE_WIDTH,
): number {
  if (!Number.isFinite(panelWidth) || panelWidth <= 0) return 1;
  return Math.min(1, panelWidth / reference);
}

/**
 * A drag across the card, in pixels, as a focus change: the pointer's travel
 * maps the focus over the card's full range, whatever the artwork's own size is.
 * Dragging right reveals what is to the left of the focus, like pushing a photo.
 */
export function nudgeFocus(
  current: number,
  deltaPx: number,
  reference = EVENT_CARD_REFERENCE_WIDTH,
): number {
  return clamp(current - (deltaPx / reference) * 100, 0, 100, current);
}
