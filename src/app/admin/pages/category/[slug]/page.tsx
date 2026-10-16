import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CategoryPageBannersForm } from "@/components/admin/category-page-banners-form";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { slug: string };

/**
 * Page settings for one top-level category listing (client's slide 4). The
 * category's own record — name, slug, tile, order — stays in
 * /admin/categories; everything about the page it renders (its banner blocks
 * and their heights) is configured here, with the rest of the pages.
 */
export default async function AdminCategoryPageSettings({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const category = await db.category.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      longBannerHeight: true,
      adBannerHeight: true,
    },
  });
  if (!category) notFound();

  // A mid-level category is a filter of its parent's listing, not a page.
  if (category.parentId) {
    const parent = await db.category.findUnique({
      where: { id: category.parentId },
      select: { slug: true },
    });
    if (parent) redirect(`/admin/pages/category/${parent.slug}`);
    notFound();
  }

  const [bannerRows, categories] = await Promise.all([
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
    db.category.findMany({ select: { id: true, name: true } }),
  ]);

  /** This page's picks for one of its three banner slots, in display order. */
  const picks = (placement: string) =>
    bannerRows
      .filter((b) => b.categoryId === category.id && b.placement === placement)
      .map((b) => b.id);

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
          {category.name}
        </h1>
        <p className="text-sm text-zinc-500">
          The banner blocks on /category/{category.slug}, above the products.
        </p>
      </div>

      <CategoryPageBannersForm
        categoryId={category.id}
        categoryName={category.name}
        categorySlug={category.slug}
        banners={bannerRows}
        categories={categories}
        initial={{
          top: picks("category-top"),
          long: picks("category-long"),
          ad: picks("category-ad"),
          longHeight: category.longBannerHeight,
          adHeight: category.adBannerHeight,
        }}
      />
    </div>
  );
}
