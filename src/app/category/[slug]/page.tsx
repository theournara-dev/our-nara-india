import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ProductGrid } from "@/components/product/product-grid";
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
    <Container className="py-10">
      <div className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Category
        </p>
        <h1 className="font-display text-3xl font-semibold text-zinc-900">
          {category.name}
        </h1>
      </div>
      <ProductGrid products={products} />
    </Container>
  );
}
