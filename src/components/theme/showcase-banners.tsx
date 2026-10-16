import Link from "next/link";
import { BannerArtwork } from "@/components/banners/banner-artwork";
import type { ShowcaseBanner } from "@/lib/page-builder/types";

/**
 * Promo banners above a product section (the client's brand sections). One
 * banner runs full width, two or three share the row. The artwork and its text
 * come from the same renderer the standalone banners use, so a banner looks the
 * same wherever a component places it.
 */
export function ShowcaseBanners({ banners }: { banners?: ShowcaseBanner[] }) {
  if (!banners || banners.length === 0) return null;

  const gridClass =
    banners.length === 1
      ? ""
      : banners.length === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-3";

  return (
    <div className={`mb-8 grid gap-3 ${gridClass}`}>
      {banners.map((banner) => {
        const content = (
          <span className="relative block overflow-hidden rounded-2xl">
            <BannerArtwork
              banner={{
                image: banner.image,
                alt: banner.alt ?? banner.title ?? "",
                style: banner.style,
                heading: banner.title,
                subheading: banner.sub,
              }}
              fit="natural"
              className="transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </span>
        );

        return banner.href ? (
          <Link key={banner.id} href={banner.href} className="group block">
            {content}
          </Link>
        ) : (
          <div key={banner.id} className="group block">
            {content}
          </div>
        );
      })}
    </div>
  );
}
