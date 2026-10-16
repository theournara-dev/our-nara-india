import { z } from "zod";
import type { SiteVersion } from "@/lib/site-version";

/**
 * The category listings' blocks, as stored per store: the all-pages
 * configuration lives on the site config, and a page that does not follow it
 * keeps its own copy on the category row — both in this shape (client's slide
 * 4). The long banner and the promo hold banner *references*, so a banner can
 * be used in several places at once.
 */
export interface CategoryPageBlocksConfig {
  /** "default" follows the all-pages blocks, "custom" uses this page's own. */
  mode: "default" | "custom";
  /** Block keys hidden ("long", "promo"). */
  hidden: string[];
  /** Long banner picks, in column order (up to three). */
  long: string[];
  /** Strip height in pixels; 0 keeps each banner's own proportions. */
  longHeight: number;
  /** The promo banner; null when the block is empty. */
  promoId: string | null;
  /** Promo height in pixels; 0 keeps the artwork's own proportions. */
  promoHeight: number;
}

export const DEFAULT_CATEGORY_PAGE_BLOCKS: CategoryPageBlocksConfig = {
  mode: "default",
  hidden: [],
  long: [],
  longHeight: 0,
  promoId: null,
  promoHeight: 0,
};

/** What the admin writes for one store's blocks. */
export const categoryPageBlocksSchema = z.object({
  mode: z.enum(["default", "custom"]).default("default"),
  hidden: z
    .array(z.enum(["long", "promo"]))
    .default([])
    .transform((keys) => [...new Set(keys)]),
  long: z.array(z.string()).default([]),
  longHeight: z.coerce.number().int().min(0).max(600).default(0),
  promoId: z.string().nullish(),
  promoHeight: z.coerce.number().int().min(0).max(600).default(0),
});

const clamp = (value: unknown, max: number) => {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.min(Math.max(Math.round(n), 0), max);
};

/**
 * One store's stored blocks, repaired: the JSON on the row is whatever an admin
 * saved, so anything missing or unusable falls back to the defaults.
 */
export function categoryPageBlocksFor(
  stored: unknown,
  version: SiteVersion,
  fallback: CategoryPageBlocksConfig = DEFAULT_CATEGORY_PAGE_BLOCKS,
): CategoryPageBlocksConfig {
  const root =
    typeof stored === "object" && stored !== null && !Array.isArray(stored)
      ? (stored as Record<string, unknown>)
      : {};
  const slice = (root[version] ?? {}) as Record<string, unknown>;

  return {
    mode: slice.mode === "custom" ? "custom" : fallback.mode,
    hidden: Array.isArray(slice.hidden)
      ? slice.hidden.filter((k): k is string => typeof k === "string")
      : fallback.hidden,
    long: Array.isArray(slice.long)
      ? slice.long
          .filter((id): id is string => typeof id === "string" && id !== "")
          .slice(0, 3)
      : fallback.long,
    longHeight:
      slice.longHeight === undefined
        ? fallback.longHeight
        : clamp(slice.longHeight, 600),
    promoId:
      typeof slice.promoId === "string" && slice.promoId !== ""
        ? slice.promoId
        : slice.promoId === null
          ? null
          : fallback.promoId,
    promoHeight:
      slice.promoHeight === undefined
        ? fallback.promoHeight
        : clamp(slice.promoHeight, 600),
  };
}

/** The stored JSON with one store's slice replaced (the other is untouched). */
export function withCategoryPageBlocks(
  stored: unknown,
  version: SiteVersion,
  next: CategoryPageBlocksConfig,
): Record<string, CategoryPageBlocksConfig> {
  const root =
    typeof stored === "object" && stored !== null && !Array.isArray(stored)
      ? (stored as Record<string, unknown>)
      : {};
  const local =
    version === "local"
      ? next
      : categoryPageBlocksFor(root, "local", DEFAULT_CATEGORY_PAGE_BLOCKS);
  const global =
    version === "global"
      ? next
      : categoryPageBlocksFor(root, "global", DEFAULT_CATEGORY_PAGE_BLOCKS);
  return { local, global };
}
