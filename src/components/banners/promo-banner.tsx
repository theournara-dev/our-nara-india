import Link from "next/link";
import { BannerArtwork } from "@/components/banners/banner-artwork";
import type { LongBanner } from "@/data/banners";

/**
 * The single promo block under a category page's long banner (client's slide 4,
 * where it used to be the "ad block"). One banner image, shown at the height the
 * admin set — 0 keeps the artwork's own proportions, any pixel value crops it to
 * that height. The banner's own link is used when it has one, otherwise the
 * artwork renders plain, the same rule the brands page uses for its top banners.
 */
export function PromoBanner({
  banner,
  height = 0,
}: {
  banner: LongBanner;
  /** Height in pixels; 0 keeps the artwork's own proportions. */
  height?: number;
}) {
  const pinned = height > 0;
  const artwork = (
    <span
      className="block overflow-hidden rounded-2xl bg-[#f6f6f6]"
      style={pinned ? { height } : undefined}
    >
      <BannerArtwork
        banner={{
          image: banner.image,
          mobileImage: banner.mobileImage,
          alt: banner.alt,
          style: banner.style,
          heading: banner.heading,
          subheading: banner.subheading,
          textAlign: banner.textAlign,
          textVAlign: banner.textVAlign,
          textColor: banner.textColor,
          scrim: banner.scrim,
        }}
        fit={pinned ? "cover" : "natural"}
      />
    </span>
  );

  if (!banner.href) return artwork;
  return (
    <Link href={banner.href} className="block">
      {artwork}
    </Link>
  );
}
