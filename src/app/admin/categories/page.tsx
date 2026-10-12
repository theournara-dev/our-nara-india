import { CategoriesManager } from "@/components/admin/categories-manager";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Categories" };

/**
 * Category management: the two-level tree that drives the storefront's header
 * menu and the mid-level tabs/tiles on listing pages. Products keep a
 * top-level category and sit in 0..n mid-level categories.
 */
export default async function AdminCategoriesPage() {
  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { subcategoryLinks: true } } },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
          Categories
        </h1>
        <p className="text-sm text-zinc-500">
          {rows.filter((r) => !r.parentId).length} top-level categories and{" "}
          {rows.filter((r) => r.parentId).length} subcategories. Top-level
          categories are the site menu; subcategories are the tiles/tabs on a
          category page and can be hidden or reordered here. Products sit in a
          top-level category and in any number of subcategories (see each
          product&apos;s &ldquo;Subcategories&rdquo; field).
        </p>
      </div>

      <CategoriesManager
        categories={rows.map((r) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          parentId: r.parentId,
          image: r.image,
          sortOrder: r.sortOrder,
          isActive: r.isActive,
          productCount: r._count.subcategoryLinks,
        }))}
      />
    </div>
  );
}
