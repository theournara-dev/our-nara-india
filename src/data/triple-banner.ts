/**
 * Home page "Triple Banner" content: 3 banner panels, each pairing a banner
 * image + heading with a curated product list. Mirrors the original theme's
 * `tripleBanner` section (listmain 3/4/5).
 *
 * Like the other content modules, this is a static (DB-free) data layer whose
 * shape mirrors what a future database-backed implementation would return.
 */
import type { ProductCard } from "@/data/products";

export interface TripleBannerBox {
  id: string;
  image: string;
  alt: string;
  title: string;
  sub: string;
  /** Optional link the banner image opens. */
  href?: string;
  /** Product slugs shown under the banner, in display order. */
  productSlugs: string[];
}

/** A box with its products resolved (see `getTripleBannerBoxes`). */
export interface ResolvedTripleBannerBox extends TripleBannerBox {
  products: ProductCard[];
}

export const tripleBannerBoxes: TripleBannerBox[] = [
  {
    id: "t1",
    image: "/upload/goodymall1/en/main/prd_banner_01.jpg",
    alt: "Brightening glow care",
    title: "BRIGHTENING GLOW CARE",
    sub: "For brighter, even-toned, radiant-looking skin.",
    href: "/brand/nowater",
    productSlugs: ["brightening-vitamin-serum", "prestige-collagen-eye-cream"],
  },
  {
    id: "t2",
    image: "/upload/goodymall1/en/main/prd_banner_02.jpg",
    alt: "Firm, plump and glow",
    title: "FIRM, PLUMP & GLOW",
    sub: "Collagen care for smoother, more elastic-looking skin.",
    href: "/brand/nowater",
    productSlugs: ["return-collagen-cream", "skin-booster-collagen-mask-50g"],
  },
  {
    id: "t3",
    image: "/upload/goodymall1/en/main/prd_banner__03.jpg",
    alt: "Lifting and anti-aging",
    title: "LIFTING · ANTI-AGING",
    sub: "Helps firm and smooth skin for a lifted, youthful look.",
    href: "/brand/dr-pepti",
    productSlugs: [
      "peptide-volume-lifting-pro-essence-30ml",
      "peptide-volume-lifting-pro-essence-100ml",
    ],
  },
];

/** Tab label + link for each box of the home "tabbed showcase" (slide 5). */
const TAB_META: Record<string, { label: string; href: string }> = {
  t1: { label: "Brightening", href: "/brand/nowater" },
  t2: { label: "Firm & Glow", href: "/brand/nowater" },
  t3: { label: "Lifting", href: "/brand/dr-pepti" },
};

export interface TripleBannerTab {
  id: string;
  label: string;
  image: string;
  alt: string;
  title: string;
  sub: string;
  href: string;
  productSlugs: string[];
}

/**
 * The three boxes as tabs of the page-builder "tabbed showcase" that replaced
 * the home triple banner: the tab row swaps the banner + curated product row.
 */
export const tripleBannerTabs: TripleBannerTab[] = tripleBannerBoxes.map(
  (box) => ({
    id: box.id,
    label: TAB_META[box.id]?.label ?? box.title,
    image: box.image,
    alt: box.alt,
    title: box.title,
    sub: box.sub,
    href: box.href ?? TAB_META[box.id]?.href ?? "",
    productSlugs: box.productSlugs,
  }),
);
