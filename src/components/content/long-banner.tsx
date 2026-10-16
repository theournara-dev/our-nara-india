import Link from "next/link";
import { BannerArtwork } from "@/components/banners/banner-artwork";
import type { LongBanner as LongBannerItem } from "@/data/banners";

/**
 * One admin-configured banner slot (see the page builder's long banner).
 * `banner` is null when the slot holds no banner (the "None" choice).
 */
export interface LongBannerCell {
  id: string;
  banner: LongBannerItem | null;
}

/** The share of the row one cell takes: 1 → full width, 2 → halves, 3 → thirds. */
const CELL_WIDTH = ["", "", "md:w-1/2", "md:w-1/3"];

/**
 * The long-banner section (client's slides 3–4): the admin sets how many columns
 * (1–3) and how tall the strip is, and picks one banner per column — a column
 * set to "None" hands its width to the others. On the home page the strip brings
 * the usual 92% / 1560px page container (`framed`); category listings render it
 * bare inside their own container. Each cell is one link to whatever the banner
 * points at, and the artwork goes through the shared renderer, which is why a
 * banner's own heading, text placement and scrim work wherever it is placed.
 *
 * `height: 0` keeps each banner's own proportions (what the strip did before
 * the height control existed); any other value pins the strip's height.
 */
export function LongBannerCells({
  cells,
  columns = 2,
  height = 0,
  framed = true,
}: {
  cells: LongBannerCell[];
  /** Columns across the strip on desktop (1–3); stacked on phones. */
  columns?: number;
  /** Strip height in pixels; 0 keeps the artwork's own proportions. */
  height?: number;
  /**
   * True on the home page, where the strip brings its own 92% / 1560px
   * container and section spacing. False when the caller already sits inside a
   * content container (the category listings), so the strip lines up with the
   * blocks around it instead of being inset twice.
   */
  framed?: boolean;
}) {
  const visible = (cells ?? []).filter(
    (cell): cell is LongBannerCell & { banner: LongBannerItem } =>
      Boolean(cell.banner),
  );
  if (visible.length === 0) return null;

  const pinned = height > 0;

  const row = (
    <div className="flex w-full flex-col gap-[10px] md:flex-row">
      {visible.map((cell) => (
        <Link
          key={cell.id}
          href={cell.banner.href ?? "/"}
          className={`group block w-full overflow-hidden rounded-2xl ${
            CELL_WIDTH[Math.min(visible.length, columns)] ?? ""
          } ${pinned ? "" : "aspect-[800/210] md:aspect-[2172/260]"}`}
          style={pinned ? { height } : undefined}
        >
          <BannerArtworkCell banner={cell.banner} />
        </Link>
      ))}
    </div>
  );

  if (!framed) return row;
  return <div className="long-banner">{row}</div>;
}

/** Bridges the data layer's banner shape onto the shared artwork renderer. */
function BannerArtworkCell({ banner }: { banner: LongBannerItem }) {
  return (
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
      className="transition-transform duration-500 group-hover:scale-[1.01]"
    />
  );
}
