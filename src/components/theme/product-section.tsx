"use client";

import { useEffect, useRef } from "react";
import Swiper from "swiper";
import { Navigation, Pagination } from "swiper/modules";
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
 * A homepage product carousel section using the original theme markup/classes
 * (.ec-base-product.prdRoll > .prd_inner > .title + .swiper.prdSlide).
 * Arrows are custom Tailwind buttons (Swiper's auto-generated ones can't be
 * styled with utilities and clash with the theme's generic arrow styles).
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
      modules: [Navigation, Pagination],
      slidesPerView: 4,
      spaceBetween: 0,
      pagination: {
        el: el.querySelector(".swiper-pagination-prd") as HTMLElement,
        clickable: true,
      },
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
    <div className="xans-element- xans-product xans-product-listmain ec-base-product prdRoll mg_60">
      <div className="prd_inner">
        <div className="title">
          <h2>
            {sub && <span className="sub">{sub}</span>}
            {title}
          </h2>
        </div>

        <div className="relative">
          <div className="swiper prdSlide" ref={rootRef}>
            <ul className="prdList swiper-wrapper">
              {products.map((product) => (
                <li key={product.id} className="swiper-slide xans-record-">
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
            className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition-colors hover:bg-zinc-100"
          >
            <span className="block h-2.5 w-2.5 -rotate-135 border-t-2 border-r-2 border-zinc-900" />
          </button>
          <button
            type="button"
            aria-label="Next products"
            onClick={() => swiperRef.current?.slideNext()}
            className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition-colors hover:bg-zinc-100"
          >
            <span className="block h-2.5 w-2.5 rotate-45 border-t-2 border-r-2 border-zinc-900" />
          </button>
        </div>
      </div>
    </div>
  );
}
