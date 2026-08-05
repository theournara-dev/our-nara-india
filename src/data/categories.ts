import { categories } from "@/data/catalog";

/** Static category data layer — DB-free, same shape as before. */

export interface CategorySummary {
  slug: string;
  name: string;
  sortOrder: number;
}

const withOrder: CategorySummary[] = categories.map((c, i) => ({
  slug: c.slug,
  name: c.name,
  sortOrder: i,
}));

export async function getRootCategories(): Promise<CategorySummary[]> {
  return withOrder;
}

export async function getAllCategories(): Promise<CategorySummary[]> {
  return withOrder;
}

export async function getCategoryBySlug(
  slug: string,
): Promise<(CategorySummary & { parentId: string | null }) | null> {
  const found = withOrder.find((c) => c.slug === slug);
  return found ? { ...found, parentId: null } : null;
}
