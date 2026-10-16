import Link from "next/link";
import { CategoryPagesSettings } from "@/components/admin/category-pages-settings";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ category?: string }>;

/**
 * Page settings for the category listings (client's slide 4): every top-level
 * category page is configured on this one screen — they all do the same thing
 * and differ only in which banners they hold. The category's own record (name,
 * slug, tile, order) stays in /admin/categories.
 */
export default async function AdminCategoryPagesSettings({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { category: initialSlug } = await searchParams;

  const [categories, bannerRows] = await Promise.all([
    // Top-level categories own a page each; mid-level ones are its filters.
    db.category.findMany({
      where: { parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        longBannerHeight: true,
        adBannerHeight: true,
      },
    }),
    // Every banner feeds the page's pickers.
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

  /** This page's picks for one of its three banner slots, in display order. */
  const picks = (categoryId: string, placement: string) =>
    bannerRows
      .filter((b) => b.categoryId === categoryId && b.placement === placement)
      .map((b) => b.id);

  const pages = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    top: picks(c.id, "category-top"),
    long: picks(c.id, "category-long"),
    ad: picks(c.id, "category-ad"),
    longHeight: c.longBannerHeight,
    adHeight: c.adBannerHeight,
  }));

  return (
    <div className="max-w-3xl">
      <nav className="mb-4 text-xs text-zinc-400">
        <Link href="/admin/pages" className="hover:text-point-500">
          Pages
        </Link>
        <span className="mx-1.5">/</span>
        <span>Category pages</span>
      </nav>

      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
          Category pages
        </h1>
        <p className="text-sm text-zinc-500">
          The banner blocks above the products on each listing. Pick a page, set
          its blocks, save.
        </p>
      </div>

      <CategoryPagesSettings
        pages={pages}
        banners={bannerRows}
        categories={categories}
        initialId={
          initialSlug
            ? pages.find((p) => p.slug === initialSlug)?.id
            : undefined
        }
      />
    </div>
  );
}
