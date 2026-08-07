import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { CategoryProductList } from "@/components/product/category-product-list";
import { getCategoryBySlug } from "@/data/categories";
import { getProductsByCategorySlug } from "@/data/products";

export const dynamic = "force-dynamic";

type Params = { slug: string };

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
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const [category, products] = await Promise.all([
    getCategoryBySlug(slug),
    getProductsByCategorySlug(slug, 60),
  ]);

  if (!category) notFound();

  return (
    <Container className="py-8">
      {/* Breadcrumb, matching the original .path */}
      <nav className="mb-6 text-xs text-[#888]">
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

      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-ink">
          {category.name}
        </h1>
      </div>

      <CategoryProductList products={products} />
    </Container>
  );
}
