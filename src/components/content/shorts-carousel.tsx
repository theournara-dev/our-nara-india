"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import Swiper from "swiper";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import type { ShortsPick, ShortsPlatform } from "@/data/shorts";
import { formatMoney } from "@/lib/money";
import { toLoopable } from "@/lib/carousel";
import {
  getEmbedSrc,
  getTikTokThumbnail,
  getYouTubeThumbnail,
  parseShortsUrl,
} from "@/lib/shorts";
import { SliderNav } from "@/components/ui/slider-nav";

// Largest `slidesPerView` in the breakpoints below. `toLoopable` duplicates
// the shorts until there are enough for Swiper's loop mode, so the reels keep
// looping like the hero regardless of how few the admin has configured.
const MAX_SLIDES_PER_VIEW = 5;

interface ShortsCarouselProps {
  picks: ShortsPick[];
}

/**
 * "Shorts Picks" reels carousel. Reproduces the original section: a Swiper of
 * portrait video cards where only the active slide embeds its platform player
 * (YouTube Shorts / TikTok / Instagram Reels) and the rest show a poster.
 *
 * The embed is injected into the active slide's `.video-wrap` directly (the
 * same approach as the original site) so it works correctly with Swiper's
 * `loop` clone nodes. A product info bar overlays the bottom of each card.
 */
export function ShortsCarousel({ picks }: ShortsCarouselProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<Swiper | null>(null);
  const [ready, setReady] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const slides = useMemo(
    () => toLoopable(picks, MAX_SLIDES_PER_VIEW, (s) => s.id),
    [picks],
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const swiper = new Swiper(el, {
      modules: [Autoplay, Pagination],
      speed: 600,
      slidesPerView: 1.4,
      spaceBetween: 16,
      loop: true,
      centeredSlides: true,
      autoplay: { delay: 5000, disableOnInteraction: false },
      pagination: {
        el: paginationRef.current as HTMLElement,
        type: "progressbar",
        clickable: true,
      },
      breakpoints: {
        768: { slidesPerView: 2.4, spaceBetween: 16 },
        1200: { slidesPerView: MAX_SLIDES_PER_VIEW, spaceBetween: 16 },
      },
      on: {
        init: (s) => {
          setReady(true);
          setCanPrev(!s.isBeginning);
          setCanNext(!s.isEnd);
          playActiveShortsVideo(el);
        },
        slideChange: (s) => {
          setCanPrev(!s.isBeginning);
          setCanNext(!s.isEnd);
          playActiveShortsVideo(el);
        },
        reachBeginning: () => setCanPrev(false),
        reachEnd: () => setCanNext(false),
        fromEdge: (s) => {
          setCanPrev(!s.isBeginning);
          setCanNext(!s.isEnd);
        },
      },
    });

    swiperRef.current = swiper;
    return () => {
      swiper.destroy(true, true);
      swiperRef.current = null;
    };
  }, []);

  if (slides.length === 0) return null;

  return (
    <div>
      <div
        ref={rootRef}
        className={`shorts-section swiper transition-opacity duration-300 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <ul className="swiper-wrapper">
          {slides.map(({ key, item }) => (
            <li key={key} className="swiper-slide">
              <ShortsSlide pick={item} />
            </li>
          ))}
        </ul>
      </div>

      <SliderNav
        paginationRef={paginationRef}
        paginationClassName="swiper-pagination-shorts"
        onPrev={() => swiperRef.current?.slidePrev()}
        onNext={() => swiperRef.current?.slideNext()}
        canPrev={canPrev}
        canNext={canNext}
      />
    </div>
  );
}

/** A single short: poster/video stage + product info bar. */
function ShortsSlide({ pick }: { pick: ShortsPick }) {
  const parsed = parseShortsUrl(pick.videoUrl);
  const platformThumb =
    parsed?.type === "youtube" ? getYouTubeThumbnail(parsed.id) : undefined;
  // Always show a product thumbnail; fall back to the poster when unset.
  const productImage = pick.productImage ?? pick.posterUrl;

  return (
    <div className="shorts-slide">
      <div
        className="video-wrap"
        data-video-type={parsed?.type}
        data-video-id={parsed?.id}
        data-video-url={pick.videoUrl}
        style={{
          backgroundImage: `url("${pick.thumbnailUrl ?? platformThumb ?? pick.posterUrl ?? ""}")`,
        }}
      />

      <div className="info-bar">
        {productImage && (
          <div className="thumb">
            {pick.productHref ? (
              <Link
                href={pick.productHref}
                className="img_zoom"
                aria-label={pick.title}
              >
                <Image
                  src={productImage}
                  alt={pick.title}
                  width={200}
                  height={200}
                  unoptimized
                />
              </Link>
            ) : (
              <Image
                src={productImage}
                alt={pick.title}
                width={200}
                height={200}
                unoptimized
              />
            )}
          </div>
        )}
        <div className="info-text">
          {pick.brand && <span className="brand">[{pick.brand}]</span>}
          <strong className="name">
            {pick.productHref ? (
              <Link href={pick.productHref}>{pick.title}</Link>
            ) : (
              pick.title
            )}
          </strong>
          {pick.shortTags && (
            <span className="tags">{pick.shortTags.join(" · ")}</span>
          )}
          {pick.priceCents != null && (
            <span className="price">
              {formatMoney(pick.priceCents, pick.currency ?? "INR")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Clear every slide's embed and mount a player only in the active slide,
 * mirroring the original site's `playActiveShortsVideo`. Runs against the
 * live DOM so it also targets Swiper's `loop` clones.
 */
function playActiveShortsVideo(root: HTMLElement) {
  root.querySelectorAll<HTMLDivElement>(".video-wrap").forEach((wrap) => {
    wrap.innerHTML = "";
  });

  const active = root.querySelector(".swiper-slide-active");
  if (!active) return;

  const wrap = active.querySelector<HTMLDivElement>(".video-wrap");
  if (!wrap) return;

  const type = wrap.dataset.videoType as ShortsPlatform | undefined;
  const id = wrap.dataset.videoId;
  if (!type || !id) return;

  // Best-effort poster refresh for TikTok (no static thumbnail exists).
  if (type === "tiktok" && wrap.dataset.videoUrl) {
    getTikTokThumbnail(wrap.dataset.videoUrl).then((thumb) => {
      if (thumb) wrap.style.backgroundImage = `url("${thumb}")`;
    });
  }

  const iframe = document.createElement("iframe");
  iframe.src = getEmbedSrc({ type, id });
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute(
    "allow",
    "autoplay; encrypted-media; picture-in-picture; fullscreen",
  );
  iframe.setAttribute("allowfullscreen", "true");
  iframe.setAttribute("title", "Shorts video");
  wrap.appendChild(iframe);
}
