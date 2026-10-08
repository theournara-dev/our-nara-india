import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { CategoryProductList } from "@/components/product/category-product-list";
import { getCategoryBySlug } from "@/data/categories";
import { getProductsByCategorySlug } from "@/data/products";
import { getSubcategories } from "@/data/subcategories";
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
  const [category, products] = await Promise.all([
    getCategoryBySlug(slug),
    getRequestSiteVersion().then((version) =>
      getProductsByCategorySlug(slug, 60, version),
    ),
  ]);

  if (!category) notFound();

  const subcategories = getSubcategories(slug);
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

      {/* Centered title */}
      <h1 className="mb-6 text-center font-display text-3xl font-semibold text-ink">
        {category.name}
      </h1>

      <CategoryProductList
        products={products}
        columns={5}
        subcategories={subcategories}
        initialFilters={initialFilters}
      />
    </Container>
  );
}
