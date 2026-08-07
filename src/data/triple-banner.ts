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
    productSlugs: [
      "brightening-vitamin-serum",
      "prestige-collagen-eye-cream-25ml",
    ],
  },
  {
    id: "t2",
    image: "/upload/goodymall1/en/main/prd_banner_02.jpg",
    alt: "Firm, plump and glow",
    title: "FIRM, PLUMP & GLOW",
    sub: "Collagen care for smoother, more elastic-looking skin.",
    productSlugs: ["return-collagen-cream-50g", "skin-booster-collagen-mask-50g"],
  },
  {
    id: "t3",
    image: "/upload/goodymall1/en/main/prd_banner__03.jpg",
    alt: "Lifting and anti-aging",
    title: "LIFTING · ANTI-AGING",
    sub: "Helps firm and smooth skin for a lifted, youthful look.",
    productSlugs: [
      "peptide-volume-lifting-pro-essence-30ml",
      "peptide-volume-lifting-pro-essence-100ml",
    ],
  },
];
