import { db } from "@/lib/db";
import type { ProductCardView } from "@/data/catalog";
import type { SiteVersion } from "@/lib/site-version";

/**
 * Database-backed product data layer. Replaces the previous static catalog so
 * the storefront reflects products managed from the admin dashboard. Function
 * signatures match the old layer, so the UI components need no changes.
 */

export type ProductCard = ProductCardView;

/** A single row of the INFO ("MORE INFORMATION") tab. */
export interface InfoRow {
  heading: string;
  body: string;
  /**
   * Whether this row shows on the storefront. Global-template rows are always
   * visible; per-product overrides can hide individual rows.
   */
  visible?: boolean;
}

/** A DETAIL-tab content block, as stored in `ProductBlock`. */
export interface ProductBlockView {
  id: string;
  type: string;
  title?: string;
  config: Record<string, unknown>;
  sortOrder: number;
}

export interface ProductDetail extends ProductCardView {
  description?: string;
  stock: number | null;
  seoTitle?: string;
  seoDescription?: string;
  /** Per-product INFO override; empty means "use the global template". */
  infoRows: InfoRow[];
  /**
   * Rows of the "Product Info" card under Buy Now (label | value). Edited per
   * product and independent of the INFO tab; empty hides the card.
   */
  buyInfoRows: InfoRow[];
  /** Ordered, active DETAIL blocks. */
  blocks: ProductBlockView[];
  /** Effective Buy Now flag: product override OR its brand's flag. */
  buyNowEnabled: boolean;
  variants: {
    id: string;
    optionLabel?: string;
    optionValue: string;
    sku: string;
    stock: number;
    /** Variant price override (falls back to the product price when unset). */
    priceCents?: number;
    /**
     * International-store variant price override, in INR like the local one.
     * Falls back to the product's global price (then the local chain) when unset.
     */
    globalPriceCents?: number;
    /** Option images: the first one leads the gallery for this option. */
    images: string[];
    /** Swatch colour (hex) for the option chip. */
    color?: string;
  }[];
}

/** Shape of a product row with its brand + variants relations. */
type ProductRow = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  shortTags: string[];
  description: string | null;
  stock: number | null;
  priceCents: number;
  compareAtCents: number | null;
  globalPriceCents: number | null;
  globalCompareAtCents: number | null;
  currency: string;
  isPreOrder: boolean;
  globalIsPreOrder: boolean;
  preOrderNotice: string | null;
  images: string[];
  isActive: boolean;
  globalIsActive: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  infoRows: unknown;
  buyInfoRows: unknown;
  buyNowEnabled: boolean;
  globalBuyNowEnabled: boolean;
  brand: {
    slug: string;
    name: string;
    buyNowEnabled: boolean;
  };
  variants: {
    id: string;
    optionLabel: string | null;
    optionValue: string;
    sku: string;
    stock: number;
    priceCents: number | null;
    globalPriceCents: number | null;
    images: string[];
    color: string | null;
    sortOrder: number;
  }[];
  // Only selected on the detail query (not on card lists).
  blocks?: {
    id: string;
    type: string;
    title: string | null;
    config: unknown;
    sortOrder: number;
  }[];
};

/** Shared relation set for card/list queries. */
const listInclude = {
  brand: {
    select: { slug: true, name: true, buyNowEnabled: true },
  },
  variants: true,
} as const;

/** Detail query additionally loads the active variants (in admin order) and the active DETAIL blocks. */
const detailInclude = {
  ...listInclude,
  variants: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" as const },
  },
  blocks: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" as const },
  },
} as const;

const include = listInclude;

function toCard(p: ProductRow): ProductCard {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    summary: p.summary ?? undefined,
    shortTags: p.shortTags,
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents ?? undefined,
    globalPriceCents: p.globalPriceCents ?? undefined,
    globalCompareAtCents: p.globalCompareAtCents ?? undefined,
    currency: p.currency,
    isActive: p.isActive,
    isPreOrder: p.isPreOrder,
    buyNowEnabled: p.buyNowEnabled,
    globalIsActive: p.globalIsActive,
    globalIsPreOrder: p.globalIsPreOrder,
    globalBuyNowEnabled: p.globalBuyNowEnabled,
    preOrderNotice: p.preOrderNotice ?? undefined,
    images: p.images,
    hoverImage: p.images[1] ?? p.images[0],
    brand: { slug: p.brand.slug, name: p.brand.name },
  };
}

function toDetail(p: ProductRow): ProductDetail {
  return {
    ...toCard(p),
    description: p.description ?? undefined,
    stock: p.stock,
    seoTitle: p.seoTitle ?? undefined,
    seoDescription: p.seoDescription ?? undefined,
    infoRows: parseInfoRows(p.infoRows),
    buyInfoRows: parseInfoRows(p.buyInfoRows),
    blocks: (p.blocks ?? []).map((b) => ({
      id: b.id,
      type: b.type,
      title: b.title ?? undefined,
      config: isRecord(b.config) ? b.config : {},
      sortOrder: b.sortOrder,
    })),
    buyNowEnabled: p.buyNowEnabled || p.brand.buyNowEnabled,
    variants: p.variants.map((v) => ({
      id: v.id,
      optionLabel: v.optionLabel ?? undefined,
      optionValue: v.optionValue,
      sku: v.sku,
      stock: v.stock,
      priceCents: v.priceCents ?? undefined,
      globalPriceCents: v.globalPriceCents ?? undefined,
      images: v.images,
      color: v.color ?? undefined,
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Coerce a stored JSON value (from `Product.infoRows` or a
 * `ProductInfoTemplate.blocks`) into a clean `InfoRow[]`. Tolerates malformed
 * or legacy data by dropping entries that aren't `{ heading, body }` strings.
 */
export function parseInfoRows(value: unknown): InfoRow[] {
  if (!Array.isArray(value)) return [];
  const rows: InfoRow[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const heading = typeof entry.heading === "string" ? entry.heading : "";
    const body = typeof entry.body === "string" ? entry.body : "";
    if (!heading && !body) continue;
    rows.push({ heading, body, visible: entry.visible !== false });
  }
  return rows;
}

/**
 * Storewide INFO blocks (payment / shipping / returns / inquiry). Products
 * without their own `infoRows` fall back to these.
 */
export async function getProductInfoTemplate(): Promise<InfoRow[]> {
  const row = await db.productInfoTemplate.findUnique({
    where: { key: "default" },
    select: { blocks: true },
  });
  return parseInfoRows(row?.blocks);
}

/**
 * The store's own "shown" filter, so a product hidden on one storefront never
 * reaches its listings while the other store keeps selling it.
 */
function shownWhere(version: SiteVersion) {
  return version === "global" ? { globalIsActive: true } : { isActive: true };
}

/** The store's own pre-order flag. */
function preOrderWhere(version: SiteVersion) {
  return version === "global"
    ? { globalIsPreOrder: true }
    : { isPreOrder: true };
}

/** The store's own buy-now flag. */
function buyNowWhere(version: SiteVersion) {
  return version === "global"
    ? { globalBuyNowEnabled: true }
    : { buyNowEnabled: true };
}

export async function getFeaturedProducts(
  take: number,
  version: SiteVersion,
): Promise<ProductCard[]> {
  const rows = (await db.product.findMany({
    where: shownWhere(version),
    take,
    orderBy: { createdAt: "desc" },
    include,
  })) as ProductRow[];
  return rows.map(toCard);
}

/** Products this store sells immediately (its own buy-now flag). */
export async function getAvailableNow(
  take: number,
  version: SiteVersion,
): Promise<ProductCard[]> {
  const rows = (await db.product.findMany({
    where: { ...shownWhere(version), ...buyNowWhere(version) },
    take,
    orderBy: { createdAt: "desc" },
    include,
  })) as ProductRow[];
  return rows.map(toCard);
}

/** Products this store sells as a pre-order (its own pre-order flag). */
export async function getPreOrderProducts(
  take: number,
  version: SiteVersion,
): Promise<ProductCard[]> {
  const rows = (await db.product.findMany({
    where: { ...shownWhere(version), ...preOrderWhere(version) },
    take,
    orderBy: { createdAt: "desc" },
    include,
  })) as ProductRow[];
  return rows.map(toCard);
}

export async function getProductsByCategorySlug(
  slug: string,
  take: number,
  version: SiteVersion,
): Promise<ProductCard[]> {
  const rows = (await db.product.findMany({
    where: { ...shownWhere(version), category: { slug } },
    take,
    orderBy: { createdAt: "desc" },
    include,
  })) as ProductRow[];
  return rows.map(toCard);
}

export async function getProductsByBrandSlug(
  slug: string,
  take: number,
  version: SiteVersion,
): Promise<ProductCard[]> {
  const rows = (await db.product.findMany({
    where: { ...shownWhere(version), brand: { slug } },
    take,
    orderBy: { createdAt: "desc" },
    include,
  })) as ProductRow[];
  return rows.map(toCard);
}

/**
 * Products matching the given slugs, preserving slug order (missing skipped).
 * Hidden-on-this-store products are dropped, so curated lists (triple banner,
 * page-builder sections) follow the store's own show flag.
 */
export async function getProductsBySlugs(
  slugs: string[],
  version: SiteVersion,
): Promise<ProductCard[]> {
  if (slugs.length === 0) return [];
  const rows = (await db.product.findMany({
    where: { ...shownWhere(version), slug: { in: slugs } },
    include,
  })) as ProductRow[];
  const bySlug = new Map(rows.map((p) => [p.slug, p]));
  return slugs
    .map((s) => bySlug.get(s))
    .filter((p): p is ProductRow => Boolean(p))
    .map(toCard);
}

/**
 * One product by slug, regardless of either store's show flag — the product
 * page resolves the request's store and 404s when it is hidden there
 * (`visibleForVersion`).
 */
export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const row = (await db.product.findFirst({
    where: { slug },
    include: detailInclude,
  })) as ProductRow | null;
  return row ? toDetail(row) : null;
}
