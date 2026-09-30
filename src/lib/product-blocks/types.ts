import { z } from "zod";

/**
 * Product DETAIL block registry — shared types + zod config schemas.
 *
 * Dependency-free (zod only) so it can be imported from both the server
 * renderer/data layer and the client admin editor. HTML sanitization happens
 * separately on the server (see `normalize.ts`); these schemas only validate
 * shape, ranges and enums.
 *
 * Mirrors the page-builder (`src/lib/page-builder/types.ts`) so the admin UX is
 * familiar and the storefront renderer can iterate blocks generically.
 */

const alignSchema = z.enum(["left", "center", "right"]).default("left");
const widthPct = (min = 10) => z.number().int().min(min).max(100).default(100);

export const blockConfigSchemas = {
  "rich-text": z.object({
    html: z.string().default(""),
    align: alignSchema,
    fontSize: z.enum(["sm", "base", "lg", "xl", "2xl"]).default("base"),
    maxWidth: z.number().int().min(20).max(100).default(100),
  }),
  image: z.object({
    src: z.string().default(""),
    alt: z.string().default(""),
    widthPct: widthPct(5),
    align: alignSchema,
    rounded: z.boolean().default(false),
    href: z.string().default(""),
    caption: z.string().default(""),
  }),
  "image-text": z.object({
    src: z.string().default(""),
    alt: z.string().default(""),
    text: z.string().default(""),
    imageSide: z.enum(["left", "right"]).default("left"),
    imageWidthPct: z.number().int().min(20).max(80).default(40),
  }),
  heading: z.object({
    text: z.string().default(""),
    level: z.enum(["h2", "h3", "h4"]).default("h2"),
    align: alignSchema,
  }),
  gallery: z.object({
    images: z.array(z.string()).default([]),
    columns: z.number().int().min(1).max(4).default(2),
    gap: z.number().int().min(0).max(40).default(8),
  }),
  video: z.object({
    url: z.string().default(""),
    widthPct: widthPct(20),
    align: alignSchema,
  }),
  button: z.object({
    label: z.string().default(""),
    href: z.string().default(""),
    align: alignSchema,
    variant: z.enum(["solid", "outline"]).default("solid"),
  }),
  divider: z.object({
    style: z.enum(["solid", "dashed", "dotted"]).default("solid"),
  }),
  spacer: z.object({
    height: z.number().int().min(4).max(200).default(24),
  }),
  accordion: z.object({
    items: z
      .array(
        z.object({
          q: z.string().default(""),
          a: z.string().default(""),
        }),
      )
      .default([]),
  }),
} as const;

export type BlockType = keyof typeof blockConfigSchemas;

export interface BlockTypeMeta {
  type: BlockType;
  label: string;
  description: string;
  configSchema: z.ZodType;
  defaultConfig: () => Record<string, unknown>;
}

export const BLOCK_TYPE_META: BlockTypeMeta[] = [
  {
    type: "rich-text",
    label: "Text",
    description: "Formatted text with headings, lists and links.",
    configSchema: blockConfigSchemas["rich-text"],
    defaultConfig: () => blockConfigSchemas["rich-text"].parse({ html: "" }),
  },
  {
    type: "image",
    label: "Image",
    description: "A single image with size and alignment.",
    configSchema: blockConfigSchemas.image,
    defaultConfig: () => blockConfigSchemas.image.parse({}),
  },
  {
    type: "image-text",
    label: "Image + text",
    description: "An image beside a block of text.",
    configSchema: blockConfigSchemas["image-text"],
    defaultConfig: () => blockConfigSchemas["image-text"].parse({}),
  },
  {
    type: "heading",
    label: "Heading",
    description: "A section heading.",
    configSchema: blockConfigSchemas.heading,
    defaultConfig: () => blockConfigSchemas.heading.parse({}),
  },
  {
    type: "gallery",
    label: "Gallery",
    description: "A grid of images.",
    configSchema: blockConfigSchemas.gallery,
    defaultConfig: () => blockConfigSchemas.gallery.parse({}),
  },
  {
    type: "accordion",
    label: "Accordion",
    description: "Collapsible question/answer pairs.",
    configSchema: blockConfigSchemas.accordion,
    defaultConfig: () => blockConfigSchemas.accordion.parse({}),
  },
  {
    type: "video",
    label: "Video",
    description: "An embedded video (YouTube/Vimeo URL).",
    configSchema: blockConfigSchemas.video,
    defaultConfig: () => blockConfigSchemas.video.parse({}),
  },
  {
    type: "button",
    label: "Button",
    description: "A call-to-action link.",
    configSchema: blockConfigSchemas.button,
    defaultConfig: () => blockConfigSchemas.button.parse({}),
  },
  {
    type: "divider",
    label: "Divider",
    description: "A horizontal rule.",
    configSchema: blockConfigSchemas.divider,
    defaultConfig: () => blockConfigSchemas.divider.parse({}),
  },
  {
    type: "spacer",
    label: "Spacer",
    description: "Vertical empty space.",
    configSchema: blockConfigSchemas.spacer,
    defaultConfig: () => blockConfigSchemas.spacer.parse({}),
  },
];

export const BLOCK_TYPE_META_BY_TYPE = Object.fromEntries(
  BLOCK_TYPE_META.map((m) => [m.type, m]),
) as Record<BlockType, BlockTypeMeta>;

/** A block as sent from the admin editor / stored in `ProductBlock.config`. */
export interface BlockDraft {
  id?: string;
  type: string;
  title?: string;
  config: Record<string, unknown>;
  isActive: boolean;
}
