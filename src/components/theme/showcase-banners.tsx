import Image from "next/image";
import Link from "next/link";
import type { ShowcaseBanner } from "@/lib/page-builder/types";

/**
 * Promo banners above a product section (the client's brand sections). One
 * banner runs full width, two or three share the row. `style: "image"` shows
 * the uploaded artwork as-is; `style: "custom"` overlays a title and subtitle
 * in the lower-left corner so an admin can compose a banner from any image.
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
            <Image
              src={banner.image}
              alt={banner.title ?? ""}
              width={1200}
              height={480}
              unoptimized
              className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.02]"
            />
            {banner.style === "custom" && (banner.title || banner.sub) && (
              <>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent"
                />
                <span className="absolute bottom-4 left-5 right-5 block text-left">
                  {banner.title && (
                    <span className="block text-lg font-bold leading-snug text-white drop-shadow md:text-xl">
                      {banner.title}
                    </span>
                  )}
                  {banner.sub && (
                    <span className="mt-0.5 block text-xs font-medium text-white/90 drop-shadow md:text-sm">
                      {banner.sub}
                    </span>
                  )}
                </span>
              </>
            )}
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
