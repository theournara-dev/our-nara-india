import { HeroCarousel } from "@/components/content/hero-carousel";
import { ShortsCarousel } from "@/components/content/shorts-carousel";
import { ThemeProductSection } from "@/components/theme/product-section";
import { productsByBrand, toCardView } from "@/data/catalog";
import { getBrands } from "@/data/brands";
import { reviews } from "@/data/content";
import {
  getAvailableNow,
  getFeaturedProducts,
  getPreOrderProducts,
} from "@/data/products";

export default async function HomePage() {
  const [brandList, featured, availableNow, preOrder] = await Promise.all([
    getBrands(),
    getFeaturedProducts(8),
    getAvailableNow(8),
    getPreOrderProducts(8),
  ]);

  return (
    <div>
      {/* Hero */}
      <HeroCarousel />

      {/* Top picks */}
      <ThemeProductSection
        sub="TOP PICKS"
        title="BEST PRODUCT"
        products={featured}
      />

      {/* Brand sections */}
      {brandList.slice(0, 6).map((brand) => (
        <ThemeProductSection
          key={brand.slug}
          sub="BRAND"
          title={brand.name}
          products={productsByBrand(brand.slug).slice(0, 8).map(toCardView)}
        />
      ))}

      {/* Available now */}
      <ThemeProductSection
        sub="AVAILABLE NOW"
        title="In Stock"
        products={availableNow}
      />

      {/* Pre-orders */}
      <ThemeProductSection
        sub="PRE-ORDER"
        title="Order now, ships later"
        products={preOrder}
      />

      {/* Shorts reels */}
      <div className="w-full">
        <div className="relative mx-auto box-border w-[92%] max-w-[1560px] px-2">
          <div className="mx-auto mb-2">
            <h2 className="text-center text-2xl font-bold leading-8 tracking-tight text-ink">
              <span className="block text-base font-medium leading-6 text-point-500">
                TIKTOK
              </span>
              Shorts Picks
            </h2>
          </div>
          <ShortsCarousel />
        </div>
      </div>

      {/* Reviews */}
      <div className="w-full">
        <div className="relative mx-auto box-border w-[92%] max-w-[1560px] px-2">
          <div className="mx-auto mb-2">
            <h2 className="text-center text-2xl font-bold leading-8 tracking-tight text-ink">
              <span className="block text-base font-medium leading-6 text-point-500">
                REAL REVIEWS
              </span>
              What Our Customers Say
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <figure
                key={review.id}
                className="rounded-2xl border border-zinc-100 bg-white p-5"
              >
                <div className="mb-2 text-amber-500">
                  {"★".repeat(review.rating)}
                </div>
                <figcaption className="mb-2 font-semibold text-zinc-900">
                  {review.author}
                </figcaption>
                <p className="text-sm leading-relaxed text-zinc-600">
                  {review.body}
                </p>
              </figure>
            ))}
          </div>
        </div>
      </div>

      {/* Instagram */}
      <div className="w-full">
        <div className="relative mx-auto box-border w-[92%] max-w-[1560px] px-2">
          <div className="mx-auto mb-2">
            <h2 className="text-center text-2xl font-bold leading-8 tracking-tight text-ink">
              <span className="block text-base font-medium leading-6 text-point-500">
                INSTAGRAM #our__nara
              </span>
              Influencer story · 10,000+ reviews
            </h2>
          </div>
          <p className="text-center text-zinc-600">
            Follow the community and tag <strong>#our__nara</strong> to get
            featured.
          </p>
        </div>
      </div>
    </div>
  );
}
