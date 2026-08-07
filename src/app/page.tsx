import { HeroCarousel } from "@/components/content/hero-carousel";
import { ShortsCarousel } from "@/components/content/shorts-carousel";
import { TripleBanner } from "@/components/content/triple-banner";
import { ThemeProductSection } from "@/components/theme/product-section";
import { getFeaturedProducts, getProductsBySlugs } from "@/data/products";
import { getShortsPicks } from "@/data/shorts";
import { tripleBannerBoxes } from "@/data/triple-banner";

export default async function HomePage() {
  const featured = await getFeaturedProducts(4);
  const shorts = await getShortsPicks();
  const tripleBoxes = await Promise.all(
    tripleBannerBoxes.map(async (box) => ({
      ...box,
      products: await getProductsBySlugs(box.productSlugs),
    })),
  );

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

      {/* Shorts reels */}
      <div className="mb-5 mt-[60px] w-full">
        <div className="relative mx-auto box-border w-[92%] max-w-[1560px] px-2 max-[767px]:w-[96%]">
          <div className="mx-auto mb-2">
            <h2 className="flex items-center justify-center gap-2 text-2xl font-bold leading-8 tracking-tight text-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/upload/goodymall1/en/main/shorts.png"
                alt=""
                className="inline-block h-auto w-7"
              />
              Shorts Picks
            </h2>
          </div>
          <ShortsCarousel picks={shorts} />
        </div>
      </div>

      {/* Triple banner (banner + curated products) */}
      <TripleBanner boxes={tripleBoxes} />

      {/* Brand sections */}
      {/*{brandList.slice(0, 6).map((brand) => (
        <ThemeProductSection
          key={brand.slug}
          sub="BRAND"
          title={brand.name}
          products={productsByBrand(brand.slug).slice(0, 8).map(toCardView)}
        />
      ))}*/}

      {/* Available now */}
      {/*<ThemeProductSection
        sub="AVAILABLE NOW"
        title="In Stock"
        products={availableNow}
      />*/}

      {/* Pre-orders */}
      {/*<ThemeProductSection
        sub="PRE-ORDER"
        title="Order now, ships later"
        products={preOrder}
      />*/}

      {/* Reviews */}
      {/*<div className="w-full">
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
      </div>*/}

      {/* Instagram */}
      {/*<div className="w-full">
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
      </div>*/}
    </div>
  );
}
