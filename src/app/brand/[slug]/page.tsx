import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ProductGrid } from "@/components/product/product-grid";
import { getBrandBySlug } from "@/data/brands";
import { getProductsByBrandSlug } from "@/data/products";

export const dynamic = "force-dynamic";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  return brand ? { title: brand.name } : {};
}

export default async function BrandPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const [brand, products] = await Promise.all([
    getBrandBySlug(slug),
    getProductsByBrandSlug(slug, 60),
  ]);

  if (!brand) notFound();

  return (
    <Container className="py-10">
      <div className="mb-8 flex items-center gap-5">
        {brand.logoUrl && (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
            <Image
              src={brand.logoUrl}
              alt={`${brand.name} logo`}
              fill
              sizes="64px"
              className="object-contain"
            />
          </div>
        )}
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Brand
          </p>
          <h1 className="font-display text-3xl font-semibold text-zinc-900">
            {brand.name}
          </h1>
          {brand.description && (
            <p className="mt-2 max-w-xl text-zinc-600">{brand.description}</p>
          )}
        </div>
      </div>
      <ProductGrid products={products} />
    </Container>
  );
}
