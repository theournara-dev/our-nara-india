import Image from "next/image";
import { brandBannerHeight } from "@/lib/brand-banner";

/**
 * A brand page's banner (client's slide 7): one raw image, full width — no page
 * margins — drawn at the height set in the admin (300px by default), cropped to
 * fill it. It is the page's own hero, so it sits above the breadcrumb and takes
 * no rounding, no overlay and no link of its own; brands without artwork render
 * nothing, so a page never shows an empty frame.
 */
export function BrandBanner({
  image,
  name,
  height,
}: {
  image: string | null | undefined;
  name: string;
  /** Height in pixels; see `brand-banner.ts` for the default and the limits. */
  height?: number | null;
}) {
  if (!image) return null;

  return (
    <div
      className="relative w-full overflow-hidden bg-[#f6f6f6]"
      style={{ height: brandBannerHeight(height) }}
    >
      <Image
        src={image}
        alt={`${name} banner`}
        fill
        unoptimized
        priority
        sizes="100vw"
        className="object-cover"
      />
    </div>
  );
}
