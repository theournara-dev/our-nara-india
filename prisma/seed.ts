/**
 * Catalog seed — brands, categories and a representative set of products.
 * Idempotent: upserts by unique slug so it can be re-run safely.
 *
 * Usage: npm run db:seed   (requires DATABASE_URL + applied migrations)
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { Prisma } from "../src/generated/prisma/client";
import { homeBrandSections } from "../src/data/home-sections";
import { tripleBannerBoxes } from "../src/data/triple-banner";

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

  console.log("Seeding banners & popups…");
  // Content seeds are wiped and recreated on each run so re-seeding always
  // matches this baseline. Only the original long banner is active (keeps the
  // homepage visually identical); everything else ships inactive so you can
  // enable it from the admin dashboard (`/admin/banners`, `/admin/popups`).
  const banners = [
    {
      title: "OUR:NARA",
      placement: "long",
      image: "/upload/goodymall1/en/main/long__banner01.jpg",
      mobileImage: "/upload/goodymall1/en/main/m_long__banner01.jpg",
      alt: "OUR:NARA banner",
      href: "/",
      sortOrder: 0,
      isActive: true,
    },
    {
      title: "Sunscreen Edit · LA THEORIE",
      placement: "long",
      image: "/upload/goodymall1/en/main/main_box_img01_2.jpg",
      mobileImage: "/upload/goodymall1/en/main/main_box_img01_2.jpg",
      alt: "Sunscreen care from LA THEORIE",
      href: "/brand/la-theorie",
      sortOrder: 1,
      isActive: false,
    },
    {
      title: "Cica Panthenol Soothing Cream",
      placement: "long",
      image: "/upload/goodymall1/en/main/main_box_img02_1.jpg",
      mobileImage: "/upload/goodymall1/en/main/main_box_img02_1.jpg",
      alt: "Cica panthenol soothing cream from HE:ARIM",
      href: "/brand/hearim",
      sortOrder: 2,
      isActive: false,
    },
    {
      title: "Peptide Volume Master Essence",
      placement: "hero",
      image: "/upload/goodymall1/en/main/main_box_img03_1.jpg",
      mobileImage: null,
      alt: "Peptide volume master essence from DR.PEPTI",
      href: "/brand/dr-pepti",
      sortOrder: 0,
      isActive: false,
    },
    {
      title: "Stem Cell Peptide Retinol",
      placement: "hero",
      image: "/upload/goodymall1/en/main/main_box_img04_1.jpg",
      mobileImage: null,
      alt: "Stem cell peptide retinol from FABYOU",
      href: "/brand/fabyou",
      sortOrder: 1,
      isActive: false,
    },
    {
      title: "Brightening Glow Care",
      placement: "triple",
      image: "/upload/goodymall1/en/main/prd_banner_01.jpg",
      mobileImage: null,
      alt: "Brightening glow care",
      href: "/category/skin-care",
      sortOrder: 0,
      isActive: false,
    },
    {
      title: "Firm, Plump & Glow",
      placement: "triple",
      image: "/upload/goodymall1/en/main/prd_banner_02.jpg",
      mobileImage: null,
      alt: "Collagen care for firmer-looking skin",
      href: "/category/skin-care",
      sortOrder: 1,
      isActive: false,
    },
    {
      title: "Lifting · Anti-Aging",
      placement: "triple",
      image: "/upload/goodymall1/en/main/prd_banner__03.jpg",
      mobileImage: null,
      alt: "Lifting and anti-aging care",
      href: "/category/pre-order",
      sortOrder: 2,
      isActive: false,
    },
  ];

  const popups = [
    {
      title: "Welcome to OUR:NARA",
      body: "Create your account to get 10% off your first order and earn Mileage on every purchase.",
      image: null,
      ctaLabel: "Join now",
      ctaHref: "/join",
      placement: "center",
      frequency: "once",
      isActive: false,
    },
    {
      title: "Pre-orders now open",
      body: "Order now, ships later. Pre-orders are billed at checkout and dispatched when stock arrives.",
      image: null,
      ctaLabel: "Shop pre-orders",
      ctaHref: "/category/pre-order",
      placement: "center",
      frequency: "once",
      isActive: false,
    },
    {
      title: "Worldwide shipping",
      body: "We ship from India & Korea to customers worldwide.",
      image: null,
      ctaLabel: "Shop now",
      ctaHref: "/",
      placement: "bottom",
      frequency: "every",
      isActive: false,
    },
    {
      title: "Summer Glow Event",
      body: "Brightening and glow-boosting picks for warmer days.",
      image: "/upload/goodymall1/en/main/prd_banner_01.jpg",
      ctaLabel: "Shop now",
      ctaHref: "/search",
      placement: "center",
      frequency: "once",
      isActive: false,
    },
  ];

  await db.banner.deleteMany({});
  await db.banner.createMany({ data: banners });
  await db.popup.deleteMany({});
  await db.popup.createMany({ data: popups });

  console.log("Seeding home page…");
  await seedHomePage();

  console.log(
    `Done. ${brands.length} brands, ${categories.length} categories, ${products.length} products, ${banners.length} banners, ${popups.length} popups.`,
  );
}

/**
 * Seed the `home` Page with the original homepage's sections, in order, so the
 * page builder reflects the real structure and edits are meaningful. Idempotent:
 * the page is upserted and its sections are wiped + recreated on each run.
 */
async function seedHomePage() {
  const brandRows = await db.brand.findMany();
  const brandName = new Map(brandRows.map((b) => [b.slug, b.name]));

  const preOrderSlugs = [
    "centella-dark-spot-solution-ampoule-pro",
    "peptide-volume-neck-cream",
    "peptide-volume-lifting-pro-essence-30ml",
    "centella-moist-soothing-gel-cream-ex",
    "peptide-volume-lifting-pro-essence-100ml",
  ];

  const sections = [
    { type: "hero", title: "Hero carousel", config: {} },
    {
      type: "product-carousel",
      title: "Top Picks",
      config: {
        sub: "TOP PICKS",
        title: "BEST PRODUCT",
        source: { kind: "featured", take: 4 },
      },
    },
    { type: "shorts", title: "Shorts Picks", config: {} },
    {
      type: "triple-banner",
      title: "Triple banner",
      config: { boxes: tripleBannerBoxes },
    },
    {
      type: "product-grid",
      title: "PRE-ORDER",
      config: {
        sub: "AVAILABLE NOW",
        title: "PRE-ORDER",
        source: { kind: "slugs", slugs: preOrderSlugs },
        moreHref: "/category/pre-order",
      },
    },
    { type: "long-banner", title: "Long banner", config: {} },
    ...homeBrandSections.map((s) => ({
      type: "product-grid",
      title: brandName.get(s.slug) ?? s.slug,
      config: {
        sub: s.sub,
        title: brandName.get(s.slug) ?? s.slug,
        source: { kind: "brand", slug: s.slug, take: 20 },
        moreHref: `/brand/${s.slug}`,
      },
    })),
    { type: "reviews", title: "Reviews", config: {} },
    { type: "instagram", title: "Instagram", config: {} },
  ];

  const page = await db.page.upsert({
    where: { slug: "home" },
    create: { slug: "home", title: "Home", isActive: true },
    update: { title: "Home", isActive: true },
  });
  await db.pageSection.deleteMany({ where: { pageId: page.id } });
  await db.pageSection.createMany({
    data: sections.map((s, i) => ({
      pageId: page.id,
      type: s.type,
      title: s.title,
      config: s.config as Prisma.InputJsonValue,
      sortOrder: i,
      isActive: true,
    })),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
