import { PRODUCT_IMAGES } from "@/data/product-images";

/**
 * Static catalog mirroring the live OUR:NARA store.
 *
 * This is the source of truth for the frontend replica until the database /
 * importer are wired back in. Data (product names, prices, brands) is copied
 * from the live site. Images use placeholders so the build has no external
 * dependency; swap `images` for the real Cafe24 URLs later.
 */

export interface StaticBrand {
  slug: string;
  name: string;
  description?: string;
}

export interface StaticVariant {
  id: string;
  optionLabel?: string;
  optionValue: string;
  sku: string;
  stock: number;
}

export interface StaticProduct {
  id: string;
  slug: string;
  brandSlug: string;
  categorySlug: string;
  name: string;
  summary?: string;
  shortTags: string[];
  description?: string;
  priceCents: number;
  compareAtCents?: number;
  currency: string;
  isPreOrder: boolean;
  preOrderNotice?: string;
  images: string[];
  /** Optional second image (e.g. on-hover view). Falls back to images[0]. */
  hoverImage?: string;
  variants: StaticVariant[];
}

/** Card-shaped view of a product, matching what product components render. */
export interface ProductCardView {
  id: string;
  slug: string;
  name: string;
  summary?: string;
  shortTags: string[];
  priceCents: number;
  compareAtCents?: number;
  currency: string;
  isPreOrder: boolean;
  preOrderNotice?: string;
  images: string[];
  hoverImage?: string;
  brand: { slug: string; name: string };
}

function image(label: string, color = "e7c6a0"): string {
  return `https://placehold.co/600x600/${color}/2a2a2a?text=${encodeURIComponent(label)}`;
}

export const brands: StaticBrand[] = [
  {
    slug: "nowater",
    name: "NOWATER",
    description: "Waterless skincare focused on hydration and barrier care.",
  },
  {
    slug: "dr-pepti",
    name: "DR.PEPTI",
    description: "Peptide-powered anti-aging and pore care.",
  },
  {
    slug: "hevvy-makeup",
    name: "HEVVY MAKEUP",
    description: "Long-wearing, lightweight K-beauty makeup.",
  },
  {
    slug: "skin-apple",
    name: "SKIN APPLE",
    description: "Radiance and lifting ampoules.",
  },
  {
    slug: "hearim",
    name: "HE:ARIM",
    description: "Hydrogel masks and cica care.",
  },
  {
    slug: "la-theorie",
    name: "LA THEORIE",
    description: "Gentle, balanced skincare essentials.",
  },
  {
    slug: "hyggee",
    name: "HYGGEE",
    description: "Vegan, gentle cleansing and relief.",
  },
  {
    slug: "lingcell",
    name: "LINGCELL",
    description: "Aqua protein hydration line.",
  },
  {
    slug: "tenzero",
    name: "TENZERO",
    description: "Hydrating mists for every routine.",
  },
  {
    slug: "moolda",
    name: "MOOLDA",
    description: "Vivid, kiss-proof lip and blush tints.",
  },
  {
    slug: "fabyou",
    name: "FABYOU",
    description: "Overnight repair and retinol care.",
  },
];

export const categories = [
  { slug: "skin-care", name: "Skin Care" },
  { slug: "makeup", name: "Makeup" },
  { slug: "hair-care", name: "Hair Care" },
  { slug: "pre-order", name: "PRE-ORDER" },
] as const;

function variantsFor(
  productSlug: string,
  values: { label?: string; value: string }[],
) {
  return values.map((v, i) => ({
    id: `${productSlug}-${i + 1}`,
    optionLabel: v.label,
    optionValue: v.value,
    sku: `${productSlug}-${i + 1}`,
    stock: 50,
  }));
}

const pre = "PRE-ORDER / Order now, ships later";

export const products: StaticProduct[] = [
  // ── NOWATER ──────────────────────────────────────────────────────────────
  {
    id: "p-1",
    slug: "brightening-vitamin-serum",
    brandSlug: "nowater",
    categorySlug: "skin-care",
    name: "Brightening Vitamin Serum",
    summary: "Brightening · Dark spot care · Deep hydration",
    shortTags: ["Brightening", "DarkSpotCare", "DeepHydration"],
    priceCents: 180000,
    currency: "INR",
    isPreOrder: false,
    images: [image("Vitamin Serum")],
    hoverImage: image("Vitamin Serum", "d6c7ff"), // TODO: replace with the real on-hover image
    variants: variantsFor("brightening-vitamin-serum", [
      { label: "Size", value: "30ml" },
      { label: "Size", value: "50ml" },
    ]),
  },
  {
    id: "p-2",
    slug: "return-collagen-cream-50g",
    brandSlug: "nowater",
    categorySlug: "skin-care",
    name: "Return Collagen Cream 50g",
    summary: "Firming · Plumping · Barrier care",
    shortTags: ["Firming", "Plumping", "BarrierCare"],
    priceCents: 160000,
    currency: "INR",
    isPreOrder: false,
    images: [image("Collagen Cream")],
    hoverImage: image("Collagen Cream", "d6c7ff"), // TODO: replace with the real on-hover image
    variants: [],
  },
  {
    id: "p-30",
    slug: "skin-booster-collagen-mask-50g",
    brandSlug: "nowater",
    categorySlug: "pre-order",
    name: "Skin Booster Collagen Mask 50g",
    summary: "Low-Molecular · Low-Irritation · EWG Green",
    shortTags: ["LowMolecular", "LowIrritation", "EWGGreen"],
    priceCents: 212667,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Collagen Mask")],
    variants: [],
  },
  {
    id: "p-3",
    slug: "prestige73-teatree-mask-70g",
    brandSlug: "nowater",
    categorySlug: "skin-care",
    name: "Prestige73 Teatree Mask 70g",
    summary: "Soothing · Naturally derived · Pore care",
    shortTags: ["Soothing", "NaturallyDerived", "PoreCare"],
    priceCents: 210000,
    currency: "INR",
    isPreOrder: false,
    images: [image("Teatree Mask")],
    hoverImage: image("Teatree Mask", "d6c7ff"), // TODO: replace with the real on-hover image
    variants: [],
  },
  {
    id: "p-4",
    slug: "prestige-collagen-eye-cream-25ml",
    brandSlug: "nowater",
    categorySlug: "skin-care",
    name: "Prestige Collagen Eye Cream 25ml",
    summary: "Brightening · Wrinkle care",
    shortTags: ["Brightening", "WrinkleCare"],
    priceCents: 90000,
    currency: "INR",
    isPreOrder: false,
    images: [image("Eye Cream")],
    hoverImage: image("Eye Cream", "d6c7ff"), // TODO: replace with the real on-hover image
    variants: [],
  },
  {
    id: "p-5",
    slug: "no-pore-cleansing-oil",
    brandSlug: "nowater",
    categorySlug: "skin-care",
    name: "No Pore Cleansing Oil",
    summary: "Deep clean · Oil control · Blackhead care",
    shortTags: ["DeepClean", "OilControl", "BlackheadCare"],
    priceCents: 177333,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Cleansing Oil")],
    variants: [],
  },

  // ── DR.PEPTI ─────────────────────────────────────────────────────────────
  {
    id: "p-6",
    slug: "peptide-volume-lifting-pro-essence-30ml",
    brandSlug: "dr-pepti",
    categorySlug: "pre-order",
    name: "Peptide Volume Lifting Pro Essence 30ml",
    summary: "Lift & firm · Anti-aging · Smooth texture",
    shortTags: ["Lift&Firm", "Anti-Aging", "SmoothTexture"],
    priceCents: 266667,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Pro Essence 30ml")],
    variants: [],
  },
  {
    id: "p-7",
    slug: "peptide-volume-lifting-pro-essence-100ml",
    brandSlug: "dr-pepti",
    categorySlug: "pre-order",
    name: "Peptide Volume Lifting Pro Essence 100ml",
    summary: "Lift & firm · Anti-aging · Smooth texture",
    shortTags: ["Lift&Firm", "Anti-Aging", "SmoothTexture"],
    priceCents: 726667,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Pro Essence 100ml")],
    variants: [],
  },
  {
    id: "p-8",
    slug: "centella-dark-spot-solution-ampoule-pro",
    brandSlug: "dr-pepti",
    categorySlug: "pre-order",
    name: "Centella Dark Spot Solution Ampoule Pro",
    summary: "Brightening · Soothing · Dark spot care",
    shortTags: ["Brightening", "Soothing", "DarkSpotCare"],
    priceCents: 193333,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Centella Ampoule")],
    variants: [],
  },
  {
    id: "p-9",
    slug: "peptide-volume-neck-cream",
    brandSlug: "dr-pepti",
    categorySlug: "pre-order",
    name: "Peptide Volume Neck Cream",
    summary: "Gua sha · Firming · Anti-wrinkle",
    shortTags: ["GuaSha", "Firming", "Anti-Wrinkle"],
    priceCents: 246667,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Neck Cream")],
    variants: [],
  },

  // ── HEVVY MAKEUP ─────────────────────────────────────────────────────────
  {
    id: "p-10",
    slug: "blurring-slip-fit-lipcheek-choose-1-of-6",
    brandSlug: "hevvy-makeup",
    categorySlug: "makeup",
    name: "Blurring Slip Fit Lip & Cheek — Choose 1 of 6",
    summary: "Light fit · Smooth finish · Long lasting",
    shortTags: ["LightFit", "SmoothFinish", "LongLasting"],
    priceCents: 114000,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Lip Cheek")],
    variants: variantsFor("lipcheek", [
      { label: "Shade", value: "01" },
      { label: "Shade", value: "02" },
      { label: "Shade", value: "03" },
    ]),
  },
  {
    id: "p-11",
    slug: "first-stain-glow-tint-choose-1-of-10",
    brandSlug: "hevvy-makeup",
    categorySlug: "makeup",
    name: "First Stain Glow Tint — Choose 1 of 10",
    summary: "High shine · Moisturizing · Long lasting",
    shortTags: ["HighShine", "Moisturizing", "LongLasting"],
    priceCents: 114000,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Glow Tint")],
    variants: [],
  },
  {
    id: "p-12",
    slug: "gleaming-skin-cushion-v2",
    brandSlug: "hevvy-makeup",
    categorySlug: "makeup",
    name: "Gleaming Skin Cushion V2",
    summary: "Hydrating · Radiant glow · Airy fit",
    shortTags: ["Hydrating", "RadiantGlow", "AiryFit"],
    priceCents: 253333,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Skin Cushion")],
    variants: [],
  },

  // ── SKIN APPLE ───────────────────────────────────────────────────────────
  {
    id: "p-13",
    slug: "timemelody-gold-collagen-ampoule",
    brandSlug: "skin-apple",
    categorySlug: "pre-order",
    name: "TimeMelody Botocsilk Gold Collagen Firming Glow Ampoule",
    summary: "Firming · Glow · Collagen care",
    shortTags: ["Firming", "Glow", "CollagenCare"],
    priceCents: 166667,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Gold Collagen")],
    variants: [],
  },
  {
    id: "p-14",
    slug: "grasen-hyal-pdrn-lift-shot-ampoule",
    brandSlug: "skin-apple",
    categorySlug: "pre-order",
    name: "Grasen HYAL PDRN Radiance Lift Shot Ampoule",
    summary: "Hydrating · Radiance · Lifting",
    shortTags: ["Hydrating", "Radiance", "Lifting"],
    priceCents: 166667,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("PDRN Ampoule")],
    variants: [],
  },

  // ── HE:ARIM ──────────────────────────────────────────────────────────────
  {
    id: "p-15",
    slug: "calming-cica-hydrogel-mask",
    brandSlug: "hearim",
    categorySlug: "pre-order",
    name: "Calming Cica Hydrogel Mask",
    summary: "Microholes · Hydrogel · Soothing",
    shortTags: ["Microholes", "Hydrogel", "Soothing"],
    priceCents: 126667,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Cica Mask")],
    variants: [],
  },
  {
    id: "p-16",
    slug: "radiance-collagen-hydrogel-mask",
    brandSlug: "hearim",
    categorySlug: "pre-order",
    name: "Radiance Collagen Hydrogel Mask",
    summary: "Microholes · Hydrogel · Pore care",
    shortTags: ["Microholes", "Hydrogel", "PoreCare"],
    priceCents: 126667,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Collagen Mask")],
    variants: [],
  },
  {
    id: "p-17",
    slug: "cica-panthenol-soothing-cream",
    brandSlug: "hearim",
    categorySlug: "skin-care",
    name: "Cica Panthenol Soothing Cream",
    summary: "Sensitivity · Soothing · Moisture",
    shortTags: ["Sensitivity", "Soothing", "Moisture"],
    priceCents: 146667,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Cica Cream")],
    variants: [],
  },

  // ── LA THEORIE ───────────────────────────────────────────────────────────
  {
    id: "p-18",
    slug: "cream-hydrating-ingredients",
    brandSlug: "la-theorie",
    categorySlug: "pre-order",
    name: "Cream :: Hydrating Ingredients",
    summary: "Purification · Gentleness · Balance",
    shortTags: ["Purification", "Gentleness", "Balance"],
    priceCents: 166000,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Cream")],
    variants: [],
  },
  {
    id: "p-19",
    slug: "toner-soothing-treatment",
    brandSlug: "la-theorie",
    categorySlug: "pre-order",
    name: "Toner :: Soothing Treatment",
    summary: "Sebum control · Gentle care · Soothing",
    shortTags: ["SebumControl", "GentleCare", "Soothing"],
    priceCents: 112667,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Toner")],
    variants: [],
  },
  {
    id: "p-20",
    slug: "sunscreen-protection-factor",
    brandSlug: "la-theorie",
    categorySlug: "pre-order",
    name: "Sunscreen :: Protection Factor",
    summary: "UV protection · Anti-pigmentation · Anti-aging",
    shortTags: ["UV", "Anti-Pigmentation", "Anti-Aging"],
    priceCents: 132000,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Sunscreen")],
    variants: [],
  },

  // ── HYGGEE ───────────────────────────────────────────────────────────────
  {
    id: "p-21",
    slug: "vegan-sun-cream",
    brandSlug: "hyggee",
    categorySlug: "skin-care",
    name: "Vegan Sun Cream",
    summary: "Vegan · Hydration · Mild",
    shortTags: ["Vegan", "Hydration", "Mild"],
    priceCents: 153000,
    currency: "INR",
    isPreOrder: false,
    images: [image("Vegan Sun")],
    variants: [],
  },
  {
    id: "p-22",
    slug: "soft-reset-green-cleansing-balm",
    brandSlug: "hyggee",
    categorySlug: "skin-care",
    name: "Soft Reset Green Cleansing Balm",
    summary: "Cleansing · Sherbet · Moisture",
    shortTags: ["Cleansing", "Sherbet", "Moisture"],
    priceCents: 181333,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Cleansing Balm")],
    variants: [],
  },

  // ── LINGCELL ─────────────────────────────────────────────────────────────
  {
    id: "p-23",
    slug: "aqua-protein-first-ampoule",
    brandSlug: "lingcell",
    categorySlug: "pre-order",
    name: "Aqua Protein First Ampoule",
    summary: "Hydration · Amino blend · Zero irritation",
    shortTags: ["Hydration", "AminoBlend", "ZeroIrritation"],
    priceCents: 186667,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Protein Ampoule")],
    variants: [],
  },
  {
    id: "p-24",
    slug: "aqua-protein-cream",
    brandSlug: "lingcell",
    categorySlug: "pre-order",
    name: "Aqua Protein Cream",
    summary: "Fast hydration · Amino blend · Zero irritation",
    shortTags: ["FastHydration", "AminoBlend", "ZeroIrritation"],
    priceCents: 175333,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Protein Cream")],
    variants: [],
  },

  // ── TENZERO ──────────────────────────────────────────────────────────────
  {
    id: "p-25",
    slug: "hydrating-hyaluronic-mist",
    brandSlug: "tenzero",
    categorySlug: "skin-care",
    name: "Hydrating Hyaluronic Mist",
    summary: "Hyaluronic · Mist · Hydration",
    shortTags: ["Hyaluronic", "Mist", "Hydration"],
    priceCents: 53333,
    currency: "INR",
    isPreOrder: false,
    images: [image("HA Mist")],
    variants: [],
  },
  {
    id: "p-26",
    slug: "green-tangerine-vita-c-mist",
    brandSlug: "tenzero",
    categorySlug: "skin-care",
    name: "Green Tangerine Vita C Mist",
    summary: "Vitamin C · Mist · Hydration",
    shortTags: ["VitaC", "Mist", "Hydration"],
    priceCents: 53333,
    currency: "INR",
    isPreOrder: false,
    images: [image("Vita C Mist")],
    variants: [],
  },

  // ── MOOLDA ───────────────────────────────────────────────────────────────
  {
    id: "p-27",
    slug: "love-core-tatto-water-tint-choose-1-of-20",
    brandSlug: "moolda",
    categorySlug: "makeup",
    name: "Love Core Tatto Water Tint — Choose 1 of 20",
    summary: "Vivid · Long lasting · Kiss-proof",
    shortTags: ["Vivid", "Long-Lasting", "Kiss-Proof"],
    priceCents: 52667,
    currency: "INR",
    isPreOrder: false,
    images: [image("Water Tint")],
    variants: variantsFor("water-tint", [
      { label: "Shade", value: "01" },
      { label: "Shade", value: "05" },
      { label: "Shade", value: "12" },
    ]),
  },
  {
    id: "p-28",
    slug: "glow-dewy-tint-choose-1-of-10",
    brandSlug: "moolda",
    categorySlug: "makeup",
    name: "Glow Dewy Tint — Choose 1 of 10",
    summary: "Vivid · Glossy · Long lasting",
    shortTags: ["Vivid", "Glossy", "Long-Lasting"],
    priceCents: 39333,
    currency: "INR",
    isPreOrder: false,
    images: [image("Dewy Tint")],
    variants: [],
  },

  // ── FABYOU ───────────────────────────────────────────────────────────────
  {
    id: "p-29",
    slug: "stem-cell-peptide-retinol",
    brandSlug: "fabyou",
    categorySlug: "pre-order",
    name: "Stem Cell Peptide Retinol",
    summary: "Overnight repair for firmer, smoother skin",
    shortTags: ["Overnight", "Repair", "Barrier"],
    priceCents: 266667,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: [image("Retinol")],
    variants: [],
  },
];

// Attach the real product photos from the original site where available,
// falling back to the generated placeholder otherwise.
for (const product of products) {
  const real = PRODUCT_IMAGES[product.slug];
  if (real) product.images = [real];
}

// ── Lookups (used by the static data layer) ────────────────────────────────

const brandBySlug = new Map(brands.map((b) => [b.slug, b]));
const categoryBySlug = new Map<string, (typeof categories)[number]>(
  categories.map((c) => [c.slug, c]),
);

export function getBrand(slug: string): StaticBrand | undefined {
  return brandBySlug.get(slug);
}

export function getCategory(slug: string) {
  return categoryBySlug.get(slug);
}

export function toCardView(p: StaticProduct): ProductCardView {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    summary: p.summary,
    shortTags: p.shortTags,
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents,
    currency: p.currency,
    isPreOrder: p.isPreOrder,
    preOrderNotice: p.preOrderNotice,
    images: p.images,
    hoverImage: p.hoverImage,
    brand: {
      slug: p.brandSlug,
      name: getBrand(p.brandSlug)?.name ?? p.brandSlug,
    },
  };
}

export function productsByCategory(slug: string): StaticProduct[] {
  return products.filter((p) => p.categorySlug === slug);
}

export function productsByBrand(slug: string): StaticProduct[] {
  return products.filter((p) => p.brandSlug === slug);
}

/** Products matching the given slugs, in the given order (missing slugs skipped). */
export function productsBySlugs(slugs: string[]): StaticProduct[] {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((p): p is StaticProduct => Boolean(p));
}
