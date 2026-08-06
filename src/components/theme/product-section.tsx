"use client";

import { useEffect, useRef } from "react";
import Swiper from "swiper";
import "swiper/css";
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
 * Tailwind utilities. Arrows are custom Tailwind buttons.
 */
export function ThemeProductSection({
  sub,
  title,
  products,
}: ThemeProductSectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<Swiper | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const swiper = new Swiper(el, {
      slidesPerView: 4,
      spaceBetween: 0,
      breakpoints: {
        640: { slidesPerView: 2 },
        1024: { slidesPerView: 4 },
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
          <div className="swiper mx-auto w-full pb-6" ref={rootRef}>
            <ul className="swiper-wrapper">
              {products.map((product) => (
                <li key={product.id} className="swiper-slide">
                  <ThemeProductCard product={product} />
                </li>
              ))}
            </ul>
          </div>

          {/* Custom arrows (Tailwind) */}
          <button
            type="button"
            aria-label="Previous products"
            onClick={() => swiperRef.current?.slidePrev()}
            className="absolute left-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition-colors hover:bg-zinc-100"
          >
            <span className="block h-3.5 w-3.5 -rotate-135 border-t-2 border-r-2 border-zinc-900" />
          </button>
          <button
            type="button"
            aria-label="Next products"
            onClick={() => swiperRef.current?.slideNext()}
            className="absolute right-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition-colors hover:bg-zinc-100"
          >
            <span className="block h-3.5 w-3.5 rotate-45 border-t-2 border-r-2 border-zinc-900" />
          </button>
        </div>
      </div>
    </div>
  );
}
