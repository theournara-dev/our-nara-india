import { LONG_BANNER_NONE } from "@/lib/page-builder/types";

/**
 * The long banner's column rules, in one place (client's slide 3): the
 * storefront loader and the admin's live preview both call this, so what the
 * editor shows can never drift from what the page renders.
 *
 * Rules, in order:
 * - a column set to "none" shows nothing on purpose;
 * - a column with a picked banner shows that banner, provided it is still
 *   available (an unpublished or expired pick falls through to "automatic");
 * - every other column takes the next available banner no other column holds,
 *   in the pool's own order.
 */

export interface LongBannerSlot {
  id: string;
  /** Banner id, "" for automatic, or the "none" sentinel to hide the column. */
  bannerId: string;
}

/** A banner's id plus the columns it produced. */
export function resolveLongBannerCells<T extends { id: string }>(
  slots: LongBannerSlot[],
  pool: T[],
): { id: string; banner: T | null }[] {
  const claimed = new Set(
    slots
      .map((slot) => slot.bannerId)
      .filter((id): id is string => Boolean(id) && id !== LONG_BANNER_NONE),
  );
  const available = pool.filter((b) => !claimed.has(b.id));

  return slots.map((slot) => {
    if (slot.bannerId === LONG_BANNER_NONE)
      return { id: slot.id, banner: null };
    if (slot.bannerId) {
      const picked = pool.find((b) => b.id === slot.bannerId);
      return { id: slot.id, banner: picked ?? available.shift() ?? null };
    }
    return { id: slot.id, banner: available.shift() ?? null };
  });
}

/**
 * The stored slots of a section, normalised to its column count: sections saved
 * before the cell split carry a carousel selection, and lowering the column
 * count must not throw away the choices the hidden columns held.
 */
export function normalizeLongBannerSlots(
  config: {
    cells?: { id: string; bannerId?: string }[];
    bannerIds?: string[];
  },
  columns: number,
): LongBannerSlot[] {
  const stored =
    config.cells && config.cells.length > 0
      ? config.cells
      : (config.bannerIds ?? []).map((bannerId, i) => ({
          id: `cell-${i + 1}`,
          bannerId,
        }));
  return Array.from({ length: columns }, (_, i) =>
    stored[i]
      ? { id: stored[i].id, bannerId: stored[i].bannerId ?? "" }
      : { id: `cell-${i + 1}`, bannerId: "" },
  );
}

/** The columns a section should store: never fewer than the slots in use. */
export function growLongBannerSlots(
  slots: LongBannerSlot[],
  columns: number,
): LongBannerSlot[] {
  return Array.from(
    { length: Math.max(columns, slots.length) },
    (_, i) => slots[i] ?? { id: `cell-${i + 1}`, bannerId: "" },
  );
}

/**
 * The box one column gets at the widest the page goes. The strip sits in the
 * usual 92% / 1560px container with its own 8px padding, so the content column
 * is 1544px before the 10px gaps — that is the reference the admin previews
 * quote. Auto height keeps the artwork's own 2172 × 260 proportions, a pinned
 * height replaces them. The banner editor and the section form both quote these
 * boxes, so the two previews can never disagree.
 */
export const LONG_BANNER_CONTENT_WIDTH = 1544;
export const LONG_BANNER_GAP = 10;
export const LONG_BANNER_ART_RATIO = 2172 / 260;
/** The phone strip: the 96% container at a 390px phone, less its 8px padding. */
export const LONG_BANNER_PHONE_WIDTH = 358;
export const LONG_BANNER_PHONE_RATIO = 800 / 210;

export function longBannerCellBox(columns: number, height: number) {
  const width =
    (LONG_BANNER_CONTENT_WIDTH - LONG_BANNER_GAP * (columns - 1)) / columns;
  return {
    width: Math.round(width),
    height:
      height > 0
        ? Math.round(height)
        : Math.round(width / LONG_BANNER_ART_RATIO),
  };
}

/** The phone strip is one column wide, at the taller artwork's proportions. */
export function longBannerPhoneBox(height: number) {
  return {
    width: LONG_BANNER_PHONE_WIDTH,
    height:
      height > 0
        ? Math.round(height)
        : Math.round(LONG_BANNER_PHONE_WIDTH / LONG_BANNER_PHONE_RATIO),
  };
}
