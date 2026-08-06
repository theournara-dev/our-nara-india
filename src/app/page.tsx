import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { HeroCarousel } from "@/components/content/hero-carousel";
import { ShortsCarousel } from "@/components/content/shorts-carousel";
import { ProductCarousel } from "@/components/product/carousel";
import { brands, productsByBrand, toCardView } from "@/data/catalog";
import { getBrands } from "@/data/brands";
import { getRootCategories } from "@/data/categories";
import { reviews } from "@/data/content";
import {
  getAvailableNow,
  getFeaturedProducts,
  getPreOrderProducts,
} from "@/data/products";

function BrandSection({ slug }: { slug: string }) {
  const brand = brands.find((b) => b.slug === slug);
  const items = productsByBrand(slug).slice(0, 6).map(toCardView);
  if (!brand || items.length === 0) return null;

  return (
    <Container className="py-12">
      <SectionHeading
        eyebrow="Brand"
        title={brand.name}
        href={`/brand/${brand.slug}`}
        linkLabel="More products"
      />
      <ProductCarousel products={items} />
    </Container>
  );
}

export default async function HomePage() {
  const [categories, brandList, featured, availableNow, preOrder] =
    await Promise.all([
      getRootCategories(),
      getBrands(),
      getFeaturedProducts(8),
      getAvailableNow(8),
      getPreOrderProducts(8),
    ]);

  const categoryList =
    categories.length > 0
      ? categories.map((c) => ({ slug: c.slug, name: c.name }))
      : [
          { slug: "skin-care", name: "Skin Care" },
          { slug: "makeup", name: "Makeup" },
          { slug: "hair-care", name: "Hair Care" },
          { slug: "pre-order", name: "PRE-ORDER" },
        ];

  return (
    <div>
      {/* Hero carousel */}
      <HeroCarousel />

      {/* Categories */}
      <Container className="py-14">
        <SectionHeading title="Shopping Category" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {categoryList.map((category) => (
            <a
              key={category.slug}
              href={`/category/${category.slug}`}
              className="group flex aspect-[4/3] items-end rounded-2xl bg-zinc-100 p-5 transition-colors hover:bg-zinc-200"
            >
              <span className="text-lg font-semibold text-zinc-900 group-hover:underline">
                {category.name}
              </span>
            </a>
          ))}
        </div>
      </Container>

      {/* Top Picks */}
      <Container className="py-12">
        <SectionHeading
          eyebrow="Top Picks"
          title="Best Product"
          href="/category/skin-care"
          linkLabel="View all"
        />
        <ProductCarousel products={featured} />
      </Container>

      {/* Brand sections */}
      {brandList.slice(0, 6).map((brand) => (
        <BrandSection key={brand.slug} slug={brand.slug} />
      ))}

      {/* Available now */}
      <Container className="py-12">
        <SectionHeading eyebrow="In Stock" title="Available Now" />
        <ProductCarousel products={availableNow} />
      </Container>

      {/* Pre-orders */}
      <Container className="py-12">
        <SectionHeading
          eyebrow="Order now, ships later"
          title="Pre-Order"
          href="/category/pre-order"
          linkLabel="More products"
        />
        <ProductCarousel products={preOrder} />
      </Container>

      {/* Shorts reels */}
      <Container className="py-14">
        <SectionHeading eyebrow="TikTok" title="Shorts Picks" />
        <ShortsCarousel />
      </Container>

      {/* Real reviews */}
      <section className="bg-zinc-50 py-16">
        <Container>
          <SectionHeading
            eyebrow="Real Reviews"
            title="What Our Customers Say"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.map((review) => (
              <figure
                key={review.id}
                className="rounded-2xl border border-zinc-100 bg-white p-6"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-amber-500">
                    {"★".repeat(review.rating)}
                  </span>
                  <span className="text-xs text-zinc-400">{review.date}</span>
                </div>
                <figcaption className="mb-2 font-semibold text-zinc-900">
                  {review.author}
                </figcaption>
                {review.product && (
                  <Badge tone="default">{review.product}</Badge>
                )}
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                  {review.body}
                </p>
              </figure>
            ))}
          </div>
        </Container>
      </section>

      {/* Instagram */}
      <Container className="py-16 text-center">
        <SectionHeading
          eyebrow="Influencer story · 10,000+ reviews"
          title="Instagram #our__nara"
        />
        <p className="mx-auto mb-6 max-w-xl text-sm text-zinc-500">
          Follow the community and tag{" "}
          <span className="font-semibold text-zinc-900">#our__nara</span> to get
          featured.
        </p>
        <Button
          href="https://www.instagram.com/goodymalldesign"
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
        >
          Follow on Instagram
        </Button>
      </Container>
    </div>
  );
}
