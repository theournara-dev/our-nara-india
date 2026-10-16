import { db } from "@/lib/db";
import type { ShowcaseBanner } from "@/lib/page-builder/types";
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
 * The all-pages block heights (stored on the site config, shared by both
 * stores — the category listings are the same store to store).
 */
export async function getCategoryPageDefaultHeights(
  version: SiteVersion,
): Promise<{ long: number; promo: number }> {
  const row = await db.siteConfig.findUnique({
    where: { version },
    select: { categoryLongBannerHeight: true, categoryPromoHeight: true },
  });
  return {
    long: row?.categoryLongBannerHeight ?? 0,
    promo: row?.categoryPromoHeight ?? 0,
  };
}

/**
 * The banners of one category page: the long banner (one banner per column, up
 * to three — the same strip the home page uses) and the single promo block.
 * Picked under Pages → Category pages; the component owns the placement, and a
 * banner with no category attached is an all-pages pick.
 */
export async function getCategoryPageBlocks(
  category: {
    id: string;
    pageBannersMode: string;
    hiddenBlocks: string[];
    longBannerHeight: number;
    promoHeight: number;
  },
  version: SiteVersion,
): Promise<CategoryPageBlocks> {
  const custom = category.pageBannersMode === "custom";
  const hidden = new Set(category.hiddenBlocks ?? []);
  const rows = await db.banner.findMany({
    where: {
      ...liveWindow(new Date()),
      // The page's own picks when it is customised, the all-pages ones otherwise.
      categoryId: custom ? category.id : null,
      placement: { in: ["category-long", "category-promo"] },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { ...BANNER_FIELDS, placement: true },
  });

  const of = (placement: string) =>
    rows.filter((b) => b.placement === placement).map(toLongBanner);
  const heights = custom
    ? { long: category.longBannerHeight, promo: category.promoHeight }
    : await getCategoryPageDefaultHeights(version);

  return {
    // The strip takes three columns at most; extra picks would be invisible.
    long: hidden.has("long") ? [] : of("category-long").slice(0, 3),
    promo: hidden.has("promo") ? null : (of("category-promo")[0] ?? null),
    longHeight: heights.long,
    promoHeight: heights.promo,
  };
}

/**
 * The /brands page's top row: up to two banners, side by side. When the admin
 * has picked specific banners (Site settings → Brands page) those ids win;
 * otherwise the legacy "brand-top" placement still applies.
 */
export async function getBrandTopBanners(
  ids?: string[],
): Promise<LongBanner[]> {
  const now = new Date();
  const explicit = ids && ids.length > 0;
  const rows = await db.banner.findMany({
    where: {
      ...liveWindow(now),
      ...(explicit ? { id: { in: ids } } : { placement: "brand-top" }),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: 2,
    select: BANNER_FIELDS,
  });
  if (explicit) {
    // Keep the admin's pick order rather than the database's.
    const byId = new Map(rows.map((b) => [b.id, b] as const));
    return (ids ?? [])
      .map((id) => byId.get(id))
      .filter((b): b is (typeof rows)[number] => Boolean(b))
      .map(toLongBanner);
  }
  return rows.map(toLongBanner);
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
