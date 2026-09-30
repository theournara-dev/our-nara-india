import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductDetail } from "@/components/product/product-detail";
import { TrackRecentView } from "@/components/product/track-recent-view";
import { getProductBySlug, getProductsByBrandSlug } from "@/data/products";
import { priceForVersion } from "@/lib/money";
import {
  getSiteUrl,
  getVersionConfig,
  resolveRequestSiteVersion,
} from "@/lib/site-version";

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
  if (!product) {
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
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const related = await getProductsByBrandSlug(product.brand.slug, 8);
  const relatedOthers = related.filter((p) => p.id !== product.id);
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const siteVersion = resolveRequestSiteVersion(host);
  const siteConfig = getVersionConfig(siteVersion);
  const priceCents = priceForVersion(
    product.priceCents,
    product.globalPriceCents,
    siteVersion,
  );
  const isInStock = product.variants.length
    ? product.variants.some((variant) => variant.stock > 0)
    : product.stock === null || product.stock > 0;
  const availability =
    product.isPreOrder && siteConfig.preOrderEnabled
      ? "https://schema.org/PreOrder"
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
      url: `${getSiteUrl(siteVersion)}/products/${product.slug}`,
      priceCurrency: siteConfig.currency,
      price: (priceCents / 100).toFixed(2),
      availability,
      seller: {
        "@type": "Organization",
        name: "OUR:NARA",
      },
    },
  };

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
        <ProductDetail product={product} />

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
