"use client";

import { useEffect, useRef, useState } from "react";
import Swiper from "swiper";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { ThemeProductCard } from "@/components/theme/product-card";
import type { ProductCard as ProductCardType } from "@/data/products";

interface ThemeProductSectionProps {
  sub?: string;
  title: string;
  products: ProductCardType[];
}

/**
 * Homepage product carousel section (Tailwind-native). Swiper's required
 * classes (.swiper / .swiper-wrapper / .swiper-slide) are kept; all layout is
 * Tailwind utilities. Arrows are custom Tailwind buttons matching the original
 * theme's two-bar chevron navigation.
 */
export function ThemeProductSection({
  sub,
  title,
  products,
}: ThemeProductSectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<Swiper | null>(null);
  const [ready, setReady] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const swiper = new Swiper(el, {
      modules: [Pagination],
      slidesPerView: 4,
      spaceBetween: 0,
      observer: true,
      observeParents: true,
      pagination: {
        el: paginationRef.current as HTMLElement,
        type: "progressbar",
        clickable: true,
      },
      breakpoints: {
        640: { slidesPerView: 2 },
        1024: { slidesPerView: 4 },
      },
      on: {
        init: (s) => {
          setReady(true);
          setCanPrev(!s.isBeginning);
          setCanNext(!s.isEnd);
        },
        slideChange: (s) => {
          setCanPrev(!s.isBeginning);
          setCanNext(!s.isEnd);
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

  if (!products.length) return null;

  return (
    <div className="w-full">
      <div className="relative mx-auto box-border w-[92%] max-w-[1560px] px-2">
        <div className="mx-auto mb-2">
          <h2 className="text-center text-2xl font-bold leading-8 tracking-tight text-ink">
            {sub && (
              <span className="block text-base font-medium leading-6 text-point-500">
                {sub}
              </span>
            )}
            {title}
          </h2>
        </div>

        <div className="relative">
          <div
            className={`swiper mx-auto w-full transition-opacity duration-300 ${
              ready ? "opacity-100" : "opacity-0"
            }`}
            ref={rootRef}
          >
            <ul className="swiper-wrapper">
              {products.map((product) => (
                <li key={product.id} className="swiper-slide">
                  <ThemeProductCard product={product} />
                </li>
              ))}
            </ul>
          </div>

          {/* Progressbar pagination (below the slider) */}
          <div className="mx-auto mt-4 flex w-[56vw] items-center justify-center">
            <div
              ref={paginationRef}
              className="swiper-pagination swiper-pagination-prd relative! h-1 flex-1"
            />
          </div>

          {/* Custom arrows (Tailwind) — two-bar chevron like the original */}
          <button
            type="button"
            aria-label="Previous products"
            onClick={() => swiperRef.current?.slidePrev()}
            className={`absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full transition-opacity duration-200 hover:opacity-50 ${
              canPrev ? "opacity-100" : "opacity-35"
            }`}
          >
            <span className="absolute left-[14px] top-4 h-0.5 w-2.5 rotate-45 bg-zinc-900" />
            <span className="absolute left-[14px] top-[22px] h-0.5 w-2.5 -rotate-45 bg-zinc-900" />
          </button>
          <button
            type="button"
            aria-label="Next products"
            onClick={() => swiperRef.current?.slideNext()}
            className={`absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full transition-opacity duration-200 hover:opacity-50 ${
              canNext ? "opacity-100" : "opacity-35"
            }`}
          >
            <span className="absolute left-4 top-4 h-0.5 w-2.5 -rotate-45 bg-zinc-900" />
            <span className="absolute left-4 top-[22px] h-0.5 w-2.5 rotate-45 bg-zinc-900" />
          </button>
        </div>
      </div>
    </div>
  );
}
