import { db } from "@/lib/db";
import type { SiteVersion } from "@/lib/site-version";

/**
 * Category data layer. Categories are managed in the admin (/admin/categories)
 * as a two-level tree: roots (Skin Care, Makeup, …) and their mid-level
 * categories (Masks & Patches, Facial Care, …). Products keep a root in
 * `Product.categoryId` and sit in 0..n mid-level categories through
 * `ProductSubcategory`, so the storefront reads both from here.
 */

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  parentId: string | null;
  image: string | null;
  isActive: boolean;
  /** "default" follows the all-pages blocks, "custom" uses this page's own. */
  pageBannersMode: string;
  /** Block keys this page hides while it follows the all-pages setting. */
  hiddenBlocks: string[];
  /** Custom long banner height; 0 keeps each banner's own proportions. */
  longBannerHeight: number;
  /** Custom promo block height; 0 keeps the artwork's own proportions. */
  promoHeight: number;
}

/** A mid-level category as the listing shows it: tile image + product count. */
export interface CategoryTab {
  id: string;
  slug: string;
  name: string;
  /** Tile artwork; empty renders the name alone. */
  image: string | null;
  /** Products the browsing store lists in this mid-level category. */
  count: number;
}

/** A root category and its mid-level children, as the header nav needs them. */
export interface NavCategory {
  slug: string;
  name: string;
  children: { slug: string; name: string }[];
}

const CATEGORY_SELECT = {
  id: true,
  slug: true,
  name: true,
  sortOrder: true,
  parentId: true,
  image: true,
  isActive: true,
  pageBannersMode: true,
  hiddenBlocks: true,
  longBannerHeight: true,
  promoHeight: true,
} as const;

/** The store's own "shown" filter, mirroring `src/data/products.ts`. */
function shownWhere(version: SiteVersion) {
  return version === "global" ? { globalIsActive: true } : { isActive: true };
}

/** Active root categories, in admin order. */
export async function getRootCategories(): Promise<CategorySummary[]> {
  return (await db.category.findMany({
    where: { parentId: null, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: CATEGORY_SELECT,
  })) as CategorySummary[];
}

/** Every category row, roots first. Used by the sitemap and the admin. */
export async function getAllCategories(): Promise<CategorySummary[]> {
  return (await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: CATEGORY_SELECT,
  })) as CategorySummary[];
}

export async function getCategoryBySlug(
  slug: string,
): Promise<CategorySummary | null> {
  return (await db.category.findUnique({
    where: { slug },
    select: CATEGORY_SELECT,
  })) as CategorySummary | null;
}

export async function getCategoryById(
  id: string,
): Promise<CategorySummary | null> {
  return (await db.category.findUnique({
    where: { id },
    select: CATEGORY_SELECT,
  })) as CategorySummary | null;
}

/** Mid-level categories of a root, in admin order (individual rows). */
export async function getChildCategories(
  parentId: string,
): Promise<CategorySummary[]> {
  return (await db.category.findMany({
    where: { parentId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: CATEGORY_SELECT,
  })) as CategorySummary[];
}

/**
 * The mid-level categories a category page shows, each with the number of
 * products the browsing store lists there. Mid-level categories without a
 * product are dropped, so a tab never leads to an empty listing.
 *
 * Pseudo-categories (PRE-ORDER) have no children of their own — their tabs are
 * the mid-level categories their products actually carry, so nothing has to be
 * maintained twice.
 */
export async function getCategoryTabs(
  categorySlug: string,
  version: SiteVersion,
): Promise<CategoryTab[]> {
  const root = await db.category.findUnique({
    where: { slug: categorySlug },
    select: { id: true },
  });
  if (!root) return [];

  const children = await getChildCategories(root.id).then((rows) =>
    rows.filter((c) => c.isActive),
  );

  if (children.length > 0) {
    const counts = await countBySubcategory(
      children.map((c) => c.id),
      version,
    );
    return children
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        image: c.image,
        count: counts.get(c.id) ?? 0,
      }))
      .filter((tab) => tab.count > 0);
  }

  // Derived tabs: the mid-level categories this category's own products carry.
  const links = await db.productSubcategory.findMany({
    where: {
      product: { ...shownWhere(version), categoryId: root.id },
      category: { parentId: { not: null }, isActive: true },
    },
    select: {
      category: { select: CATEGORY_SELECT },
    },
  });

  const byId = new Map<string, CategoryTab>();
  for (const link of links) {
    const c = link.category as CategorySummary;
    const existing = byId.get(c.id);
    if (existing) existing.count += 1;
    else
      byId.set(c.id, {
        id: c.id,
        slug: c.slug,
        name: c.name,
        image: c.image,
        count: 1,
      });
  }
  return [...byId.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug),
  );
}

/** Product counts per mid-level category, for one store. */
async function countBySubcategory(
  categoryIds: string[],
  version: SiteVersion,
): Promise<Map<string, number>> {
  if (categoryIds.length === 0) return new Map();
  const links = await db.productSubcategory.findMany({
    where: { categoryId: { in: categoryIds }, product: shownWhere(version) },
    select: { categoryId: true },
  });
  const counts = new Map<string, number>();
  for (const link of links) {
    counts.set(link.categoryId, (counts.get(link.categoryId) ?? 0) + 1);
  }
  return counts;
}

/**
 * Roots and their mid-level children for the header nav, so a category the
 * admin adds appears in the menu without a deploy. A root without children
 * (PRE-ORDER) lists the mid-level categories its products carry.
 */
export async function getCategoryNav(): Promise<NavCategory[]> {
  const rows = await db.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, parentId: true },
  });
  const roots = rows.filter((r) => r.parentId === null);

  const nav: NavCategory[] = [];
  for (const root of roots) {
    const own = rows.filter((r) => r.parentId === root.id);
    if (own.length > 0) {
      nav.push({
        slug: root.slug,
        name: root.name,
        children: own.map((c) => ({ slug: c.slug, name: c.name })),
      });
      continue;
    }
    // Derived menu for pseudo-categories (PRE-ORDER): the mid-level categories
    // its products carry, in one query.
    const links = await db.productSubcategory.findMany({
      where: {
        product: { categoryId: root.id },
        category: { parentId: { not: null }, isActive: true },
      },
      select: {
        category: { select: { slug: true, name: true, sortOrder: true } },
      },
      distinct: ["categoryId"],
    });
    nav.push({
      slug: root.slug,
      name: root.name,
      children: links
        .map((l) => l.category)
        .sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        )
        .map((c) => ({ slug: c.slug, name: c.name })),
    });
  }
  return nav;
}
