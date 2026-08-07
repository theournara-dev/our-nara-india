import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { ProductGrid } from "@/components/product/product-grid";
import { TrackRecentView } from "@/components/product/track-recent-view";
import { getProductBySlug, getProductsByBrandSlug } from "@/data/products";
import { formatMoney } from "@/lib/money";

// Rendered on demand so a product detail is always fresh without a full
// rebuild. The data layer still caches the underlying query.
export const dynamic = "force-dynamic";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.summary ?? undefined,
    openGraph: product.images.length ? { images: [product.images[0]] } : {},
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const related = await getProductsByBrandSlug(product.brand.slug, 8);
  const relatedOthers = related.filter((p) => p.id !== product.id);

  const hasDiscount =
    product.compareAtCents != null && product.compareAtCents > product.priceCents;

  return (
    <Container className="py-10">
      <TrackRecentView slug={product.slug} />
      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100">
            {product.images[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-400">
                <span>{product.brand.name}</span>
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((image) => (
                <div
                  key={image}
                  className="relative aspect-square w-20 overflow-hidden rounded-lg bg-zinc-100"
                >
                  <Image src={image} alt="" fill sizes="80px" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          <Link
            href={`/brand/${product.brand.slug}`}
            className="text-sm font-medium uppercase tracking-wider text-zinc-400 hover:text-zinc-900"
          >
            {product.brand.name}
          </Link>
          <h1 className="font-display text-3xl font-semibold text-zinc-900">
            {product.name}
          </h1>

          {product.summary && <p className="text-zinc-600">{product.summary}</p>}

          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-zinc-900">
              {formatMoney(product.priceCents, product.currency)}
            </span>
            {hasDiscount && (
              <span className="text-lg text-zinc-400 line-through">
                {formatMoney(product.compareAtCents!, product.currency)}
              </span>
            )}
          </div>

          {product.isPreOrder && (
            <div className="flex items-center gap-2">
              <Badge tone="accent">PRE-ORDER</Badge>
              <span className="text-sm text-zinc-500">
                {product.preOrderNotice ?? "Order now, ships when stock arrives."}
              </span>
            </div>
          )}

          {product.variants.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-900">
                Select option
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <span
                    key={variant.id}
                    className="rounded-full border border-zinc-200 px-4 py-1.5 text-sm text-zinc-700"
                  >
                    {variant.optionLabel ? `${variant.optionLabel}: ` : ""}
                    {variant.optionValue}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Buy box — wired to cart/checkout in a later milestone. */}
          <div className="mt-2 flex flex-col gap-2">
            <button
              disabled
              title="Checkout & payments are coming soon"
              className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-7 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add to Cart
            </button>
            <p className="text-center text-xs text-zinc-400">
              Checkout &amp; payments coming soon.
            </p>
          </div>

          {product.description && (
            <div className="mt-4 border-t border-zinc-100 pt-4">
              <h2 className="mb-2 text-sm font-semibold text-zinc-900">Details</h2>
              <div className="whitespace-pre-line text-sm leading-relaxed text-zinc-600">
                {product.description}
              </div>
            </div>
          )}
        </div>
      </div>

      {relatedOthers.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display mb-6 text-2xl font-semibold text-zinc-900">
            More from {product.brand.name}
          </h2>
          <ProductGrid products={relatedOthers} />
        </section>
      )}
    </Container>
  );
}
