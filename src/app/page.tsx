import { HeroCarousel } from "@/components/content/hero-carousel";
import { InstagramSection } from "@/components/content/instagram-section";
import { LongBanner } from "@/components/content/long-banner";
import { ReviewsSection } from "@/components/content/reviews-section";
import { ShortsCarousel } from "@/components/content/shorts-carousel";
import { TripleBanner } from "@/components/content/triple-banner";
import { FloatingButtons } from "@/components/layout/floating-buttons";
import { Reveal } from "@/components/ui/reveal";
import Image from "next/image";
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
      <Reveal>
        <HeroCarousel />
      </Reveal>

      {/* Top picks */}
      <Reveal>
        <ThemeProductSection
          sub="TOP PICKS"
          title="BEST PRODUCT"
          products={featured}
        />
      </Reveal>

      {/* Shorts reels */}
      <Reveal>
        <div className="mb-5 mt-[60px] w-full">
          <div className="relative mx-auto box-border w-[92%] max-w-[1560px] px-2 max-[767px]:w-[96%]">
            <div className="mx-auto mb-2">
              <h2 className="flex items-center justify-center gap-2 text-2xl font-bold leading-8 tracking-tight text-ink">
              <Image
                src="/upload/goodymall1/en/main/shorts.png"
                alt=""
                width={41}
                height={51}
                unoptimized
                className="inline-block h-auto w-7"
              />
              Shorts Picks
              </h2>
            </div>
            <ShortsCarousel picks={shorts} />
          </div>
        </div>
      </Reveal>

      {/* Triple banner (banner + curated products) */}
      <Reveal>
        <TripleBanner boxes={tripleBoxes} />
      </Reveal>

      {/* Pre-orders */}
      <Reveal>
        <ProductGridSection
          sub="AVAILABLE NOW"
          title="PRE-ORDER"
          products={preOrder}
          moreHref="/category/pre-order"
        />
      </Reveal>

      {/* Long banner */}
      <Reveal>
        <LongBanner banners={longBanners} />
      </Reveal>

      {/* Brand sections */}
      {brandSections.map((section) => (
        <Reveal key={section.slug}>
          <ProductGridSection
            sub={section.sub}
            title={section.title}
            products={section.products}
            moreHref={`/brand/${section.slug}`}
          />
        </Reveal>
      ))}

      {/* Reviews */}
      <Reveal>
        <ReviewsSection />
      </Reveal>

      {/* Instagram */}
      <Reveal>
        <InstagramSection />
      </Reveal>

      {/* Floating actions (home only): recent views + scroll to top */}
      <FloatingButtons />
    </div>
  );
}
