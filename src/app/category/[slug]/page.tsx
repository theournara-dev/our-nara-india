import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { CategoryProductList } from "@/components/product/category-product-list";
import { AdBanner } from "@/components/banners/ad-banner";
import { LongBannerCells } from "@/components/content/long-banner";
import { getCategoryBanners } from "@/data/banners";
import {
  getCategoryById,
  getCategoryBySlug,
  getCategoryTabs,
} from "@/data/categories";
import { getProductsByCategorySlug } from "@/data/products";
import { parseCategoryFilters } from "@/lib/category-filters";
import { getRequestSiteVersion } from "@/lib/site-version.server";

export const dynamic = "force-dynamic";

type Params = { slug: string };
type SearchParams = {
  sub?: string;
  brand?: string;
  min?: string;
  max?: string;
  avail?: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  return category ? { title: category.name } : {};
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const { sub, brand, min, max, avail } = await searchParams;
  const [category, version] = await Promise.all([
    getCategoryBySlug(slug),
    getRequestSiteVersion(),
  ]);

  if (!category) notFound();

  // A mid-level category is a filter of its root's listing, not a page of its
  // own — keep one canonical URL per listing state.
  if (category.parentId) {
    const parent = await getCategoryById(category.parentId);
    if (parent) redirect(`/category/${parent.slug}?sub=${category.slug}`);
  }

  const [products, subcategories, banners] = await Promise.all([
    getProductsByCategorySlug(slug, 300, version),
    getCategoryTabs(slug, version),
    getCategoryBanners(slug),
  ]);

  const filters = parseCategoryFilters({ sub, brand, min, max, avail });
  // A stale ?sub= from another category is ignored, so the chips stay honest.
  const initialFilters = subcategories.some((s) => s.slug === filters.sub)
    ? filters
    : { ...filters, sub: undefined };

  return (
    <Container wide className="py-8">
      {/* Breadcrumb — right-aligned, matching the original */}
      <nav className="mb-6 flex justify-end text-xs text-[#888]">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-point-500">
              HOME
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-[#222]">{category.name}</li>
        </ol>
      </nav>

      {/* Centered title — a "main category" heading, so Pretendard (client
          slide 7: "change the font of the main category to Pretendard"). */}
      <h1 className="mb-6 text-center font-category text-3xl font-semibold text-ink">
        {category.name}
      </h1>

      <CategoryProductList
        products={products}
        columns={5}
        subcategories={subcategories}
        initialFilters={initialFilters}
        topBanners={
          banners.top.length > 0 ? (
            <div
              className={`grid gap-3 ${
                banners.top.length > 1 ? "sm:grid-cols-2" : ""
              }`}
            >
              {banners.top.map((banner) => (
                <Link
                  key={banner.id}
                  href={banner.href ?? "#"}
                  className="block overflow-hidden rounded-xl"
                >
                  <Image
                    src={banner.image}
                    alt={banner.alt}
                    width={1200}
                    height={480}
                    unoptimized
                    className="h-auto w-full"
                  />
                </Link>
              ))}
            </div>
          ) : null
        }
        longBanner={
          // The home page's column strip (client's slide 4): one banner per
          // column, so one runs full width and two or three share the row. The
          // height comes from the category's own page settings.
          banners.long.length > 0 ? (
            <LongBannerCells
              framed={false}
              columns={banners.long.length}
              height={category.longBannerHeight}
              cells={banners.long.map((banner, i) => ({
                id: `cell-${i + 1}`,
                banner,
              }))}
            />
          ) : null
        }
        adBanner={
          banners.ad ? (
            <AdBanner banner={banners.ad} height={category.adBannerHeight} />
          ) : null
        }
      />
    </Container>
  );
}
