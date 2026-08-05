/**
 * Catalog seed — brands, categories and a representative set of products.
 * Idempotent: upserts by unique slug so it can be re-run safely.
 *
 * Usage: npm run db:seed   (requires DATABASE_URL + applied migrations)
 */
import "dotenv/config";
import { db } from "../src/lib/db";

function image(label: string, color = "e7c6a0"): string {
  return `https://placehold.co/600x600/${color}/2a2a2a?text=${encodeURIComponent(label)}`;
}

type SeedProduct = {
  slug: string;
  brand: string; // brand slug
  category: string; // category slug
  name: string;
  summary: string;
  shortTags: string[];
  priceCents: number;
  isPreOrder: boolean;
  preOrderNotice?: string;
  variants?: { optionLabel: string; optionValue: string }[];
};

const brands: { slug: string; name: string; description?: string }[] = [
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
];

const categories = [
  { slug: "skin-care", name: "Skin Care" },
  { slug: "makeup", name: "Makeup" },
  { slug: "hair-care", name: "Hair Care" },
  { slug: "pre-order", name: "PRE-ORDER" },
];

const products: SeedProduct[] = [
  {
    slug: "brightening-vitamin-serum",
    brand: "nowater",
    category: "skin-care",
    name: "Brightening Vitamin Serum",
    summary: "Brightening · Dark spot care · Deep hydration",
    shortTags: ["Brightening", "DarkSpotCare", "DeepHydration"],
    priceCents: 180000,
    isPreOrder: false,
    variants: [
      { optionLabel: "Size", optionValue: "30ml" },
      { optionLabel: "Size", optionValue: "50ml" },
    ],
  },
  {
    slug: "return-collagen-cream",
    brand: "nowater",
    category: "skin-care",
    name: "Return Collagen Cream 50g",
    summary: "Firming · Plumping · Barrier care",
    shortTags: ["Firming", "Plumping", "BarrierCare"],
    priceCents: 160000,
    isPreOrder: false,
  },
  {
    slug: "prestige73-teatree-mask",
    brand: "nowater",
    category: "skin-care",
    name: "Prestige73 Teatree Mask 70g",
    summary: "Soothing · Naturally derived · Pore care",
    shortTags: ["Soothing", "NaturallyDerived", "PoreCare"],
    priceCents: 210000,
    isPreOrder: false,
  },
  {
    slug: "prestige-collagen-eye-cream",
    brand: "nowater",
    category: "skin-care",
    name: "Prestige Collagen Eye Cream 25ml",
    summary: "Brightening · Wrinkle care",
    shortTags: ["Brightening", "WrinkleCare"],
    priceCents: 90000,
    isPreOrder: false,
  },
  {
    slug: "peptide-volume-lifting-pro-essence-30ml",
    brand: "dr-pepti",
    category: "pre-order",
    name: "Peptide Volume Lifting Pro Essence 30ml",
    summary: "Lift & firm · Anti-aging · Smooth texture",
    shortTags: ["Lift&Firm", "Anti-Aging", "SmoothTexture"],
    priceCents: 266667,
    isPreOrder: true,
    preOrderNotice: "PRE-ORDER / Order now, ships later",
  },
  {
    slug: "centella-dark-spot-ampoule-pro",
    brand: "dr-pepti",
    category: "pre-order",
    name: "Centella Dark Spot Solution Ampoule Pro",
    summary: "Brightening · Soothing · Dark spot care",
    shortTags: ["Brightening", "Soothing", "DarkSpotCare"],
    priceCents: 193333,
    isPreOrder: true,
    preOrderNotice: "PRE-ORDER / Order now, ships later",
  },
  {
    slug: "blurring-slip-fit-lipcheek",
    brand: "hevvy-makeup",
    category: "makeup",
    name: "Blurring Slip Fit Lip & Cheek — Choose 1 of 6",
    summary: "Light fit · Smooth finish · Long lasting",
    shortTags: ["LightFit", "SmoothFinish", "LongLasting"],
    priceCents: 114000,
    isPreOrder: true,
    variants: [
      { optionLabel: "Shade", optionValue: "01" },
      { optionLabel: "Shade", optionValue: "02" },
      { optionLabel: "Shade", optionValue: "03" },
    ],
  },
  {
    slug: "gleaming-skin-cushion-v2",
    brand: "hevvy-makeup",
    category: "makeup",
    name: "Gleaming Skin Cushion V2",
    summary: "Hydrating · Radiant glow · Airy fit",
    shortTags: ["Hydrating", "RadiantGlow", "AiryFit"],
    priceCents: 253333,
    isPreOrder: true,
    preOrderNotice: "PRE-ORDER / Order now, ships later",
  },
  {
    slug: "cica-panthenol-soothing-cream",
    brand: "hearim",
    category: "skin-care",
    name: "Cica Panthenol Soothing Cream",
    summary: "Calms sensitive skin with cica and panthenol",
    shortTags: ["Sensitivity", "Soothing", "Moisture"],
    priceCents: 146667,
    isPreOrder: true,
  },
  {
    slug: "vegan-sun-cream",
    brand: "hyggee",
    category: "skin-care",
    name: "Vegan Sun Cream",
    summary: "Vegan · Hydration · Mild",
    shortTags: ["Vegan", "Hydration", "Mild"],
    priceCents: 153000,
    isPreOrder: false,
  },
  {
    slug: "aqua-protein-first-ampoule",
    brand: "lingcell",
    category: "skin-care",
    name: "Aqua Protein First Ampoule",
    summary: "Hydration · Mild · Low irritation",
    shortTags: ["Hydration", "AminoBlend", "ZeroIrritation"],
    priceCents: 186667,
    isPreOrder: true,
  },
  {
    slug: "hydrating-hyaluronic-mist",
    brand: "tenzero",
    category: "skin-care",
    name: "Hydrating Hyaluronic Mist",
    summary: "Hyaluronic · Mist · Hydration",
    shortTags: ["Hyaluronic", "Mist", "Hydration"],
    priceCents: 53333,
    isPreOrder: false,
  },
  {
    slug: "love-core-tatto-water-tint",
    brand: "moolda",
    category: "makeup",
    name: "Love Core Tatto Water Tint — Choose 1 of 20",
    summary: "Vivid · Long lasting · Kiss-proof",
    shortTags: ["Vivid", "Long-Lasting", "Kiss-Proof"],
    priceCents: 52667,
    isPreOrder: false,
    variants: [
      { optionLabel: "Shade", optionValue: "01" },
      { optionLabel: "Shade", optionValue: "05" },
      { optionLabel: "Shade", optionValue: "12" },
    ],
  },
  {
    slug: "time-melody-gold-collagen-ampoule",
    brand: "skin-apple",
    category: "pre-order",
    name: "TimeMelody Botocsilk Gold Collagen Firming Glow Ampoule",
    summary: "Firming · Glow · Collagen care",
    shortTags: ["Firming", "Glow", "CollagenCare"],
    priceCents: 166667,
    isPreOrder: true,
  },
];

async function main() {
  console.log("Seeding brands…");
  for (const brand of brands) {
    await db.brand.upsert({
      where: { slug: brand.slug },
      create: {
        ...brand,
        logoUrl: image(brand.name, "d9c7a7"),
        isActive: true,
      },
      update: { name: brand.name, description: brand.description },
    });
  }

  console.log("Seeding categories…");
  for (const category of categories) {
    await db.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: { name: category.name },
    });
  }

  console.log("Seeding products…");
  for (const product of products) {
    const brand = await db.brand.findUnique({ where: { slug: product.brand } });
    const category = await db.category.findUnique({
      where: { slug: product.category },
    });
    if (!brand || !category) {
      console.warn(`Skipping ${product.slug}: missing brand/category`);
      continue;
    }

    await db.product.upsert({
      where: { slug: product.slug },
      create: {
        slug: product.slug,
        brandId: brand.id,
        categoryId: category.id,
        name: product.name,
        summary: product.summary,
        shortTags: product.shortTags,
        priceCents: product.priceCents,
        currency: "INR",
        isPreOrder: product.isPreOrder,
        preOrderNotice: product.preOrderNotice,
        images: [image(product.name)],
        isActive: true,
      },
      update: {
        name: product.name,
        priceCents: product.priceCents,
        isPreOrder: product.isPreOrder,
      },
    });

    if (product.variants) {
      const record = await db.product.findUnique({
        where: { slug: product.slug },
      });
      if (record) {
        for (const [index, variant] of product.variants.entries()) {
          await db.productVariant.upsert({
            where: { sku: `${product.slug}-${index + 1}` },
            create: {
              productId: record.id,
              optionLabel: variant.optionLabel,
              optionValue: variant.optionValue,
              sku: `${product.slug}-${index + 1}`,
              stock: 50,
              isActive: true,
            },
            update: { optionValue: variant.optionValue },
          });
        }
      }
    }
  }

  console.log(
    `Done. ${brands.length} brands, ${categories.length} categories, ${products.length} products.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
