"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import Swiper from "swiper";
import { Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";
import { instagramPosts } from "@/data/instagram";
import { toLoopable } from "@/lib/carousel";

// Largest slidesPerView in the breakpoints below (6 at desktop).
const MAX_SLIDES_PER_VIEW = 6;

/**
 * Home Instagram strip, reproducing the original `insta` section: an
 * auto-scrolling marquee of square Instagram images (rounded), headed by the
 * #our__nara title. Not user-draggable — it scrolls continuously.
 */
export function InstagramSection() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  const slides = useMemo(
    () => toLoopable(instagramPosts, MAX_SLIDES_PER_VIEW, (p) => p.id),
    [],
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const swiper = new Swiper(el, {
      modules: [Autoplay, FreeMode],
      speed: 5000,
      slidesPerView: 3,
      spaceBetween: 10,
      centeredSlides: true,
      watchOverflow: true,
      loop: true,
      freeMode: true,
      autoplay: { delay: 0, disableOnInteraction: false },
      breakpoints: {
        599: { slidesPerView: 4, spaceBetween: 10 },
        767: { slidesPerView: 6, spaceBetween: 10 },
      },
      on: {
        init: () => setReady(true),
        // Restart the marquee after the user drags so it never gets
        // permanently stuck (the original left autoplay stopped after drag).
        touchEnd: (s) => s.autoplay.start(),
        transitionEnd: (s) => s.autoplay.start(),
      },
    });

    return () => {
      swiper.destroy(true, true);
    };
  }, []);

  if (instagramPosts.length === 0) return null;

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

        <div
          ref={rootRef}
          className={`swiper insta-area transition-opacity duration-300 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          <ul className="swiper-wrapper">
            {slides.map(({ key, item }) => (
              <li key={key} className="item swiper-slide">
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    src={item.image}
                    alt={item.alt}
                    width={400}
                    height={400}
                    unoptimized
                    className="h-auto w-full"
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
