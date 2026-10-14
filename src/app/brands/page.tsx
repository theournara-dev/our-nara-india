import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrandBrowser } from "@/components/brands/brand-browser";
import { Container } from "@/components/ui/container";
import { getBrandTopBanners } from "@/data/banners";
import { getBrands } from "@/data/brands";
import { getSiteConfig } from "@/lib/site-config";
import { getRequestSiteVersion } from "@/lib/site-version.server";

export const metadata: Metadata = { title: "Shop by Brand" };

// Brands are managed in the admin, so this list must reflect the database on
// every request instead of being cached from the first render.
export const dynamic = "force-dynamic";

/**
 * /brands (client slide 8): title → up to two banners in one row → group tabs
 * → brand preview grid → A–Z index → brand list. The heading and page margins
 * match the category pages; the preview grid's tile height, columns and rows
 * are set under Site settings → Brands page.
 */
export default async function BrandsPage() {
  const version = await getRequestSiteVersion();
  const [brands, banners, site] = await Promise.all([
    getBrands(),
    getBrandTopBanners(),
    getSiteConfig(version),
  ]);

  return (
    <Container wide className="py-8">
      <h1 className="mb-6 text-center font-display text-3xl font-semibold text-ink">
        BRAND
      </h1>

      {banners.length > 0 && (
        <div
          className={`mb-8 grid gap-3 ${
            banners.length > 1 ? "sm:grid-cols-2" : ""
          }`}
        >
          {banners.map((banner) =>
            banner.href ? (
              <Link
                key={banner.id}
                href={banner.href}
                className="block overflow-hidden rounded-xl"
              >
                <Image
                  src={banner.image}
                  alt={banner.alt}
                  width={1200}
                  height={480}
                  unoptimized
                  className="h-auto w-full"
                />
              </Link>
            ) : (
              <Image
                key={banner.id}
                src={banner.image}
                alt={banner.alt}
                width={1200}
                height={480}
                unoptimized
                className="h-auto w-full rounded-xl"
              />
            ),
          )}
        </div>
      )}

      <BrandBrowser brands={brands} preview={site.brandsPage} />
    </Container>
  );
}
