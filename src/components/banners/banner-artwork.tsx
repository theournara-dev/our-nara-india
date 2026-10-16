import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The content a banner can draw: the artwork plus, for a "custom" banner, the
 * heading and subheading laid over it. Standalone banners (the Banners admin)
 * and the page builder's banner lists share this shape, so one banner renders
 * the same wherever a component places it (client's slide 3).
 */
export interface BannerContent {
  /** Desktop artwork. */
  image: string;
  /** Taller artwork for small screens; falls back to `image`. */
  mobileImage?: string | null;
  alt?: string | null;
  /** "image" shows the artwork as uploaded; "custom" draws the text over it. */
  style?: string | null;
  heading?: string | null;
  subheading?: string | null;
  /** Horizontal placement of the text: "left" | "center" | "right". */
  textAlign?: string | null;
  /** Vertical placement of the text: "top" | "middle" | "bottom". */
  textVAlign?: string | null;
  /** Hex colour for the text; the storefront's white when empty. */
  textColor?: string | null;
  /** Dark gradient behind the text so it reads over any artwork. */
  scrim?: boolean | null;
}

const ALIGN_X: Record<string, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

const ALIGN_Y: Record<string, string> = {
  top: "justify-start",
  middle: "justify-center",
  bottom: "justify-end",
};

/** Text inset, in percent so it scales with whatever box the banner sits in. */
const INSET = "inset-x-[6%] py-[5%]";

/**
 * One banner's artwork with its optional text. The caller owns the box (height
 * and width), so the same banner can be shown at the many sizes the storefront
 * uses it at — the previews in the admin rely on that too.
 */
export function BannerArtwork({
  banner,
  className,
  priority = false,
  fit = "cover",
}: {
  banner: BannerContent;
  className?: string;
  /** Eager-load the artwork (first/above-the-fold use). */
  priority?: boolean;
  /**
   * "cover" fills the box the caller sized (cropping the artwork); "natural"
   * lets the artwork keep its own proportions, for the components that render
   * banners at whatever ratio they were uploaded.
   */
  fit?: "cover" | "natural";
}) {
  const showText =
    banner.style === "custom" && Boolean(banner.heading || banner.subheading);
  const alignX = ALIGN_X[banner.textAlign ?? "left"] ?? ALIGN_X.left;
  const alignY = ALIGN_Y[banner.textVAlign ?? "bottom"] ?? ALIGN_Y.bottom;
  const natural = fit === "natural";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        !natural && "h-full",
        className,
      )}
    >
      {natural ? (
        <Image
          src={banner.image}
          alt={banner.alt ?? ""}
          width={1200}
          height={480}
          unoptimized
          priority={priority}
          sizes="(max-width: 767px) 96vw, 46vw"
          className="h-auto w-full"
        />
      ) : banner.mobileImage ? (
        <>
          <Image
            src={banner.image}
            alt={banner.alt ?? ""}
            fill
            unoptimized
            priority={priority}
            sizes="(max-width: 767px) 96vw, 92vw"
            className="hidden object-cover md:block"
          />
          <Image
            src={banner.mobileImage}
            alt={banner.alt ?? ""}
            fill
            unoptimized
            priority={priority}
            sizes="96vw"
            className="object-cover md:hidden"
          />
        </>
      ) : (
        <Image
          src={banner.image}
          alt={banner.alt ?? ""}
          fill
          unoptimized
          priority={priority}
          sizes="(max-width: 767px) 96vw, 92vw"
          className="object-cover"
        />
      )}

      {showText && (
        <>
          {banner.scrim !== false && (
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0",
                banner.textVAlign === "top"
                  ? "bg-gradient-to-b from-black/45 via-black/10 to-transparent"
                  : banner.textVAlign === "middle"
                    ? "bg-black/25"
                    : "bg-gradient-to-t from-black/45 via-black/10 to-transparent",
              )}
            />
          )}
          <span className={cn("absolute flex flex-col", INSET, alignY)}>
            <span className={cn("flex w-full flex-col", alignX)}>
              {banner.heading && (
                <span
                  className="block text-lg font-bold leading-tight drop-shadow md:text-2xl"
                  style={
                    banner.textColor ? { color: banner.textColor } : undefined
                  }
                >
                  {banner.heading}
                </span>
              )}
              {banner.subheading && (
                <span
                  className="mt-0.5 block text-[11px] font-medium drop-shadow md:text-sm"
                  style={
                    banner.textColor
                      ? { color: banner.textColor }
                      : { color: "rgba(255,255,255,0.9)" }
                  }
                >
                  {banner.subheading}
                </span>
              )}
            </span>
          </span>
        </>
      )}
    </div>
  );
}
