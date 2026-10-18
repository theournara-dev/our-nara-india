"use client";

import Link from "next/link";
import Image from "next/image";
import { Volume2, VolumeX } from "lucide-react";
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
  setVolumeCommand,
  volumeCommand,
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
  const root = document.querySelector<HTMLElement>(
    ".shorts-section .shorts-swiper",
  );
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
 * Keep the custom volume control in step with the player. The slider shows 0
 * while muted but remembers the last audible level in `data-volume`.
 */
function syncVolumeControl(
  control: HTMLElement,
  muted: boolean,
  volume: number,
) {
  const level = Math.max(0, Math.min(100, Math.round(volume)));
  control.dataset.muted = String(muted);
  if (level > 0) control.dataset.volume = String(level);
  const slider = control.querySelector<HTMLInputElement>(
    ".shorts-volume-range",
  );
  if (slider) slider.value = String(muted ? 0 : level);
  const toggle = control.querySelector<HTMLButtonElement>(
    ".shorts-volume-toggle",
  );
  if (toggle) {
    const label = muted ? "Unmute video" : "Mute video";
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("aria-pressed", String(muted));
    toggle.title = label;
  }
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

  // Only the active slide's player may drive the carousel or its volume UI.
  const active = document.querySelector<HTMLIFrameElement>(
    ".shorts-section .swiper-slide-active iframe",
  );
  if (!active || ev.source !== active.contentWindow) return;

  const control = document.querySelector<HTMLElement>(
    ".shorts-section .swiper-slide-active .shorts-volume",
  );
  if (control) {
    if (d.event === "infoDelivery" && d.info && typeof d.info === "object") {
      const info = d.info as Record<string, unknown>;
      if (typeof info.muted === "boolean") {
        const volume =
          typeof info.volume === "number"
            ? info.volume
            : Number(control.dataset.volume) || 100;
        syncVolumeControl(control, info.muted, volume);
      }
    } else if (d.type === "onMute" && typeof d.value === "boolean") {
      syncVolumeControl(
        control,
        d.value,
        Number(control.dataset.volume) || 100,
      );
    } else if (d.type === "onVolumeChange" && typeof d.value === "number") {
      syncVolumeControl(control, control.dataset.muted === "true", d.value);
    }
  }

  if (d.event !== "onStateChange" && d.type !== "onStateChange") return;
  if ((d.value ?? d.info) !== 0) return;

  autoAdvance();
}

interface ShortsCarouselProps {
  picks: ShortsPick[];
}

/**
 * "Shorts Picks" reels carousel. Reproduces the original `shortsRoll` section:
 * a titled Swiper of rounded portrait video cards whose media box is widened
 * past the card (clipped by the card's rounded overflow). Only the active slide
 * embeds its platform player (YouTube Shorts / TikTok / Instagram Reels) and is
 * fully opaque — every other slide stays dimmed with a poster.
 *
 * The embed is injected into the active slide's `.video-wrap` directly (the
 * same approach as the original site) so it works correctly with Swiper's
 * `loop` clone nodes. A product info bar overlays the bottom of each card and
 * the nav row (progressbar + arrows) sits below the cards, inside the section.
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
    <div className="shorts-section">
      {/* Warm the browser cache for uploaded video files ahead of their slide
          becoming active (platform embeds can't be preloaded this way). */}
      {picks
        .filter((p) => p.videoFile)
        .map((p) => (
          <link key={p.id} rel="preload" as="video" href={p.videoFile} />
        ))}
      <div className="shorts-inner">
        <div className="title">
          <h2>
            <Image
              src="/upload/goodymall1/en/main/shorts.png"
              alt=""
              width={41}
              height={51}
              unoptimized
            />{" "}
            Shorts Picks
          </h2>
        </div>

        <div
          ref={rootRef}
          className={`shorts-swiper swiper transition-opacity duration-300 ${
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

          <SliderNav
            paginationRef={paginationRef}
            paginationClassName="swiper-pagination-shorts"
            onPrev={() => swiperRef.current?.slidePrev()}
            onNext={() => swiperRef.current?.slideNext()}
            canPrev={canPrev}
            canNext={canNext}
            className="shorts-nav"
          />
        </div>
      </div>
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
    videoThumb ?? videoFileThumb ?? pick.thumbnailUrl ?? pick.posterUrl ?? "";

  // Always show a product thumbnail; fall back to the poster when unset.
  const productImage = pick.productImage ?? pick.posterUrl;
  // A platform iframe gets the carousel's single volume control. An uploaded
  // file keeps the browser's own controls (there is no cross-origin player to
  // message). Instagram exposes no mute API, so it also keeps its own UI.
  const hasEmbed =
    !pick.videoFile &&
    (parsed?.type === "youtube" || parsed?.type === "tiktok");

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

      {hasEmbed && parsed ? (
        <div
          className="shorts-volume"
          data-muted={parsed.type === "youtube" ? "true" : "false"}
          data-volume="100"
        >
          <button
            type="button"
            className="shorts-volume-toggle"
            aria-label={
              parsed.type === "youtube" ? "Unmute video" : "Mute video"
            }
            aria-pressed={parsed.type === "youtube"}
            title={parsed.type === "youtube" ? "Unmute video" : "Mute video"}
            onClick={(event) => {
              const control =
                event.currentTarget.closest<HTMLElement>(".shorts-volume");
              if (!control) return;
              const muting = control.dataset.muted !== "true";
              const lastVolume = Number(control.dataset.volume) || 100;
              const iframe = control
                .closest(".shorts-slide")
                ?.querySelector("iframe");
              const muteMessage = volumeCommand(parsed.type, muting);
              if (iframe && muteMessage) {
                iframe.contentWindow?.postMessage(muteMessage, "*");
              }
              if (muting) {
                syncVolumeControl(control, true, lastVolume);
                return;
              }
              const volumeMessage = setVolumeCommand(parsed.type, lastVolume);
              if (iframe && volumeMessage) {
                iframe.contentWindow?.postMessage(volumeMessage, "*");
              }
              syncVolumeControl(control, false, lastVolume);
            }}
          >
            <VolumeX size={15} aria-hidden className="shorts-volume-off" />
            <Volume2 size={15} aria-hidden className="shorts-volume-on" />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            defaultValue={parsed.type === "youtube" ? 0 : 100}
            className="shorts-volume-range"
            aria-label="Volume"
            onInput={(event) => {
              const slider = event.currentTarget;
              const control = slider.closest<HTMLElement>(".shorts-volume");
              if (!control) return;
              const volume = Number(slider.value);
              const iframe = control
                .closest(".shorts-slide")
                ?.querySelector("iframe");
              if (volume === 0) {
                const message = volumeCommand(parsed.type, true);
                if (iframe && message) {
                  iframe.contentWindow?.postMessage(message, "*");
                }
                syncVolumeControl(
                  control,
                  true,
                  Number(control.dataset.volume) || 100,
                );
                return;
              }
              if (control.dataset.muted === "true") {
                const message = volumeCommand(parsed.type, false);
                if (iframe && message) {
                  iframe.contentWindow?.postMessage(message, "*");
                }
              }
              const message = setVolumeCommand(parsed.type, volume);
              if (iframe && message) {
                iframe.contentWindow?.postMessage(message, "*");
              }
              syncVolumeControl(control, false, volume);
            }}
          />
        </div>
      ) : null}

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
    wrap.classList.remove("has-player");
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
    wrap.classList.add("has-player");
    wrap.appendChild(video);
    return;
  }

  const type = wrap.dataset.videoType as ShortsPlatform | undefined;
  const id = wrap.dataset.videoId;
  if (!type || !id) return;

  // The slider must match the freshly-mounted player: YouTube starts muted
  // (autoplay policy), TikTok starts at full volume.
  const control = active.querySelector<HTMLElement>(".shorts-volume");
  if (control) syncVolumeControl(control, type === "youtube", 100);

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

  wrap.classList.add("has-player");
  wrap.appendChild(iframe);
}
