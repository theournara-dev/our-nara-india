import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ProductGrid } from "@/components/product/product-grid";
import { SectionHeading } from "@/components/ui/section-heading";
import { brands, productsByBrand, toCardView } from "@/data/catalog";
import { getBrands } from "@/data/brands";
import { getRootCategories } from "@/data/categories";
import { reviews, shortsPicks } from "@/data/content";
import {
  getAvailableNow,
  getFeaturedProducts,
  getPreOrderProducts,
} from "@/data/products";
import { SITE } from "@/lib/constants";

function BrandSection({ slug }: { slug: string }) {
  const brand = brands.find((b) => b.slug === slug);
  const items = productsByBrand(slug).slice(0, 4).map(toCardView);
  if (!brand || items.length === 0) return null;

  return (
    <Container className="py-12">
      <SectionHeading
        eyebrow="Brand"
        title={brand.name}
        href={`/brand/${brand.slug}`}
        linkLabel="More products"
      />
      <ProductGrid products={items} />
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
      {/* Hero */}
      <section className="bg-gradient-to-b from-amber-50 to-white">
        <Container className="flex flex-col items-center gap-6 py-20 text-center sm:py-28">
          <p className="text-sm font-medium uppercase tracking-widest text-amber-600">
            {SITE.tagline} 🎁
          </p>
          <h1 className="font-display max-w-3xl text-4xl font-semibold leading-tight text-zinc-900 sm:text-6xl">
            Korean beauty, now in India.
          </h1>
          <p className="max-w-xl text-zinc-600">
            Curated K-Beauty skincare, makeup and haircare from trusted Korean
            brands — shipped to your door.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button href="/category/skin-care" size="lg">
              Shop Skin Care
            </Button>
            <Button href="/category/pre-order" size="lg" variant="outline">
              Explore Pre-Orders
            </Button>
          </div>
        </Container>
      </section>

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
      <Container className="py-14">
        <SectionHeading
          eyebrow="Top Picks"
          title="Best Product"
          href="/category/skin-care"
          linkLabel="View all"
        />
        <ProductGrid products={featured} />
      </Container>

      {/* Brand sections */}
      {brandList.slice(0, 6).map((brand) => (
        <BrandSection key={brand.slug} slug={brand.slug} />
      ))}

      {/* Available now */}
      <Container className="py-12">
        <SectionHeading eyebrow="In Stock" title="Available Now" />
        <ProductGrid products={availableNow} />
      </Container>

      {/* Pre-orders */}
      <Container className="py-12">
        <SectionHeading
          eyebrow="Order now, ships later"
          title="Pre-Order"
          href="/category/pre-order"
          linkLabel="More products"
        />
        <ProductGrid products={preOrder} />
      </Container>

      {/* Shorts picks */}
      <Container className="py-14">
        <SectionHeading eyebrow="TikTok" title="Shorts Picks" />
        <div className="grid gap-4 sm:grid-cols-3">
          {shortsPicks.map((short) => (
            <a
              key={short.id}
              href={short.tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex aspect-[3/4] flex-col justify-between rounded-2xl bg-zinc-900 p-5 text-white transition-transform hover:-translate-y-1"
            >
              <span className="text-sm text-zinc-300">{short.handle}</span>
              <span className="font-medium">{short.title}</span>
            </a>
          ))}
        </div>
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
