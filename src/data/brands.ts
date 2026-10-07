import { db } from "@/lib/db";

/**
 * Brand data layer. Brands are managed in the admin (product form → "+ New"),
 * so the storefront reads them from the database like the rest of the catalog.
 */

export interface BrandSummary {
  slug: string;
  name: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  description?: string | null;
}

export async function getBrands(): Promise<BrandSummary[]> {
  const rows = await db.brand.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      logoUrl: true,
      coverUrl: true,
      description: true,
    },
  });
  return rows;
}

export async function getBrandBySlug(
  slug: string,
): Promise<BrandSummary | null> {
  const brand = await db.brand.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      logoUrl: true,
      coverUrl: true,
      description: true,
      isActive: true,
    },
  });
  if (!brand || !brand.isActive) return null;
  return brand;
}
