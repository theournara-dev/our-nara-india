"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import Swiper from "swiper";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import type { ShortsPick, ShortsPlatform } from "@/data/shorts";
import { formatMoney, priceForVersion } from "@/lib/money";
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

/** Minimum gap between auto-advances, so a platform's duplicate ended
 * events (or two platforms firing together) can't skip slides. */
const AUTO_ADVANCE_DEBOUNCE_MS = 1500;
let lastAutoAdvance = 0;

function getShortsSwiper() {
  const root = document.querySelector<HTMLElement>(".shorts-section");
  return root && (root as HTMLElement & { swiper?: Swiper }).swiper;
}

/** Advance to the next slide (called when the active video finishes playing;
 * manual navigation goes through the nav buttons instead). */
function autoAdvance() {
  const now = Date.now();
  if (now - lastAutoAdvance < AUTO_ADVANCE_DEBOUNCE_MS) return;
  lastAutoAdvance = now;
  getShortsSwiper()?.slideNext();
}

/**
 * Advance when the embedded player (TikTok / YouTube) reports that its video
 * ended, mirroring the native `<video>` `ended` handling. Both platforms post
 * `onStateChange` where 0 = ended; YouTube wraps the value in `info`, TikTok
 * in `value`, and the exact envelope differs across versions, so the shapes
 * are matched tolerantly. Instagram has no player API and simply stays until
 * the visitor navigates manually.
 */
function handlePlayerMessage(ev: MessageEvent) {
  const data = ev.data;
  if (!data || typeof data !== "object") return;
  const d = data as Record<string, unknown>;
  if (d.event !== "onStateChange" && d.type !== "onStateChange") return;
  if ((d.value ?? d.info) !== 0) return;

  // Only the active slide's player may advance the carousel.
  const active = document.querySelector<HTMLIFrameElement>(
    ".shorts-section .swiper-slide-active iframe",
  );
  if (!active || ev.source !== active.contentWindow) return;

  autoAdvance();
}

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
      modules: [Pagination],
      speed: 600,
      slidesPerView: 1.4,
      spaceBetween: 16,
      loop: true,
      centeredSlides: true,
      // No autoplay timer: slides advance when the active video finishes
      // playing (see handlePlayerMessage / the native `ended` listener) or on
      // manual navigation.
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

    // Swiper 14's loop mode physically reorders slides in the DOM and moves
    // slide classes around transitions (slideChange -> loopFix -> slideChange,
    // with more shifts afterwards), so the mounted player can end up on a
    // shifted non-active slide no matter which event mounted it. Watch the
    // DOM directly: whenever the active slide has no player, re-mount it there.
    const observer = new MutationObserver(() => {
      const active = el.querySelector(".swiper-slide-active");
      if (!active) return;
      if (active.querySelector(".video-wrap")?.childElementCount) return;
      playActiveShortsVideo(el);
    });
    observer.observe(el, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    window.addEventListener("message", handlePlayerMessage);

    swiperRef.current = swiper;
    return () => {
      observer.disconnect();
      window.removeEventListener("message", handlePlayerMessage);
      swiper.destroy(true, true);
      swiperRef.current = null;
    };
  }, []);

  if (slides.length === 0) return null;

  return (
    <div>
      {/* Warm the browser cache for uploaded video files ahead of their slide
          becoming active (platform embeds can't be preloaded this way). */}
      {picks
        .filter((p) => p.videoFile)
        .map((p) => (
          <link key={p.id} rel="preload" as="video" href={p.videoFile} />
        ))}
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
  // The video area shows the video's own thumbnail (the original site also
  // overlays the video box with the video's thumbnail, not the product shot).
  // TikTok has no static thumbnail URL, so its oEmbed thumbnail is fetched
  // client-side (module-cached) and falls back to the poster until it loads.
  const [videoThumb, setVideoThumb] = useState<string | undefined>(
    platformThumb,
  );
  const videoFileThumb = pick.videoFile ? pick.posterUrl : undefined;

  useEffect(() => {
    if (parsed?.type !== "tiktok" || !pick.videoUrl) return;
    let cancelled = false;
    getTikTokThumbnail(pick.videoUrl).then((thumb) => {
      if (!cancelled && thumb) setVideoThumb(thumb);
    });
    return () => {
      cancelled = true;
    };
  }, [parsed, pick.videoUrl]);

  const backgroundImage =
    videoThumb ??
    videoFileThumb ??
    pick.thumbnailUrl ??
    pick.posterUrl ??
    "";

  // Always show a product thumbnail; fall back to the poster when unset.
  const productImage = pick.productImage ?? pick.posterUrl;

  return (
    <div className="shorts-slide">
      <div
        className="video-wrap"
        data-video-type={parsed?.type}
        data-video-id={parsed?.id}
        data-video-url={pick.videoUrl}
        data-video-file={pick.videoFile}
        data-poster-url={pick.posterUrl ?? ""}
        style={{
          backgroundImage: `url("${backgroundImage}")`,
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
              {formatMoney(
                priceForVersion(pick.priceCents, undefined),
                pick.currency ?? "INR",
              )}
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

  // Uploaded video file → render a native <video> player. Only the active
  // slide mounts a player, so `preload="metadata"` keeps non-visible videos
  // from downloading until they're actually played.
  const file = wrap.dataset.videoFile;
  if (file) {
    const video = document.createElement("video");
    video.src = file;
    video.setAttribute("autoplay", "");
    video.setAttribute("muted", "");
    // No `loop`: the carousel advances to the next slide on `ended`.
    video.setAttribute("playsinline", "");
    video.setAttribute("controls", "");
    video.setAttribute("preload", "metadata");
    video.setAttribute("aria-label", "Shorts video");
    // No `loop`: the carousel advances to the next slide on `ended`.
    video.addEventListener("ended", autoAdvance);
    const poster = wrap.dataset.posterUrl;
    if (poster) video.setAttribute("poster", poster);
    wrap.appendChild(video);
    return;
  }

  const type = wrap.dataset.videoType as ShortsPlatform | undefined;
  const id = wrap.dataset.videoId;
  if (!type || !id) return;

  const iframe = document.createElement("iframe");
  iframe.src = getEmbedSrc({ type, id });
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute(
    "allow",
    "autoplay; encrypted-media; picture-in-picture; fullscreen",
  );
  iframe.setAttribute("allowfullscreen", "true");
  iframe.setAttribute("title", "Shorts video");

  // YouTube's JS API handshake: ask the player to start posting events
  // (`onStateChange` with `info: 0` fires when the video ends). Harmless for
  // other platforms; TikTok reports events without a handshake.
  iframe.addEventListener("load", () => {
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
      "*",
    );
  });

  wrap.appendChild(iframe);
}
