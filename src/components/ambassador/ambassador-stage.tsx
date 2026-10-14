"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

/**
 * How far the visitor scrolls for one image: 75% of a viewport, so the
 * sequence advances faster than one full screen per image.
 */
const SCROLL_PER_IMAGE_SVH = 75;

/**
 * The /ambassador stage (client slide 12): a full-bleed section that pins to
 * the viewport while the visitor scrolls through the admin's images — one
 * image per viewport of scroll — then releases and the page carries on. The
 * application form is the right half and stays in view the whole time,
 * scrolling inside its own column when it is taller than the viewport.
 *
 * On phones the images simply stack above the form (no pinning).
 */
export function AmbassadorStage({
  images,
  children,
}: {
  images: {
    id: string;
    image: string;
    alt?: string | null;
    href?: string | null;
  }[];
  /** The application form (right column). */
  children: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || images.length <= 1) return;

    let raf = 0;

    /**
     * The stage is pinned for one viewport per image beyond the first, so the
     * scroll progress through that range picks the image: 0 at the start, the
     * last image once the range is spent (then the stage scrolls away).
     */
    const measure = () => {
      raf = 0;
      // Only the desktop stage is pinned; on phones the images are an
      // ordinary column and there is nothing to measure.
      if (!window.matchMedia("(min-width: 1024px)").matches) return;
      const range = el.offsetHeight - window.innerHeight;
      if (range <= 0) return;
      const progress = Math.min(
        Math.max(-el.getBoundingClientRect().top, 0),
        range,
      );
      const step = range / (images.length - 1);
      setActive(Math.min(images.length - 1, Math.round(progress / step)));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [images.length]);

  return (
    <section className="w-full">
      {/* The pinned range: one scroll slice per image (75% of a viewport, so
          the sequence moves faster than a full screen each time) and then the
          stage releases and the page moves on. */}
      <div
        ref={wrapRef}
        className="relative lg:h-[var(--ambassador-stage)]"
        style={
          {
            "--ambassador-stage": `${100 + SCROLL_PER_IMAGE_SVH * Math.max(images.length - 1, 0)}svh`,
          } as CSSProperties
        }
      >
        <div className="lg:sticky lg:top-0 lg:h-[100svh]">
          <div className="lg:grid lg:h-full lg:grid-cols-2">
            {/* Left half. */}
            <div className="lg:h-full">
              {/* Desktop/tablet: a single pane that fills the half; the image
                  changes as the visitor scrolls through the pinned stage. */}
              <div className="relative hidden h-full w-full overflow-hidden bg-[#f4f1ee] lg:block">
                {images.map((image, i) => {
                  const inner = (
                    <Image
                      src={image.image}
                      alt={image.alt ?? ""}
                      fill
                      unoptimized
                      sizes="50vw"
                      className="object-cover"
                    />
                  );
                  return (
                    <div
                      key={image.id}
                      className={`absolute inset-0 transition-opacity duration-500 ${
                        i === active ? "opacity-100" : "opacity-0"
                      }`}
                      aria-hidden={i !== active}
                    >
                      {image.href ? (
                        <a href={image.href} className="block h-full w-full">
                          {inner}
                        </a>
                      ) : (
                        inner
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Phones: every image, stacked. */}
              <div className="lg:hidden">
                {images.map((image) =>
                  image.href ? (
                    <a key={image.id} href={image.href} className="block">
                      <Image
                        src={image.image}
                        alt={image.alt ?? ""}
                        width={1200}
                        height={1500}
                        unoptimized
                        className="block h-auto w-full"
                      />
                    </a>
                  ) : (
                    <Image
                      key={image.id}
                      src={image.image}
                      alt={image.alt ?? ""}
                      width={1200}
                      height={1500}
                      unoptimized
                      className="block h-auto w-full"
                    />
                  ),
                )}
              </div>
            </div>

            {/* Right half: the form, scrolling inside its own column on desktop. */}
            <div className="min-w-0 lg:h-full lg:overflow-y-auto">
              <div className="p-5 md:p-6 lg:p-8">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
