import { db } from "@/lib/db";
import type { ProductCardView } from "@/data/catalog";

/**
 * Database-backed product data layer. Replaces the previous static catalog so
 * the storefront reflects products managed from the admin dashboard. Function
 * signatures match the old layer, so the UI components need no changes.
 */

export type ProductCard = ProductCardView;

export interface ProductDetail extends ProductCardView {
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  variants: {
    id: string;
    optionLabel?: string;
    optionValue: string;
    sku: string;
    stock: number;
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
  priceCents: number;
  compareAtCents: number | null;
  currency: string;
  isPreOrder: boolean;
  preOrderNotice: string | null;
  images: string[];
  isActive: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  brand: { slug: string; name: string };
  variants: {
    id: string;
    optionLabel: string | null;
    optionValue: string;
    sku: string;
    stock: number;
  }[];
};

const include = {
  brand: { select: { slug: true, name: true } },
  variants: true,
} as const;

function toCard(p: ProductRow): ProductCard {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    summary: p.summary ?? undefined,
    shortTags: p.shortTags,
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents ?? undefined,
    currency: p.currency,
    isPreOrder: p.isPreOrder,
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
    seoTitle: p.seoTitle ?? undefined,
    seoDescription: p.seoDescription ?? undefined,
    variants: p.variants.map((v) => ({
      id: v.id,
      optionLabel: v.optionLabel ?? undefined,
      optionValue: v.optionValue,
      sku: v.sku,
      stock: v.stock,
    })),
  };
}

export async function getFeaturedProducts(
  take: number,
): Promise<ProductCard[]> {
  const rows = (await db.product.findMany({
    where: { isActive: true },
    take,
    orderBy: { createdAt: "desc" },
    include,
  })) as unknown as ProductRow[];
  return rows.map(toCard);
}

export async function getAvailableNow(take: number): Promise<ProductCard[]> {
  const rows = (await db.product.findMany({
    where: { isActive: true, isPreOrder: false },
    take,
    orderBy: { createdAt: "desc" },
    include,
  })) as unknown as ProductRow[];
  return rows.map(toCard);
}

export async function getPreOrderProducts(
  take: number,
): Promise<ProductCard[]> {
  const rows = (await db.product.findMany({
    where: { isActive: true, isPreOrder: true },
    take,
    orderBy: { createdAt: "desc" },
    include,
  })) as unknown as ProductRow[];
  return rows.map(toCard);
}

export async function getProductsByCategorySlug(
  slug: string,
  take: number,
): Promise<ProductCard[]> {
  const rows = (await db.product.findMany({
    where: { isActive: true, category: { slug } },
    take,
    orderBy: { createdAt: "desc" },
    include,
  })) as unknown as ProductRow[];
  return rows.map(toCard);
}

export async function getProductsByBrandSlug(
  slug: string,
  take: number,
): Promise<ProductCard[]> {
  const rows = (await db.product.findMany({
    where: { isActive: true, brand: { slug } },
    take,
    orderBy: { createdAt: "desc" },
    include,
  })) as unknown as ProductRow[];
  return rows.map(toCard);
}

/** Products matching the given slugs, preserving slug order (missing skipped). */
export async function getProductsBySlugs(
  slugs: string[],
): Promise<ProductCard[]> {
  if (slugs.length === 0) return [];
  const rows = (await db.product.findMany({
    where: { isActive: true, slug: { in: slugs } },
    include,
  })) as unknown as ProductRow[];
  const bySlug = new Map(rows.map((p) => [p.slug, p]));
  return slugs
    .map((s) => bySlug.get(s))
    .filter((p): p is ProductRow => Boolean(p))
    .map(toCard);
}

export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const row = (await db.product.findFirst({
    where: { slug, isActive: true },
    include,
  })) as unknown as ProductRow | null;
  return row ? toDetail(row) : null;
}
