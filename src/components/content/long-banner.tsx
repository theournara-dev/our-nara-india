"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Swiper from "swiper";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";
import { BannerArtwork } from "@/components/banners/banner-artwork";
import type { LongBanner as LongBannerItem } from "@/data/banners";
import { toLoopable } from "@/lib/carousel";

const MAX_SLIDES_PER_VIEW = 1;

interface LongBannerProps {
  banners: LongBannerItem[];
}

/**
 * Full-width, rounded banner carousel reproducing the original `longBanner01`
 * section. Always loops (even with a single banner), has hover-reveal chevron
 * arrows, bullet pagination (when there are 2+ banners), and a grab cursor for
 * dragging. Renders nothing when there are no banners.
 */
export function LongBanner({ banners }: LongBannerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  const hasMultiple = banners.length > 1;
  const slides = useMemo(
    () => toLoopable(banners, MAX_SLIDES_PER_VIEW, (b) => b.id),
    [banners],
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const swiper = new Swiper(el, {
      modules: hasMultiple
        ? [Autoplay, Navigation, Pagination]
        : [Autoplay, Navigation],
      speed: 600,
      spaceBetween: 0,
      centeredSlides: true,
      loop: true,
      grabCursor: true,
      autoplay: { delay: 3000, disableOnInteraction: false },
      ...(hasMultiple
        ? {
            pagination: {
              el: paginationRef.current as HTMLElement,
              clickable: true,
            },
          }
        : {}),
      navigation: {
        prevEl: prevRef.current as HTMLElement,
        nextEl: nextRef.current as HTMLElement,
      },
      on: {
        init: () => setReady(true),
      },
    });

    return () => {
      swiper.destroy(true, true);
    };
  }, [hasMultiple]);

  if (banners.length === 0) return null;

  return (
    <div className="long-banner">
      <div
        ref={rootRef}
        className={`swiper long-slide transition-opacity duration-300 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="swiper-wrapper">
          {slides.map(({ key, item }) => (
            <div key={key} className="swiper-slide">
              <Link href={item.href ?? "/"}>
                <Image
                  src={item.image}
                  alt={item.alt}
                  width={2172}
                  height={260}
                  unoptimized
                  className="hidden w-full md:block"
                />
                <Image
                  src={item.mobileImage}
                  alt={item.alt}
                  width={800}
                  height={210}
                  unoptimized
                  className="w-full md:hidden"
                />
              </Link>
            </div>
          ))}
        </div>

        <button
          ref={prevRef}
          type="button"
          className="long-banner-arrow long-banner-prev"
          aria-label="Previous"
        >
          <MdKeyboardArrowLeft size={40} />
        </button>
        <button
          ref={nextRef}
          type="button"
          className="long-banner-arrow long-banner-next"
          aria-label="Next"
        >
          <MdKeyboardArrowRight size={40} />
        </button>

        {hasMultiple && (
          <div
            ref={paginationRef}
            className="swiper-pagination long-banner-pagination"
          />
        )}
      </div>
    </div>
  );
}

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
 * The long-banner section (client's slide 3): the admin sets how many columns
 * (1–3) and how tall the strip is, and picks one banner per column — a column
 * set to "None" hands its width to the others. Everything is inside the usual
 * 92% / 1560px page container, and each cell is one link to whatever the banner
 * points at.
 *
 * `height: 0` keeps each banner's own proportions (what the strip did before
 * the height control existed); any other value pins the strip's height.
 */
export function LongBannerCells({
  cells,
  columns = 2,
  height = 0,
}: {
  cells: LongBannerCell[];
  /** Columns across the strip on desktop (1–3); stacked on phones. */
  columns?: number;
  /** Strip height in pixels; 0 keeps the artwork's own proportions. */
  height?: number;
}) {
  const visible = (cells ?? []).filter(
    (cell): cell is LongBannerCell & { banner: LongBannerItem } =>
      Boolean(cell.banner),
  );
  if (visible.length === 0) return null;

  const pinned = height > 0;

  return (
    <div className="long-banner">
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
    </div>
  );
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
