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
import { priceForVersion } from "@/lib/money";
import { saleStateForVersion, visibleForVersion } from "@/lib/product-flags";
import { getSiteUrl, getVersionConfig } from "@/lib/site-version";
import { getRequestSiteVersion } from "@/lib/site-version.server";

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
  const [product, version] = await Promise.all([
    getProductBySlug(slug),
    getRequestSiteVersion(),
  ]);
  if (!product || !visibleForVersion(product, version)) {
    return {
      title: "Product Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = product.seoTitle ?? product.name;
  const description =
    product.seoDescription ??
    product.summary ??
    `Shop ${product.brand.name} ${product.name} in India at OUR:NARA. Korean beauty and skincare products available in India.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/products/${product.slug}`,
    },
    openGraph: {
      title,
      description,
      images: product.images[0]
        ? [
            {
              url: product.images[0],
              width: 1200,
              height: 1200,
              alt: product.name,
            },
          ]
        : [],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const version = await getRequestSiteVersion();
  const product = await getProductBySlug(slug);

  // "Shown" is per store: a product hidden on this storefront 404s here while
  // the other store keeps selling it.
  if (!product || !visibleForVersion(product, version)) notFound();

  const [related, infoTemplate, user, reviews, reviewSummary, questions] =
    await Promise.all([
      getProductsByBrandSlug(product.brand.slug, 8, version),
      getProductInfoTemplate(),
      getCurrentUser(),
      getVisibleProductReviews(product.id),
      getReviewSummary(product.id),
      getPublishedProductQA(product.id),
    ]);

  const relatedOthers = related.filter((p) => p.id !== product.id);
  // The JSON-LD must describe what THIS store sells: the store's own price,
  // pre-order state and buy-now state.
  const priceCents = priceForVersion(
    product.priceCents,
    product.globalPriceCents,
    version,
  );
  const isInStock = product.variants.length
    ? product.variants.some((variant) => variant.stock > 0)
    : product.stock === null || product.stock > 0;
  const saleState = saleStateForVersion(product, version);
  const availability =
    saleState === "preorder"
      ? "https://schema.org/PreOrder"
      : saleState === "unavailable"
        ? "https://schema.org/OutOfStock"
        : isInStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock";
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.images.length ? { image: product.images } : {}),
    description:
      product.description ??
      product.seoDescription ??
      product.summary ??
      `Shop ${product.brand.name} ${product.name} at OUR:NARA.`,
    sku: product.variants.length === 1 ? product.variants[0].sku : undefined,
    brand: {
      "@type": "Brand",
      name: product.brand.name,
    },
    offers: {
      "@type": "Offer",
      url: `${getSiteUrl(version)}/products/${product.slug}`,
      priceCurrency: getVersionConfig(version).currency,
      price: (priceCents / 100).toFixed(2),
      availability,
      seller: {
        "@type": "Organization",
        name: "OUR:NARA",
      },
    },
  };

  // When a product has its own INFO rows, show only the visible ones (this set
  // is seeded from the global template, so "global" sections are included by
  // default and can be hidden per product). Otherwise fall back to the
  // storewide template.
  const infoRows = product.infoRows.length
    ? product.infoRows.filter((r) => r.visible !== false)
    : infoTemplate;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productSchema).replace(/</g, "\\u003c"),
        }}
      />
      <Container className="py-8">
        <TrackRecentView slug={product.slug} />
        <ProductDetail
          product={product}
          infoRows={infoRows}
          buyInfoRows={product.buyInfoRows}
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
    </>
  );
}
