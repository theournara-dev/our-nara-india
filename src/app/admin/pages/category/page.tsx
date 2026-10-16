import Link from "next/link";
import { CategoryPagesSettings } from "@/components/admin/category-pages-settings";
import type { BannerBlocksValue } from "@/components/admin/banner-blocks-fields";
import { db } from "@/lib/db";
import { getCategoryAllPagesBlocks } from "@/data/banners";
import type { CategoryPageBlocksConfig } from "@/lib/category-page-blocks";
import type { SiteVersion } from "@/lib/site-version";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ category?: string }>;

/** The banner columns the pickers and previews need. */
const BANNER_OPTION_SELECT = {
  id: true,
  title: true,
  image: true,
  mobileImage: true,
  alt: true,
  href: true,
  placement: true,
  categoryId: true,
  style: true,
  heading: true,
  subheading: true,
  textAlign: true,
  textVAlign: true,
  textColor: true,
  scrim: true,
} as const;

/** A store's all-pages blocks, reduced to what the block pickers edit. */
function pickerValue(config: CategoryPageBlocksConfig): BannerBlocksValue {
  return {
    long: config.long,
    promoId: config.promoId,
    longHeight: config.longHeight,
    promoHeight: config.promoHeight,
  };
}

/**
 * Page settings for the category listings (client's slide 4): every top-level
 * category page is configured on this one screen, per store like the brands
 * page, and the first tab is the configuration all of them follow unless they
 * are customised. The category's own record (name, slug, tile, order) stays in
 * /admin/categories.
 */
export default async function AdminCategoryPagesSettings({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { category: initialSlug } = await searchParams;

  const [categories, bannerRows, localDefaults, globalDefaults] =
    await Promise.all([
      // Top-level categories own a page each; mid-level ones are its filters.
      db.category.findMany({
        where: { parentId: null },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, slug: true, name: true, pageBanners: true },
      }),
      // Every banner feeds the pickers and the previews.
      db.banner.findMany({
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        select: BANNER_OPTION_SELECT,
      }),
      // The all-pages blocks are per store, on each store's site config.
      getCategoryAllPagesBlocks("local"),
      getCategoryAllPagesBlocks("global"),
    ]);

  const pages = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    pageBanners: c.pageBanners,
  }));

  const defaults: Record<SiteVersion, BannerBlocksValue> = {
    local: pickerValue(localDefaults),
    global: pickerValue(globalDefaults),
  };

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
          The long banner and promo block above the products on each listing,
          per store. They render on every category page of that store unless a
          page is customised.
        </p>
      </div>

      <CategoryPagesSettings
        pages={pages}
        defaults={defaults}
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
