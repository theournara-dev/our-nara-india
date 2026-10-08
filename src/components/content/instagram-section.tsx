"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { instagramPosts } from "@/data/instagram";
import type { InstagramPost } from "@/data/instagram";

/** Gap between posts, matching the original's Swiper `spaceBetween: 10`. */
const GAP = 10;
/**
 * The original runs `autoplay` with `delay: 0` and `speed: 5000` over a linear
 * timing function, i.e. one post + gap every 5 seconds, forever.
 */
const MS_PER_STEP = 5000;
/** After a drag the marquee rests, then resumes, so taps stay calm. */
const RESUME_DELAY_MS = 1200;
/** A pointer that travelled further than this is a drag, not a click. */
const DRAG_SLOP_PX = 5;

/**
 * Home Instagram strip, reproducing the original `insta` section: a continuously
 * scrolling marquee of rounded square posts under the #our__nara title.
 *
 * Motion is driven by requestAnimationFrame with a GPU-friendly transform, so it
 * stays smooth on phones (the CSS animation it replaces could be paused for good
 * by the tap-hover it used). Frames stop while the strip is off-screen or the
 * tab is hidden, pause on hover / touch / drag, and never start when the visitor
 * prefers reduced motion.
 */
export function InstagramSection({ posts = [] }: { posts?: InstagramPost[] }) {
  const marqueeRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Fall back to the original posts when the section has none configured.
  const items = posts.length > 0 ? posts : instagramPosts;

  useEffect(() => {
    const marquee = marqueeRef.current;
    const track = trackRef.current;
    if (!marquee || !track) return;
    const half = track.children.length / 2;
    if (half < 1 || !Number.isInteger(half)) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");

    let cycle = 0; // width of one full set of posts, gap included
    let speed = 0; // px per second
    let offset = 0;
    let raf = 0;
    let last: number | null = null;
    let dragging = false;
    let dragStartX = 0;
    let dragStartOffset = 0;
    let draggedPx = 0;
    let pausedUntil = 0;
    let hovering = false;
    let visible = true;
    let wasDragging = false;

    const apply = () => {
      track.style.transform = `translate3d(${(-offset).toFixed(2)}px, 0, 0)`;
    };

    const measure = () => {
      const first = track.children[0] as HTMLElement | undefined;
      const second = track.children[half] as HTMLElement | undefined;
      if (!first || !second) return;
      cycle = second.offsetLeft - first.offsetLeft;
      speed =
        (first.getBoundingClientRect().width + GAP) / (MS_PER_STEP / 1000);
      offset = cycle > 0 ? ((offset % cycle) + cycle) % cycle : 0;
      apply();
    };

    const shouldRun = () =>
      visible && !document.hidden && !reduceMotion.matches;

    const frame = (now: number) => {
      raf = 0;
      // Capped so a long stop (off-screen, hidden tab) resumes without a jump.
      const dt = last === null ? 0 : Math.min(now - last, 100);
      last = now;
      if (!dragging && !hovering && now >= pausedUntil && cycle > 0) {
        offset = (offset + (speed * dt) / 1000) % cycle;
        apply();
      }
      start();
    };

    const start = () => {
      if (raf || !shouldRun()) return;
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      dragStartX = event.clientX;
      dragStartOffset = offset;
      draggedPx = 0;
      marquee.classList.add("is-dragging");
      marquee.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - dragStartX;
      draggedPx = Math.max(draggedPx, Math.abs(dx));
      offset = dragStartOffset - dx;
      if (cycle > 0) offset = ((offset % cycle) + cycle) % cycle;
      apply();
    };

    const onPointerEnd = () => {
      if (!dragging) return;
      dragging = false;
      wasDragging = true;
      marquee.classList.remove("is-dragging");
      pausedUntil = performance.now() + RESUME_DELAY_MS;
      start();
      // Reset after the click event that follows this pointer has been seen.
      window.setTimeout(() => {
        wasDragging = false;
      }, 0);
    };

    // A drag that ends on a post must not open it.
    const onClick = (event: MouseEvent) => {
      if (draggedPx > DRAG_SLOP_PX || wasDragging) {
        event.preventDefault();
        event.stopPropagation();
        draggedPx = 0;
      }
    };

    const onEnter = () => {
      if (canHover.matches) hovering = true;
    };
    const onLeave = () => {
      if (canHover.matches) hovering = false;
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const onResize = () => {
      measure();
      start();
    };

    const onReduceMotion = () => {
      if (reduceMotion.matches) stop();
      else start();
    };

    const resizeObserver = new ResizeObserver(() => {
      measure();
      start();
    });
    resizeObserver.observe(track);

    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      },
      { rootMargin: "120px" },
    );
    intersection.observe(marquee);

    marquee.addEventListener("pointerdown", onPointerDown);
    marquee.addEventListener("pointermove", onPointerMove);
    marquee.addEventListener("pointerup", onPointerEnd);
    marquee.addEventListener("pointercancel", onPointerEnd);
    marquee.addEventListener("click", onClick, true);
    marquee.addEventListener("pointerenter", onEnter);
    marquee.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    reduceMotion.addEventListener("change", onReduceMotion);

    measure();
    start();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersection.disconnect();
      marquee.removeEventListener("pointerdown", onPointerDown);
      marquee.removeEventListener("pointermove", onPointerMove);
      marquee.removeEventListener("pointerup", onPointerEnd);
      marquee.removeEventListener("pointercancel", onPointerEnd);
      marquee.removeEventListener("click", onClick, true);
      marquee.removeEventListener("pointerenter", onEnter);
      marquee.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      reduceMotion.removeEventListener("change", onReduceMotion);
    };
  }, []);

  if (items.length === 0) return null;

  // The list is doubled so the track can wrap seamlessly at half its width.
  const doubled = [...items, ...items];

  return (
    <section className="insta">
      <div className="insta-inner">
        <div className="sub-title">
          <h2>
            <span className="sub">
              <a
                href="https://www.instagram.com/our__nara/"
                target="_blank"
                rel="noopener noreferrer"
              >
                INSTAGRAM #our__nara
              </a>
            </span>
            Influencer story proven by 10,000+ reviews
          </h2>
        </div>

        <div className="insta-marquee" ref={marqueeRef}>
          <div className="insta-marquee-track" ref={trackRef}>
            {doubled.map((post, i) => (
              <InstagramItem key={`${post.id}-${i}`} post={post} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** A single marquee item: image, optionally wrapped in a link to the post. */
function InstagramItem({ post }: { post: InstagramPost }) {
  const img = (
    <Image
      src={post.image}
      alt={post.alt}
      width={400}
      height={400}
      loading="lazy"
      draggable={false}
      unoptimized
    />
  );
  return post.href ? (
    <a
      href={post.href}
      target="_blank"
      rel="noopener noreferrer"
      className="insta-item"
      // Links are natively draggable; that would start a link drag on the
      // first move and cancel the pointer sequence that drives the marquee.
      draggable={false}
    >
      {img}
    </a>
  ) : (
    <div className="insta-item">{img}</div>
  );
}
