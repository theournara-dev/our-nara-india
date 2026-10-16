import Link from "next/link";
import { headers } from "next/headers";
import { CategoryPagesSettings } from "@/components/admin/category-pages-settings";
import { db } from "@/lib/db";
import { getCategoryPageDefaults } from "@/data/banners";
import { resolveRequestSiteVersion } from "@/lib/site-version";

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

/**
 * Page settings for the category listings (client's slide 4): every top-level
 * category page is configured on this one screen, and the first tab is the
 * configuration all of them follow unless they are customised. The category's
 * own record (name, slug, tile, order) stays in /admin/categories.
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
        pageBannersMode: true,
        hiddenBlocks: true,
        longBannerHeight: true,
        promoBannerId: true,
        promoHeight: true,
      },
    }),
    // Every banner feeds the pickers and the previews.
    db.banner.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: BANNER_OPTION_SELECT,
    }),
  ]);

  /** Picks for one banner slot, in display order: a page's own or all-pages. */
  const picks = (categoryId: string | null, placement: string) =>
    bannerRows
      .filter((b) => b.categoryId === categoryId && b.placement === placement)
      .map((b) => b.id);

  const requestHeaders = await headers();
  const version = resolveRequestSiteVersion(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
  );
  // The all-pages strip picks carry no category; their heights and promo live on
  // the site config.
  const siteDefaults = await getCategoryPageDefaults(version);

  const pages = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    mode:
      c.pageBannersMode === "custom"
        ? ("custom" as const)
        : ("default" as const),
    hidden: c.hiddenBlocks,
    long: picks(c.id, "category-long"),
    promoId: c.promoBannerId,
    longHeight: c.longBannerHeight,
    promoHeight: c.promoHeight,
  }));

  const defaults = {
    long: picks(null, "category-long"),
    promoId: siteDefaults.promoId,
    longHeight: siteDefaults.longHeight,
    promoHeight: siteDefaults.promoHeight,
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
          The long banner and promo block above the products on each listing.
          They render on every category page unless a page is customised.
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
