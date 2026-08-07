import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { CategoryProductList } from "@/components/product/category-product-list";
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
          <li className="font-medium text-[#222]">{brand.name}</li>
        </ol>
      </nav>

      {/* Brand header */}
      <div className="mb-6 flex items-center gap-5">
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
          <h1 className="font-display text-3xl font-semibold text-ink">
            {brand.name}
          </h1>
          {brand.description && (
            <p className="mt-2 max-w-xl text-sm text-[#666]">
              {brand.description}
            </p>
          )}
        </div>
      </div>

      {/* Sort toolbar (brand pages add Manufacture Company + Product Review) */}
      <CategoryProductList
        products={products}
        extraSort={["manufacturer", "review"]}
      />
    </Container>
  );
}
