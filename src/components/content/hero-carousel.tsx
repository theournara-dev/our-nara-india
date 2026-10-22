"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Swiper from "swiper";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { SliderNav } from "@/components/ui/slider-nav";
import { toLoopable } from "@/lib/carousel";
import { HiPause, HiPlay } from "react-icons/hi2";
import type { HeroSlide } from "@/lib/page-builder/types";
import { defaultHeroSlides } from "@/data/hero";
import { useSiteVersion } from "@/components/site-version-provider";

interface HeroCarouselProps {
  slides?: HeroSlide[];
  /** Desktop card height in px; 0 keeps the artwork's proportions. */
  height?: number;
  /** Cards across on desktop (>= 1200px). */
  slidesPerView?: number;
  /** Admin editor: no outer margins, and slides do not navigate away. */
  preview?: boolean;
}

export function HeroCarousel({
  slides = [],
  height = 0,
  slidesPerView = 3.7,
  preview = false,
}: HeroCarouselProps) {
  const { config } = useSiteVersion();
  const rootRef = useRef<HTMLDivElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<Swiper | null>(null);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);

  // Fall back to the original slides when the section has none, so the
  // homepage never regresses before content is configured.
  const items: HeroSlide[] = slides.length > 0 ? slides : defaultHeroSlides;
  const desktop = Math.min(Math.max(slidesPerView, 1), 6);
  // Swiper rewrites the slide's own inline styles on loop updates, so the
  // shape lives on the slide's child (which Swiper never touches).
  const cardStyle =
    height > 0
      ? ({
          // Fill the slide: without this the card would size its own width.
          width: "100%",
          // Desktop height comes from globals.css. Everywhere else the card
          // keeps the artwork's proportions, cropped at this height.
          maxHeight: `${height}px`,
          overflow: "hidden",
        } as CSSProperties)
      : undefined;
  const heroSlides = useMemo(
    // The tablet count is the largest non-desktop breakpoint below, so it also
    // decides how many copies loop mode needs when desktop asks for fewer.
    // Keyed by slide id, so editing a slide's image keeps its node.
    () => toLoopable(items, Math.max(desktop, 2.5), (s) => s.id),
    [items, desktop],
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const swiper = new Swiper(el, {
      modules: [Autoplay, Pagination],
      speed: 600,
      slidesPerView: 1.2,
      spaceBetween: 16,
      centeredSlides: true,
      loop: true,
      autoplay: { delay: 3000, disableOnInteraction: false },
      // The preview renders the carousel at a fixed desktop width inside a
      // narrower sheet, so it measures its own box. The storefront keeps
      // Swiper's window base, and with it the original breakpoint thresholds.
      breakpointsBase: preview ? "container" : "window",
      pagination: {
        el: paginationRef.current as HTMLElement,
        type: "progressbar",
        clickable: true,
      },
      breakpoints: {
        768: { slidesPerView: 2.5, spaceBetween: 16 },
        1200: { slidesPerView: desktop, spaceBetween: 16 },
      },
      on: {
        init: () => {
          setReady(true);
          // A re-init (slides count changed) starts a fresh autoplay.
          setPaused(false);
        },
      },
    });

    swiperRef.current = swiper;
    return () => {
      swiper.destroy(true, true);
      swiperRef.current = null;
    };
  }, [desktop, preview]);

  return (
    <div
      className={`mx-auto w-full overflow-x-clip ${
        preview ? "" : "mt-5 mb-15 max-md:mt-0 max-md:mb-10"
      }`}
      // The height variable lives here, not on the Swiper root: Swiper strips
      // that element's inline style during loop updates. Desktop reads the var
      // from globals.css; below the breakpoint the card keeps the artwork's
      // proportions, capped at this height.
      data-hero-height={height > 0 ? "" : undefined}
      style={
        height > 0
          ? ({ "--hero-h": `${height}px` } as CSSProperties)
          : undefined
      }
    >
      <div
        className={`hero-carousel swiper transition-opacity duration-300 ${
          ready ? "opacity-100" : "opacity-0 min-h-20"
        }`}
        ref={rootRef}
      >
        <div className="swiper-wrapper">
          {heroSlides.map(({ key, item: slide }) => (
            <div
              key={key}
              className="swiper-slide relative rounded-2xl opacity-50 [&.swiper-slide-active]:opacity-100 [&.swiper-slide-prev]:opacity-100 [&.swiper-slide-next]:opacity-100"
            >
              {slide.preorder && config.preOrderEnabled && (
                <div className="pointer-events-none absolute right-5 top-5 z-10 flex h-20 w-20 items-center justify-center rounded-full bg-point-500 text-center text-[13px] font-semibold leading-tight tracking-wide text-white">
                  PRE
                  <br />
                  ORDER
                </div>
              )}
              {preview ? (
                <div className="block h-full" style={cardStyle}>
                  <HeroImage slide={slide} desktop={desktop} />
                </div>
              ) : (
                <Link href={slide.href ?? "/"} style={cardStyle}>
                  <HeroImage slide={slide} desktop={desktop} />
                </Link>
              )}
              {slide.title && (
                <div className="absolute bottom-[8%] left-[10%] text-left tracking-tight text-white max-md:bottom-[6%] max-md:left-[8%]">
                  <h3 className="text-2xl font-semibold leading-8">
                    {slide.title}
                  </h3>
                  <p className="mt-2 text-lg leading-6">{slide.description}</p>
                  {slide.brand &&
                    slide.href &&
                    (preview ? (
                      <span className="mt-6 inline-block rounded-full border border-white bg-white px-5 py-3 text-sm font-medium text-black max-md:mt-4 max-md:px-4 max-md:py-2">
                        {slide.brand}
                      </span>
                    ) : (
                      <Link
                        href={slide.href}
                        className="mt-6 inline-block rounded-full border border-white bg-white px-5 py-3 text-sm font-medium text-black max-md:mt-4 max-md:px-4 max-md:py-2"
                      >
                        {slide.brand}
                      </Link>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Nav controls (below the slider) */}
      <SliderNav
        paginationRef={paginationRef}
        paginationClassName="swiper-pagination-main"
        onPrev={() => swiperRef.current?.slidePrev()}
        onNext={() => swiperRef.current?.slideNext()}
      >
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Pause"
            className="cursor-pointer hover:opacity-50 transition-opacity duration-150"
            onClick={() => {
              if (paused) {
                swiperRef.current?.autoplay.start();
              } else {
                swiperRef.current?.autoplay.stop();
              }
              setPaused(!paused);
            }}
          >
            {!paused ? <HiPause size={24} /> : <HiPlay size={24} />}
          </button>
        </div>
      </SliderNav>
    </div>
  );
}

/**
 * Hero slide image with a loading state. While the (often large) image is
 * loading it shows a subtle shimmer placeholder instead of a blank white area,
 * then fades the image in once it has decoded.
 */
function HeroImage({
  slide,
  desktop,
}: {
  slide: HeroSlide;
  desktop: number;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative overflow-hidden flex size-full rounded-xl bg-zinc-100">
      {!loaded && (
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse bg-zinc-200"
        />
      )}
      <Image
        src={slide.image}
        alt={slide.title ?? "OUR:NARA"}
        width={830}
        height={1100}
        sizes={`(min-width: 1200px) ${(100 / desktop).toFixed(
          1,
        )}vw, (min-width: 768px) 40vw, 85vw`}
        loading="eager" // carousel slides are translated off-screen; eager avoids blank slides
        onLoad={() => setLoaded(true)}
        className={`relative h-full w-full object-cover transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
