import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductDetail } from "@/components/product/product-detail";
import { TrackRecentView } from "@/components/product/track-recent-view";
import { getCurrentUser } from "@/lib/auth";
import {
  getProductBySlug,
  getProductInfoTemplate,
  getProductsByBrandSlug,
} from "@/data/products";
import { getReviewSummary, getVisibleProductReviews } from "@/data/reviews";
import { getPublishedProductQA } from "@/data/qa";

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

  const [related, infoTemplate, user, reviews, reviewSummary, questions] =
    await Promise.all([
      getProductsByBrandSlug(product.brand.slug, 8),
      getProductInfoTemplate(),
      getCurrentUser(),
      getVisibleProductReviews(product.id),
      getReviewSummary(product.id),
      getPublishedProductQA(product.id),
    ]);

  const relatedOthers = related.filter((p) => p.id !== product.id);
  // When a product has its own INFO rows, show only the visible ones (this set
  // is seeded from the global template, so "global" sections are included by
  // default and can be hidden per product). Otherwise fall back to the
  // storewide template.
  const infoRows = product.infoRows.length
    ? product.infoRows.filter((r) => r.visible !== false)
    : infoTemplate;

  return (
    <Container className="py-8">
      <TrackRecentView slug={product.slug} />
      <ProductDetail
        product={product}
        infoRows={infoRows}
        reviews={reviews}
        reviewSummary={reviewSummary}
        questions={questions}
        canInteract={Boolean(user)}
      />

      {relatedOthers.length > 0 && (
        <section className="mx-auto mt-20 box-border w-[92%] max-w-[1560px] px-2">
          <h2 className="mb-6 font-display text-2xl font-semibold text-ink">
            More from {product.brand.name}
          </h2>
          <ProductGrid products={relatedOthers} />
        </section>
      )}
    </Container>
  );
}
