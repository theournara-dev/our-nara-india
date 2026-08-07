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
    images: ["/product/big/202607/897d56d4173f800b07d425659cd53f54.jpg"],
    hoverImage: "/product/big/202607/897d56d4173f800b07d425659cd53f54.jpg", // TODO: replace with the real on-hover image
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
    images: ["/product/big/202607/52af7154d134bed9a28f0d53583bba3e.jpg"],
    hoverImage: "/product/big/202607/52af7154d134bed9a28f0d53583bba3e.jpg", // TODO: replace with the real on-hover image
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
    images: ["/product/big/202607/673b687aecfcefefd1698b28bce0867a.jpg"],
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
    images: ["/product/big/202607/d1537ec89bdd366be8532aa8cfd88af5.jpg"],
    hoverImage: "/product/big/202607/d1537ec89bdd366be8532aa8cfd88af5.jpg", // TODO: replace with the real on-hover image
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
    images: ["/product/big/202607/788d00c52907b78f839eb1aa3cf2cea4.jpg"],
    hoverImage: "/product/big/202607/788d00c52907b78f839eb1aa3cf2cea4.jpg", // TODO: replace with the real on-hover image
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
    images: ["/product/big/202607/91cd52ec2b891f77901b173187b5d1f2.jpg"],
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
    images: ["/product/big/202607/c29fe8cc9c8058c5b7c85f067779590b.jpg"],
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
    images: ["/product/big/202607/426b6497113eeb5b73cf211408850157.jpg"],
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
    images: ["/product/big/202607/f78dee177b89960e83ea53a7daa37e93.jpg"],
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
    images: ["/product/big/202607/07846889c6586ddf2b3a4a5a7e43cd8a.jpg"],
    variants: [],
  },
  {
    id: "p-31",
    slug: "centella-moist-soothing-gel-cream-ex",
    brandSlug: "dr-pepti",
    categorySlug: "pre-order",
    name: "Centella Moist Soothing Gel Cream EX",
    summary: "Calm · Cool · Brighten · Anti-wrinkle",
    shortTags: ["Calm", "Cool", "Brighten", "Anti-Wrinkle"],
    priceCents: 233333,
    currency: "INR",
    isPreOrder: true,
    preOrderNotice: pre,
    images: ["/product/big/202607/af01464dacb1ea5a40d5b705390f4e5f.jpg"],
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
    images: ["/product/big/202607/c5ab639dbd28d42930f0859ff8bf174d.jpg"],
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
    images: ["/product/big/202607/db6bc81e57d5514b32f997321524dc9b.jpg"],
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
    images: ["/product/big/202607/1e306810a38aad7b07fd35fd437d268a.jpg"],
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
    images: ["/product/big/202607/99b4cbdfe4164ce4f94d9b4f8135a071.jpg"],
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
    images: ["/product/big/202607/02428235c369b38c3582a02a33a54345.jpg"],
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
    images: ["/product/big/202607/cf3baffbae52c4cc9d176c6094d59eae.jpg"],
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
    images: ["/product/big/202607/d487b4053cef6cdcefbc498a30731007.jpg"],
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
    images: ["/product/big/202608/14f2a5478a9ca6597a4f6f27b428ec40.jpg"],
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
    images: ["/product/big/202607/ce2288b222167237420ab79ac734999f.jpg"],
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
    images: ["/product/big/202607/ebae0371596bd47a260b0dd8fac8a9bb.jpg"],
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
    images: ["/product/big/202607/75e89c931a62fe7ad00cec2612b917e2.jpg"],
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
    images: ["/product/big/202608/bd1356fb8bf414e96a87b47d26129072.jpg"],
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
    images: ["/product/big/202608/5f33ffc9edd18df3d25be0a88fc5f16c.jpg"],
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
    images: ["/product/big/202608/f787e350aae232cbfd4dcd558cb898a2.jpg"],
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
    images: ["/product/big/202608/86846747cc8a5c13c403056d4500ec5e.jpg"],
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
    images: ["/product/big/202608/184982ed9919070bab8fba52ae82377a.jpg"],
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
    images: ["/product/big/202608/b161cea7c212e4f6336154c0eeb6a52a.jpg"],
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
    images: ["/product/big/202608/16d8165240393fbee4550621474ccaad.jpg"],
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
    images: ["/product/big/202608/5c492f81339c5848cff374f7c6254b3d.jpg"],
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
  // Give every product a hover image. Prefer a real second shot when one is
  // explicitly set; otherwise reuse the (now real) primary image so the card
  // never flashes a placeholder. True per-product hover shots aren't imported
  // yet, so the crossfade stays on the same image in that case.
  if (!product.hoverImage) {
    product.hoverImage = product.images[0] ?? image(product.name, "d6c7ff");
  }
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
