import { brands } from "@/data/catalog";

/** Static brand data layer — DB-free, same shape as before. */

export interface BrandSummary {
  slug: string;
  name: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  description?: string | null;
}

export async function getBrands(): Promise<BrandSummary[]> {
  return brands.map((b) => ({ ...b, logoUrl: null, coverUrl: null }));
}

export async function getBrandBySlug(
  slug: string,
): Promise<BrandSummary | null> {
  const brand = brands.find((b) => b.slug === slug);
  return brand ? { ...brand, logoUrl: null, coverUrl: null } : null;
}
