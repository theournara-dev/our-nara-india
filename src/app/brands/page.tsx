import type { Metadata } from "next";
import { BrandBrowser } from "@/components/brands/brand-browser";
import { PromoBanner } from "@/components/banners/promo-banner";
import { LongBannerCells } from "@/components/content/long-banner";
import { Container } from "@/components/ui/container";
import { getBrandsPageBlocks } from "@/data/banners";
import { getBrands } from "@/data/brands";
import { getSiteConfig } from "@/lib/site-config";
import { getRequestSiteVersion } from "@/lib/site-version.server";

export const metadata: Metadata = { title: "Shop by Brand" };

// Brands are managed in the admin, so this list must reflect the database on
// every request instead of being cached from the first render.
export const dynamic = "force-dynamic";

/**
 * /brands (client slides 4 and 6): title → the long banner and the promo block
 * (the same two blocks the category pages use) → group tabs → brand preview grid
 * → A–Z index → brand list. The heading and page margins match the category
 * pages; the blocks and the preview grid's size are set under Pages → Brands
 * page. The promo stays empty until a banner is picked for it.
 */
export default async function BrandsPage() {
  const version = await getRequestSiteVersion();
  const site = await getSiteConfig(version);
  const [brands, blocks] = await Promise.all([
    getBrands(),
    // The page picks its own banners, so no placement is involved.
    getBrandsPageBlocks(site.brandsPage),
  ]);

  return (
    <Container wide className="py-8">
      <h1 className="mb-6 text-center font-category text-3xl font-semibold text-ink">
        BRAND
      </h1>

      {blocks.long.length > 0 && (
        <div className="mb-3">
          <LongBannerCells
            framed={false}
            columns={blocks.long.length}
            height={blocks.longHeight}
            cells={blocks.long.map((banner, i) => ({
              id: `cell-${i + 1}`,
              banner,
            }))}
          />
        </div>
      )}
      {blocks.promo && (
        <div className="mb-4">
          <PromoBanner banner={blocks.promo} height={blocks.promoHeight} />
        </div>
      )}

      <BrandBrowser brands={brands} preview={site.brandsPage} />
    </Container>
  );
}
