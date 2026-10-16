import { CategoriesManager } from "@/components/admin/categories-manager";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Categories" };

/**
 * Category management: the two-level tree that drives the storefront's header
 * menu and the mid-level tabs/tiles on listing pages. Products keep a
 * top-level category and sit in 0..n mid-level categories. A top-level
 * category's edit dialog also picks the banners shown on its listing page.
 */
export default async function AdminCategoriesPage() {
  const [rows, bannerRows] = await Promise.all([
    db.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { subcategoryLinks: true } } },
    }),
    // Every banner feeds the per-category page pickers. Ordered the way the
    // storefront renders them so the picked ids come back in display order.
    db.banner.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        image: true,
        placement: true,
        categoryId: true,
      },
    }),
  ]);

  /** Ids of one category's picks for one of the page's banner placements. */
  const pickIds = (
    categoryId: string,
    placement: "category-top" | "category-long" | "category-ad",
  ) =>
    bannerRows
      .filter((b) => b.categoryId === categoryId && b.placement === placement)
      .map((b) => b.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
          Categories
        </h1>
        <p className="text-sm text-zinc-500">
          {rows.filter((r) => !r.parentId).length} top-level categories and{" "}
          {rows.filter((r) => r.parentId).length} subcategories. Top-level
          categories are the site menu; editing one also picks the banners on
          its page. Subcategories are the tiles/tabs on a category page and can
          be hidden or reordered here. Products sit in a top-level category and
          in any number of subcategories (see each product&apos;s
          &ldquo;Subcategories&rdquo; field).
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
          topBannerIds: pickIds(r.id, "category-top"),
          longBannerIds: pickIds(r.id, "category-long"),
          adBannerIds: pickIds(r.id, "category-ad"),
          longBannerHeight: r.longBannerHeight,
          adBannerHeight: r.adBannerHeight,
        }))}
        banners={bannerRows}
      />
    </div>
  );
}
