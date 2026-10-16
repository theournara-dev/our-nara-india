import { db } from "@/lib/db";
import {
  categoryPageBlocksFor,
  type CategoryPageBlocksConfig,
} from "@/lib/category-page-blocks";
import type { ShowcaseBanner } from "@/lib/page-builder/types";
import type { BrandsPageContent } from "@/lib/site-content";
import type { SiteVersion } from "@/lib/site-version";

/**
 * Home page long banner content. Reproduces the original theme's
 * `longBanner01` section: a full-width, rounded banner carousel. Each banner
 * has a desktop and a mobile image (the theme swaps them responsively).
 *
 * Banners are managed from the admin dashboard (`/admin/banners`). If the DB
 * has no active long banners yet, we fall back to the original static list so
 * the homepage never regresses before content is created.
 */

export interface LongBanner {
  id: string;
  /** Admin label. */
  title?: string;
  /** Desktop image (wide). */
  image: string;
  /** Mobile image (taller aspect), swapped in on small screens. */
  mobileImage: string;
  alt: string;
  href?: string;
  /** What is drawn inside the banner (client's slide 3). */
  style?: string;
  heading?: string | null;
  subheading?: string | null;
  textAlign?: string;
  textVAlign?: string;
  textColor?: string | null;
  scrim?: boolean;
}

/** The columns every loader reads, so their mappings cannot drift apart. */
const BANNER_FIELDS = {
  id: true,
  title: true,
  image: true,
  mobileImage: true,
  alt: true,
  href: true,
  style: true,
  heading: true,
  subheading: true,
  textAlign: true,
  textVAlign: true,
  textColor: true,
  scrim: true,
} as const;

/** One banner row → the storefront shape. */
function toLongBanner(b: {
  id: string;
  title: string;
  image: string;
  mobileImage: string | null;
  alt: string | null;
  href: string | null;
  style: string;
  heading: string | null;
  subheading: string | null;
  textAlign: string;
  textVAlign: string;
  textColor: string | null;
  scrim: boolean;
}): LongBanner {
  return {
    id: b.id,
    title: b.title,
    image: b.image,
    mobileImage: b.mobileImage || b.image,
    alt: b.alt || b.title,
    href: b.href ?? undefined,
    style: b.style,
    heading: b.heading,
    subheading: b.subheading,
    textAlign: b.textAlign,
    textVAlign: b.textVAlign,
    textColor: b.textColor,
    scrim: b.scrim,
  };
}

/** Banners that are active and inside their optional schedule window. */
function liveWindow(now: Date) {
  return {
    isActive: true,
    OR: [{ startsAt: null }, { startsAt: { lte: now } }],
    AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }],
  };
}

/** Banners that are active and inside their optional schedule window. */
/**
 * The long banner's shape as configured on the home page — the banner editor
 * previews banners in exactly these boxes (client's slide 3). `height: 0` means
 * "keep the strip's own proportions", which is the 2172 × 260 artwork.
 */
export async function getLongBannerSettings(): Promise<{
  columns: number;
  height: number;
}> {
  const section = await db.pageSection.findFirst({
    where: { type: "long-banner", isActive: true, page: { slug: "home" } },
    orderBy: { sortOrder: "asc" },
    select: { config: true },
  });
  const config = (section?.config ?? {}) as {
    columns?: number;
    height?: number;
  };
  return {
    columns: Math.min(Math.max(config.columns ?? 2, 1), 3),
    height: Math.max(config.height ?? 0, 0),
  };
}

/**
 * Every banner that is not tied to a specific slot: the pool the components
 * that place banners themselves pick from (the long banner's cells and the
 * builder's banner pickers). Placement is no longer set on the banner record
 * (client's slide 3), so this deliberately ignores it.
 */
export async function getStandaloneBanners(): Promise<LongBanner[]> {
  const rows = await db.banner.findMany({
    where: liveWindow(new Date()),
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: BANNER_FIELDS,
  });
  return rows.map(toLongBanner);
}

/**
 * The blocks one category listing shows (client's slide 4). A page set to
 * "custom" uses its own picks and heights; every other page follows the
 * all-category-pages configuration — the same placements with no category
 * attached — minus the blocks that page hides on its own.
 */
export interface CategoryPageBlocks {
  long: LongBanner[];
  promo: LongBanner | null;
  /** Strip height in pixels; 0 keeps each banner's own proportions. */
  longHeight: number;
  /** Promo block height in pixels; 0 keeps the artwork's own proportions. */
  promoHeight: number;
}

/**
 * Every category page's blocks for one store (the all-pages configuration),
 * stored on that store's site config.
 */
export async function getCategoryAllPagesBlocks(
  version: SiteVersion,
): Promise<CategoryPageBlocksConfig> {
  const row = await db.siteConfig.findUnique({
    where: { version },
    select: {
      categoryLongBannerIds: true,
      categoryLongBannerHeight: true,
      categoryPromoBannerId: true,
      categoryPromoHeight: true,
    },
  });
  return {
    mode: "default",
    hidden: [],
    long: row?.categoryLongBannerIds ?? [],
    longHeight: row?.categoryLongBannerHeight ?? 0,
    promoId: row?.categoryPromoBannerId ?? null,
    promoHeight: row?.categoryPromoHeight ?? 0,
  };
}

/**
 * The banners of one category page: the long banner (one banner per column, up
 * to three — the same strip the home page uses) and the single promo block,
 * resolved for one store. A page either follows that store's all-pages blocks
 * or keeps its own — and either way it can hide a block on its own. Everything
 * is a reference, so a banner can be used here and elsewhere at once.
 */
export async function getCategoryPageBlocks(
  category: { pageBanners: unknown },
  version: SiteVersion,
): Promise<CategoryPageBlocks> {
  const allPages = await getCategoryAllPagesBlocks(version);
  const stored = categoryPageBlocksFor(category.pageBanners, version);
  const blocks: CategoryPageBlocksConfig =
    stored.mode === "custom"
      ? stored
      : {
          mode: "default",
          hidden: stored.hidden,
          long: allPages.long,
          longHeight: allPages.longHeight,
          promoId: allPages.promoId,
          promoHeight: allPages.promoHeight,
        };

  const hidden = new Set(blocks.hidden);
  // The strip takes three columns at most; extra picks would be invisible.
  const longIds = hidden.has("long") ? [] : blocks.long.slice(0, 3);
  const promoId = hidden.has("promo") ? null : blocks.promoId;

  const [longRows, promoRow] = await Promise.all([
    longIds.length === 0
      ? []
      : db.banner.findMany({
          where: { ...liveWindow(new Date()), id: { in: longIds } },
          select: BANNER_FIELDS,
        }),
    promoId
      ? db.banner.findFirst({
          where: { ...liveWindow(new Date()), id: promoId },
          select: BANNER_FIELDS,
        })
      : null,
  ]);

  // The picks are stored in the admin's order, which the query cannot know.
  const byId = new Map(longRows.map((b) => [b.id, b] as const));
  return {
    long: longIds
      .map((id) => byId.get(id))
      .filter((b) => b !== undefined)
      .map(toLongBanner),
    promo: promoRow ? toLongBanner(promoRow) : null,
    longHeight: blocks.longHeight,
    promoHeight: blocks.promoHeight,
  };
}

/**
 * The /brands page's own blocks (client's slide 6): the long banner between the
 * title and the group tabs — the same strip the category pages use — and the
 * promo block under it, which stays empty until a banner is picked. Both are
 * references, so a banner can sit here and on a category page at once.
 */
export async function getBrandsPageBlocks(content: BrandsPageContent): Promise<{
  long: LongBanner[];
  longHeight: number;
  promo: LongBanner | null;
  promoHeight: number;
}> {
  const ids = content.longBannerIds.slice(0, 3);
  const [longRows, promoRow] = await Promise.all([
    ids.length === 0
      ? []
      : db.banner.findMany({
          where: { ...liveWindow(new Date()), id: { in: ids } },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: BANNER_FIELDS,
        }),
    content.promoBannerId
      ? db.banner.findFirst({
          where: { ...liveWindow(new Date()), id: content.promoBannerId },
          select: BANNER_FIELDS,
        })
      : null,
  ]);

  // The picks are stored in the admin's order, which the query cannot know.
  const byId = new Map(longRows.map((b) => [b.id, b] as const));
  return {
    long: ids
      .map((id) => byId.get(id))
      .filter((b) => b !== undefined)
      .map(toLongBanner),
    longHeight: content.longBannerHeight,
    promo: promoRow ? toLongBanner(promoRow) : null,
    promoHeight: content.promoHeight,
  };
}

/**
 * The promo row above one brand's home section (client slides 5–6: NOWATER /
 * SKIN APPLE / HYGEE). The brand's own banner list in the page builder is the
 * usual way in; this placement stays for sections that point at the Banners
 * admin instead. Two banners share the row, a single one spans it, and nothing
 * renders when the brand has none.
 */
export async function getBrandSectionBanners(
  brandSlug: string,
): Promise<ShowcaseBanner[]> {
  const rows = await db.banner.findMany({
    where: {
      ...liveWindow(new Date()),
      placement: "brand-section",
      brand: { slug: brandSlug },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: 3,
  });
  return rows.map((b) => ({
    id: b.id,
    image: b.mobileImage || b.image,
    href: b.href ?? undefined,
    title: b.heading || b.title,
    alt: b.alt ?? b.heading ?? undefined,
    style: b.style === "custom" ? ("custom" as const) : ("image" as const),
    sub: b.subheading ?? undefined,
  }));
}
