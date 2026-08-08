import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { CategoryProductList } from "@/components/product/category-product-list";
import { getCategoryBySlug } from "@/data/categories";
import { getProductsByCategorySlug } from "@/data/products";
import {
  getSubcategories,
  getSubcategoryForProduct,
} from "@/data/subcategories";

export const dynamic = "force-dynamic";

type Params = { slug: string };
type SearchParams = { sub?: string };

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
  const { sub } = await searchParams;
  const [category, products] = await Promise.all([
    getCategoryBySlug(slug),
    getProductsByCategorySlug(slug, 60),
  ]);

  if (!category) notFound();

  const subcategories = getSubcategories(slug);
  const activeSub = subcategories.some((s) => s.slug === sub) ? sub : undefined;
  const filtered = activeSub
    ? products.filter((p) => getSubcategoryForProduct(p.slug) === activeSub)
    : products;

  return (
    <Container className="py-8">
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

      {/* Subcategory filter */}
      {subcategories.length > 0 && (
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          <Link
            href={`/category/${slug}`}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              !activeSub
                ? "border-point-500 bg-point-500 text-white"
                : "border-[#e9e9e9] text-[#555] hover:border-point-500 hover:text-point-500"
            }`}
          >
            All
          </Link>
          {subcategories.map((s) => (
            <Link
              key={s.slug}
              href={`/category/${slug}?sub=${s.slug}`}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                activeSub === s.slug
                  ? "border-point-500 bg-point-500 text-white"
                  : "border-[#e9e9e9] text-[#555] hover:border-point-500 hover:text-point-500"
              }`}
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      <CategoryProductList products={filtered} columns={5} />
    </Container>
  );
}
