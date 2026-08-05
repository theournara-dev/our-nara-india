import {
  products,
  productsByBrand,
  productsByCategory,
  toCardView,
  type ProductCardView,
  type StaticProduct,
} from "@/data/catalog";

/**
 * Static (DB-free) product data layer. Function signatures match the previous
 * database-backed layer so the storefront pages need no changes. Swap the
 * implementations for Prisma queries later without touching the UI.
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

function toDetail(p: StaticProduct): ProductDetail {
  return {
    ...toCardView(p),
    description: p.description,
    variants: p.variants,
  };
}

export async function getFeaturedProducts(
  take: number,
): Promise<ProductCard[]> {
  return products.slice(0, take).map(toCardView);
}

export async function getAvailableNow(take: number): Promise<ProductCard[]> {
  return products
    .filter((p) => !p.isPreOrder)
    .slice(0, take)
    .map(toCardView);
}

export async function getPreOrderProducts(
  take: number,
): Promise<ProductCard[]> {
  return products
    .filter((p) => p.isPreOrder)
    .slice(0, take)
    .map(toCardView);
}

export async function getProductsByCategorySlug(
  slug: string,
  take: number,
): Promise<ProductCard[]> {
  return productsByCategory(slug).slice(0, take).map(toCardView);
}

export async function getProductsByBrandSlug(
  slug: string,
  take: number,
): Promise<ProductCard[]> {
  return productsByBrand(slug).slice(0, take).map(toCardView);
}

export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const product = products.find((p) => p.slug === slug);
  return product ? toDetail(product) : null;
}
