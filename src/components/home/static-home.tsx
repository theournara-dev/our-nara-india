import { HeroCarousel } from "@/components/content/hero-carousel";
import { InstagramSection } from "@/components/content/instagram-section";
import { LongBannerCells } from "@/components/content/long-banner";
import { ReviewsSection } from "@/components/content/reviews-section";
import { ShortsCarousel } from "@/components/content/shorts-carousel";
import { TabbedShowcase } from "@/components/content/tabbed-showcase";
import { Reveal } from "@/components/ui/reveal";
import { ProductGridSection } from "@/components/theme/product-grid-section";
import { ThemeProductSection } from "@/components/theme/product-section";
import { getLongBanners, getBrandSectionBanners } from "@/data/banners";
import { getBrand } from "@/data/catalog";
import { homeBrandSections } from "@/data/home-sections";
import {
  getFeaturedProducts,
  getProductsByBrandSlug,
  getProductsBySlugs,
} from "@/data/products";
import { getShortsPicks } from "@/data/shorts";
import { tripleBannerTabs } from "@/data/triple-banner";
import { getVersionConfig } from "@/lib/site-version";
import { getRequestSiteVersion } from "@/lib/site-version.server";

/**
 * The original, hardcoded homepage. Used as a fallback by the dynamic page
 * renderer when no `home` Page row exists yet (e.g. before seeding), so the
 * homepage never regresses. Once a `home` page is seeded, the page builder
 * drives the layout instead.
 */
export async function StaticHome() {
  const version = await getRequestSiteVersion();
  const { preOrderEnabled } = getVersionConfig(version);
  const featured = await getFeaturedProducts(4, version);
  const shorts = await getShortsPicks();
  const longBanners = await getLongBanners();
  const showcaseTabs = await Promise.all(
    tripleBannerTabs.map(async (tab) => ({
      ...tab,
      products: await getProductsBySlugs(tab.productSlugs, version),
    })),
  );
  const preOrder = preOrderEnabled
    ? await getProductsBySlugs(
        [
          "centella-dark-spot-solution-ampoule-pro",
          "peptide-volume-neck-cream",
          "peptide-volume-lifting-pro-essence-30ml",
          "centella-moist-soothing-gel-cream-ex",
          "peptide-volume-lifting-pro-essence-100ml",
        ],
        version,
      )
    : [];
  const brandSections = await Promise.all(
    homeBrandSections.map(async (section) => ({
      ...section,
      title: getBrand(section.slug)?.name ?? section.slug,
      products: await getProductsByBrandSlug(section.slug, 20, version),
      // The promo row above the brand's grid (client slides 5–6). Empty until
      // the banners are uploaded in /admin/banners.
      banners: await getBrandSectionBanners(section.slug),
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
        <ShortsCarousel picks={shorts} />
      </Reveal>

      {/* Tabbed showcase (the client's slide 2): brand filters over a
          full-width banner and that brand's products. The title is empty by
          default, so nothing renders above the filters. */}
      <Reveal>
        <TabbedShowcase title="" tabs={showcaseTabs} columns={4} height={400} />
      </Reveal>

      {/* Pre-orders */}
      {preOrderEnabled && (
        <Reveal>
          <ProductGridSection
            sub="AVAILABLE NOW"
            title="PRE-ORDER"
            products={preOrder}
            moreHref="/category/pre-order"
          />
        </Reveal>
      )}

      {/* Long banner — the client's slide 6: the strip is two banners side by
          side (one spans it when only one is active), not a one-at-a-time
          carousel. */}
      <Reveal>
        <LongBannerCells
          cells={[
            { id: "cell-1", banner: longBanners[0] ?? null },
            { id: "cell-2", banner: longBanners[1] ?? null },
          ]}
        />
      </Reveal>

      {/* Brand sections */}
      {brandSections.map((section) => (
        <Reveal key={section.slug}>
          <ProductGridSection
            sub={section.sub}
            title={section.title}
            products={section.products}
            banners={section.banners}
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
    </div>
  );
}
