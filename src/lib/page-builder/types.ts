import { z } from "zod";

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

// ── Triple banner box ───────────────────────────────────────────────────────

export const tripleBannerBoxSchema = z.object({
  id: z.string(),
  image: z.string(),
  alt: z.string(),
  title: z.string(),
  sub: z.string(),
  productSlugs: z.array(z.string()),
});
export type TripleBannerBox = z.infer<typeof tripleBannerBoxSchema>;

// ── Per-type config schemas ────────────────────────────────────────────────

export const sectionConfigSchemas = {
  hero: z.object({}),
  "product-carousel": z.object({
    sub: z.string().optional(),
    title: z.string().min(1, "Title is required"),
    source: productSourceSchema,
  }),
  shorts: z.object({}),
  "triple-banner": z.object({
    boxes: z.array(tripleBannerBoxSchema).default([]),
  }),
  "product-grid": z.object({
    sub: z.string().optional(),
    title: z.string().min(1, "Title is required"),
    source: productSourceSchema,
    moreHref: z.string().optional(),
    moreLabel: z.string().optional(),
  }),
  "long-banner": z.object({}),
  reviews: z.object({}),
  instagram: z.object({}),
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
    defaultConfig: () => ({}),
  },
  {
    type: "product-carousel",
    label: "Product carousel",
    description: "Horizontal product slider with a heading.",
    configSchema: sectionConfigSchemas["product-carousel"],
    defaultConfig: () => ({
      sub: "",
      title: "New carousel",
      source: { kind: "featured", take: 4 },
    }),
  },
  {
    type: "shorts",
    label: "Shorts picks",
    description: "TikTok / Reels carousel.",
    configSchema: sectionConfigSchemas.shorts,
    defaultConfig: () => ({}),
  },
  {
    type: "triple-banner",
    label: "Triple banner",
    description: "Banner panels with curated product rows.",
    configSchema: sectionConfigSchemas["triple-banner"],
    defaultConfig: () => ({ boxes: [] }),
  },
  {
    type: "product-grid",
    label: "Product grid",
    description: "Responsive product grid with a heading.",
    configSchema: sectionConfigSchemas["product-grid"],
    defaultConfig: () => ({
      sub: "",
      title: "New grid",
      source: { kind: "featured", take: 4 },
    }),
  },
  {
    type: "long-banner",
    label: "Long banner",
    description: "Full-width banner carousel from the Banners admin.",
    configSchema: sectionConfigSchemas["long-banner"],
    defaultConfig: () => ({}),
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
    defaultConfig: () => ({}),
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
