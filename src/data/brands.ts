import { db } from "@/lib/db";

/**
 * Brand data layer. Brands are managed in the admin (product form → "+ New"),
 * so the storefront reads them from the database like the rest of the catalog.
 */

/** Which curated tab of /brands a brand belongs to (null = "All" only). */
export type BrandGroupKey = "ONLY_AT_OURNARA" | "NEW_LAUNCH";

export interface BrandSummary {
  slug: string;
  name: string;
  logoUrl?: string | null;
  /** The brand page's own banner image (client's slide 7). */
  coverUrl?: string | null;
  /** How tall that banner is drawn, in pixels. */
  bannerHeight?: number | null;
  description?: string | null;
  group?: BrandGroupKey | null;
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
      group: true,
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
      bannerHeight: true,
      description: true,
      isActive: true,
    },
  });
  if (!brand || !brand.isActive) return null;
  return brand;
}
