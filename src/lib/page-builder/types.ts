import { z } from "zod";
import { defaultHeroSlides } from "@/data/hero";
import { defaultInstagramItems } from "@/data/instagram";
import { defaultShortsItems } from "@/data/shorts";

/**
 * Shared page-builder types + config schemas.
 *
 * This module is intentionally free of server-only imports and React
 * components so it can be imported from both the server renderer/registry and
 * the client admin forms. The per-type renderers and data loaders live in
 * `registry.ts` (server); the per-type admin forms live in
 * `admin-registry.ts` (client).
 */

// ── Product source ──────────────────────────────────────────────────────────
// A section that shows products picks one of these sources. Each maps 1:1 to a
// data-layer function in `src/data/products.ts`.

export const productSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("featured"),
    take: z.number().int().min(1).max(50).default(4),
  }),
  z.object({
    kind: z.literal("pre-order"),
    take: z.number().int().min(1).max(50).default(20),
  }),
  z.object({
    kind: z.literal("available-now"),
    take: z.number().int().min(1).max(50).default(20),
  }),
  z.object({
    kind: z.literal("brand"),
    slug: z.string().min(1, "Choose a brand"),
    take: z.number().int().min(1).max(50).default(20),
  }),
  z.object({
    kind: z.literal("category"),
    slug: z.string().min(1, "Choose a category"),
    take: z.number().int().min(1).max(50).default(20),
  }),
  z.object({
    kind: z.literal("slugs"),
    slugs: z.array(z.string()).default([]),
  }),
]);
export type ProductSource = z.infer<typeof productSourceSchema>;

// ── Hero slide ──────────────────────────────────────────────────────────────

export const heroSlideSchema = z.object({
  id: z.string(),
  image: z.string().min(1, "Image is required"),
  title: z.string().optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  href: z.string().optional(),
  preorder: z.boolean().default(false),
  // When set, the slide is linked to a product so the editor can pre-fill
  // (and re-sync) image/name/link from it. The rendered fields above still act
  // as overrides the user can edit freely.
  productSlug: z.string().optional(),
});
export type HeroSlide = z.infer<typeof heroSlideSchema>;

// ── Showcase banner ─────────────────────────────────────────────────────────

/**
 * A promo banner above a product section (e.g. a brand's pair of campaign
 * images). "image" is the uploaded artwork as-is; "custom" adds a title and
 * subtitle in the lower-left corner over the image, so an admin can build a
 * banner from any upload.
 */
export const showcaseBannerSchema = z.object({
  id: z.string(),
  image: z.string().min(1, "Image is required"),
  href: z.string().optional(),
  title: z.string().optional(),
  sub: z.string().optional(),
  style: z.enum(["image", "custom"]).default("image"),
});
export type ShowcaseBanner = z.infer<typeof showcaseBannerSchema>;

// ── Tabbed showcase tab ─────────────────────────────────────────────────────

/**
 * One tab of the home "tabbed showcase": a category tab that swaps the panel
 * below it — a banner (linked to the brand or category) plus a curated product
 * row. The client's slide 5: click ①, ② changes to the corresponding content.
 */
export const showcaseTabSchema = z.object({
  id: z.string(),
  /** Tab label, e.g. "Brightening". */
  label: z.string().min(1, "Tab label is required"),
  image: z.string().default(""),
  alt: z.string().default(""),
  /** Banner headline drawn over the artwork. */
  title: z.string().default(""),
  /** Banner supporting line. */
  sub: z.string().default(""),
  /** Where the banner leads — usually the brand page. */
  href: z.string().default(""),
  productSlugs: z.array(z.string()).default([]),
});
export type ShowcaseTab = z.infer<typeof showcaseTabSchema>;

// ── Triple banner box ───────────────────────────────────────────────────────

export const tripleBannerBoxSchema = z.object({
  id: z.string(),
  image: z.string(),
  alt: z.string(),
  title: z.string(),
  sub: z.string(),
  /** Optional link the banner image opens. */
  href: z.string().default(""),
  productSlugs: z.array(z.string()),
});
export type TripleBannerBox = z.infer<typeof tripleBannerBoxSchema>;

// ── Shorts item ─────────────────────────────────────────────────────────────

export const shortItemSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  // Reel link (YouTube Shorts / TikTok / Instagram Reel) OR an uploaded file.
  videoUrl: z.string().optional(),
  videoFile: z.string().optional(),
  posterUrl: z.string().optional(),
  productHref: z.string().optional(),
  // Product info shown in the slide's bottom info bar (matches the original
  // shortsRoll itemWrap: thumbnail + name + brand + summary + price).
  productImage: z.string().optional(),
  brand: z.string().optional(),
  shortTags: z.array(z.string()).optional(),
  priceCents: z.number().optional(),
  currency: z.string().optional(),
});
export type ShortItem = z.infer<typeof shortItemSchema>;

// ── Instagram item ──────────────────────────────────────────────────────────

export const instagramItemSchema = z.object({
  id: z.string(),
  image: z.string().min(1, "Image is required"),
  alt: z.string().optional(),
  href: z.string().optional(),
});
export type InstagramItem = z.infer<typeof instagramItemSchema>;

// ── Per-type config schemas ────────────────────────────────────────────────

export const sectionConfigSchemas = {
  hero: z.object({
    slides: z.array(heroSlideSchema).default([]),
  }),
  // Unified product section: same heading + product cards, rendered as either
  // a wrapping grid or a scrolling carousel, with configurable columns.
  "product-showcase": z.object({
    sub: z.string().optional(),
    title: z.string().min(1, "Title is required"),
    source: productSourceSchema,
    layout: z.enum(["grid", "carousel"]).default("grid"),
    columns: z.number().int().min(1).max(6).default(5),
    // Grid layout only: how many rows may show before the "more" link takes
    // over. The loader caps the rendered items at `columns * rows`.
    rows: z.number().int().min(1).max(10).default(2),
    moreHref: z.string().optional(),
    moreLabel: z.string().optional(),
    // Up to three promo banners shown above the section (the client's brand
    // sections: two images side by side, or one full-width).
    banners: z.array(showcaseBannerSchema).max(3).default([]),
  }),
  shorts: z.object({
    items: z.array(shortItemSchema).default([]),
  }),
  "triple-banner": z.object({
    boxes: z.array(tripleBannerBoxSchema).default([]),
  }),
  "tabbed-showcase": z.object({
    tabs: z.array(showcaseTabSchema).default([]),
    columns: z.number().int().min(2).max(6).default(4),
    /** Banner height in pixels (the admin adjusts it, not a ratio). */
    height: z.number().int().min(80).max(1200).default(400),
    moreHref: z.string().optional(),
    moreLabel: z.string().optional(),
  }),
  "long-banner": z.object({
    // The banner blocks: each renders its own full-width carousel. A block
    // with nothing selected shows every active "long" banner, so the section
    // is never unexpectedly empty.
    rows: z
      .array(
        z.object({
          id: z.string(),
          bannerIds: z.array(z.string()).default([]),
        }),
      )
      .max(4)
      .default([]),
    // Legacy single selection from before the rows split; folded into the
    // first block when a stored section has no rows yet.
    bannerIds: z.array(z.string()).default([]),
  }),
  reviews: z.object({}),
  instagram: z.object({
    items: z.array(instagramItemSchema).default([]),
  }),
} as const;

export type SectionType = keyof typeof sectionConfigSchemas;

export type SectionConfig = {
  [K in SectionType]: z.infer<(typeof sectionConfigSchemas)[K]>;
}[SectionType];

// ── Section type metadata ───────────────────────────────────────────────────

export interface SectionTypeMeta {
  type: SectionType;
  label: string;
  description?: string;
  configSchema: z.ZodType;
  /** Fresh config for a newly added section of this type. */
  defaultConfig: () => unknown;
}

export const SECTION_TYPE_META: SectionTypeMeta[] = [
  {
    type: "hero",
    label: "Hero carousel",
    description: "Full-width hero slider with autoplay.",
    configSchema: sectionConfigSchemas.hero,
    defaultConfig: () => ({ slides: defaultHeroSlides }),
  },
  {
    type: "product-showcase",
    label: "Products",
    description: "Product grid or carousel with a heading.",
    configSchema: sectionConfigSchemas["product-showcase"],
    defaultConfig: () => ({
      sub: "",
      title: "New products",
      source: { kind: "featured", take: 8 },
      layout: "grid",
      columns: 5,
      rows: 2,
      banners: [],
    }),
  },
  {
    type: "shorts",
    label: "Shorts picks",
    description: "TikTok / Reels carousel.",
    configSchema: sectionConfigSchemas.shorts,
    defaultConfig: () => ({ items: defaultShortsItems }),
  },
  {
    type: "triple-banner",
    label: "Triple banner",
    description: "Banner panels with curated product rows.",
    configSchema: sectionConfigSchemas["triple-banner"],
    defaultConfig: () => ({ boxes: [] }),
  },
  {
    type: "tabbed-showcase",
    label: "Tabbed showcase",
    description:
      "Category tabs over a linked banner and a curated product row.",
    configSchema: sectionConfigSchemas["tabbed-showcase"],
    defaultConfig: () => ({
      tabs: [],
      columns: 4,
      height: 400,
      moreHref: "",
      moreLabel: "",
    }),
  },
  {
    type: "long-banner",
    label: "Long banner",
    description: "Full-width banner carousel from the Banners admin.",
    configSchema: sectionConfigSchemas["long-banner"],
    defaultConfig: () => ({
      rows: [{ id: "block-1", bannerIds: [] }],
      bannerIds: [],
    }),
  },
  {
    type: "reviews",
    label: "Reviews",
    description: "Real reviews carousel.",
    configSchema: sectionConfigSchemas.reviews,
    defaultConfig: () => ({}),
  },
  {
    type: "instagram",
    label: "Instagram",
    description: "Instagram marquee strip.",
    configSchema: sectionConfigSchemas.instagram,
    defaultConfig: () => ({ items: defaultInstagramItems }),
  },
];

export const SECTION_TYPE_META_BY_TYPE = Object.fromEntries(
  SECTION_TYPE_META.map((m) => [m.type, m]),
) as Record<SectionType, SectionTypeMeta>;

// ── Row shapes (shared by the server data layer and the client admin UI) ────

export interface PageSectionRow {
  id: string;
  type: string;
  title: string | null;
  config: unknown;
  sortOrder: number;
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
}

export interface PageRow {
  id: string;
  slug: string;
  title: string;
  isActive: boolean;
  sections: PageSectionRow[];
}
