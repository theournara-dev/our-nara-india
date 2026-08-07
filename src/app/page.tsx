import { HeroCarousel } from "@/components/content/hero-carousel";
import { InstagramSection } from "@/components/content/instagram-section";
import { LongBanner } from "@/components/content/long-banner";
import { ReviewsSection } from "@/components/content/reviews-section";
import { ShortsCarousel } from "@/components/content/shorts-carousel";
import { TripleBanner } from "@/components/content/triple-banner";
import { FloatingButtons } from "@/components/layout/floating-buttons";
import { ProductGridSection } from "@/components/theme/product-grid-section";
import { ThemeProductSection } from "@/components/theme/product-section";
import { longBanners } from "@/data/banners";
import { getBrand } from "@/data/catalog";
import { homeBrandSections } from "@/data/home-sections";
import {
  getFeaturedProducts,
  getProductsByBrandSlug,
  getProductsBySlugs,
} from "@/data/products";
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
  const preOrder = await getProductsBySlugs([
    "centella-dark-spot-solution-ampoule-pro",
    "peptide-volume-neck-cream",
    "peptide-volume-lifting-pro-essence-30ml",
    "centella-moist-soothing-gel-cream-ex",
    "peptide-volume-lifting-pro-essence-100ml",
  ]);
  const brandSections = await Promise.all(
    homeBrandSections.map(async (section) => ({
      ...section,
      title: getBrand(section.slug)?.name ?? section.slug,
      products: await getProductsByBrandSlug(section.slug, 20),
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

      {/* Pre-orders */}
      <ProductGridSection
        sub="AVAILABLE NOW"
        title="PRE-ORDER"
        products={preOrder}
        moreHref="/category/pre-order"
      />

      {/* Long banner */}
      <LongBanner banners={longBanners} />

      {/* Brand sections */}
      {brandSections.map((section) => (
        <ProductGridSection
          key={section.slug}
          sub={section.sub}
          title={section.title}
          products={section.products}
          moreHref={`/brand/${section.slug}`}
        />
      ))}

      {/* Reviews */}
      <ReviewsSection />

      {/* Instagram */}
      <InstagramSection />

      {/* Floating actions (home only): recent views + scroll to top */}
      <FloatingButtons />
    </div>
  );
}
