/**
 * "Shorts Picks" content: short-form product videos (YouTube Shorts, TikTok,
 * Instagram Reels) shown on the home page.
 *
 * Like `products.ts`, this is a static (DB-free) data layer whose function
 * signatures mirror what a future database-backed implementation would return.
 * Swap the internals for Prisma queries later without touching the UI.
 */

export type ShortsPlatform = "youtube" | "tiktok" | "instagram";

export interface ShortsPick {
  id: string;
  /** Display title (usually the featured product name). */
  title: string;
  /**
   * Source URL for the short. Any of:
   *   YouTube Shorts  – youtube.com/shorts/{id}
   *   TikTok          – tiktok.com/@user/video/{id}
   *   Instagram Reel  – instagram.com/reel/{id}
   * The platform is auto-detected unless `platform` is set explicitly.
   */
  videoUrl: string;
  /** Uploaded video file URL (Vercel Blob). When set, renders a <video> instead of an embed. */
  videoFile?: string;
  /** Optional explicit platform. Auto-detected from `videoUrl` when omitted. */
  platform?: ShortsPlatform;
  /** Poster image shown before the video loads (e.g. the product image). */
  posterUrl?: string;
  /** Optional cached thumbnail override (e.g. a saved oembed thumbnail). */
  thumbnailUrl?: string;

  // Optional product link + meta shown in the bottom info bar.
  productHref?: string;
  productImage?: string;
  brand?: string;
  shortTags?: string[];
  priceCents?: number;
  currency?: string;

  // Admin controls.
  sortOrder: number;
  isActive: boolean;
}

export const shortsPicks: ShortsPick[] = [
  {
    id: "s1",
    title: "Prestige73 Teatree Mask 70g",
    videoUrl: "https://www.tiktok.com/@nowater_us/video/7621994499614559501",
    posterUrl: "/product/big/202607/d1537ec89bdd366be8532aa8cfd88af5.jpg",
    productHref: "/products/prestige73-teatree-mask-70g",
    productImage: "/product/big/202607/d1537ec89bdd366be8532aa8cfd88af5.jpg",
    brand: "NOWATER",
    shortTags: ["Soothing", "NaturallyDerived", "PoreCare"],
    priceCents: 210000,
    currency: "INR",
    sortOrder: 0,
    isActive: true,
  },
  {
    id: "s2",
    title: "No Pore Cleansing Oil",
    videoUrl: "https://www.tiktok.com/@nowater_us/video/7634338763455401246",
    posterUrl: "/product/big/202607/91cd52ec2b891f77901b173187b5d1f2.jpg",
    productHref: "/products/no-pore-cleansing-oil",
    productImage: "/product/big/202607/91cd52ec2b891f77901b173187b5d1f2.jpg",
    brand: "NOWATER",
    shortTags: ["DeepClean", "OilControl", "BlackheadCare"],
    priceCents: 177333,
    currency: "INR",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "s3",
    title: "T1 Prestige73 Collagen Mask 70g",
    videoUrl: "https://www.tiktok.com/@nowater_us/video/7626215536791162143",
    posterUrl: "/product/big/202607/2234414a17ece43b4c0bf7e0c5922cb6.jpg",
    productImage: "/product/big/202607/2234414a17ece43b4c0bf7e0c5922cb6.jpg",
    brand: "NOWATER",
    shortTags: ["CreamMask", "GlowBoost", "DeepHydration"],
    priceCents: 346667,
    currency: "INR",
    sortOrder: 2,
    isActive: true,
  },
];

/**
 * Active shorts ordered by admin sort order. Mirrors a future DB-backed
 * query (e.g. `SELECT * FROM shorts WHERE is_active ORDER BY sort_order`).
 */
export async function getShortsPicks(): Promise<ShortsPick[]> {
  return shortsPicks
    .filter((s) => s.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Default shorts items for a new Shorts section, projected from the original
 * static picks into the page-builder config shape.
 */
export const defaultShortsItems = shortsPicks.map((s) => ({
  id: s.id,
  title: s.title,
  videoUrl: s.videoUrl,
  posterUrl: s.posterUrl,
  productHref: s.productHref,
}));
