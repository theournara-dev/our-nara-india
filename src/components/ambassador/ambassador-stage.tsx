"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { AmbassadorImage } from "@/lib/site-content";
import type { ReactNode } from "react";

/**
 * The /ambassador stage (client slide 12): a full-bleed two-column section.
 * On desktop the left pane sticks to the viewport and its image changes as the
 * visitor scrolls through the form on the right (the charcoalkorea.store
 * pattern); on phones the images simply stack above the form.
 */
export function AmbassadorStage({
  images,
  children,
}: {
  images: AmbassadorImage[];
  /** The application form (right column). */
  children: ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Progress through the section's scrollable travel; each image gets an
      // equal share, so the last one holds until the section ends.
      const travel = rect.height - window.innerHeight;
      const progress =
        travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      const index = Math.min(
        images.length - 1,
        Math.floor(progress * images.length),
      );
      setActive(index);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [images.length]);

  return (
    <section ref={sectionRef} className="w-full">
      <div className="grid items-start lg:grid-cols-2">
        <div className="lg:sticky lg:top-0 lg:h-screen">
          {/* Desktop/tablet: one image at a time, cross-fading on scroll. */}
          <div className="relative hidden h-full w-full overflow-hidden bg-[#f4f1ee] lg:block">
            {images.map((image, i) => {
              const inner = (
                <Image
                  src={image.image}
                  alt={image.alt ?? ""}
                  fill
                  unoptimized
                  sizes="50vw"
                  className="object-contain p-4"
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

            {images.length > 1 && (
              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1.5">
                {images.map((image, i) => (
                  <span
                    key={image.id}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === active ? "w-5 bg-point-500" : "w-1.5 bg-zinc-400"
                    }`}
                  />
                ))}
              </div>
            )}
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

        {/* Right: the form, in normal flow — it is what drives the swaps. */}
        <div className="min-w-0 px-5 py-10 md:px-8 lg:px-12 lg:py-14">
          <div className="mx-auto max-w-xl">{children}</div>
        </div>
      </div>
    </section>
  );
}
