import { db } from "@/lib/db";

/**
 * Category data layer. Categories are managed in the admin (product form →
 * "+ New"), so the storefront reads them from the database like the rest of the
 * catalog rather than a baked-in list.
 */

export interface CategorySummary {
  slug: string;
  name: string;
  sortOrder: number;
}

export async function getRootCategories(): Promise<CategorySummary[]> {
  const rows = await db.category.findMany({
    where: { parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { slug: true, name: true, sortOrder: true },
  });
  return rows;
}

export async function getAllCategories(): Promise<CategorySummary[]> {
  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { slug: true, name: true, sortOrder: true },
  });
  return rows;
}

export async function getCategoryBySlug(
  slug: string,
): Promise<(CategorySummary & { parentId: string | null }) | null> {
  const category = await db.category.findUnique({
    where: { slug },
    select: { slug: true, name: true, sortOrder: true, parentId: true },
  });
  return category;
}
