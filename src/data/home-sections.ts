/**
 * Home page brand product-grid sections. Each is a `grid5` product grid headed
 * by the brand name, reproducing the original theme's `listmain` brand sections
 * (10/13–21) shown after the long banner.
 *
 * Static, DB-free data layer — swap for Prisma later without touching the UI.
 */

export interface HomeBrandSection {
  slug: string;
  /** Small heading line above the brand title. */
  sub: string;
}

/** Brand sections in the original's display order. */
export const homeBrandSections: HomeBrandSection[] = [
  { slug: "nowater", sub: "PRODUCT" },
  { slug: "dr-pepti", sub: "PRE-ORDER PRODUCT" },
  { slug: "hevvy-makeup", sub: "PRE-ORDER PRODUCT" },
  { slug: "skin-apple", sub: "PRE-ORDER PRODUCT" },
  { slug: "hearim", sub: "PRE-ORDER PRODUCT" },
  { slug: "la-theorie", sub: "PRE-ORDER PRODUCT" },
  { slug: "hyggee", sub: "PRE-ORDER PRODUCT" },
  { slug: "lingcell", sub: "PRE-ORDER PRODUCT" },
  { slug: "tenzero", sub: "PRE-ORDER PRODUCT" },
  { slug: "moolda", sub: "PRE-ORDER PRODUCT" },
];
