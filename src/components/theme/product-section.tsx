"use client";

import { useEffect, useRef, useState } from "react";
import Swiper from "swiper";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { ThemeProductCard } from "@/components/theme/product-card";
import type { ProductCard as ProductCardType } from "@/data/products";
import { cn } from "@/lib/utils";
import { SliderArrows } from "@/components/ui/slider-arrows";

interface ThemeProductSectionProps {
  sub?: string;
  title: string;
  products: ProductCardType[];
}

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
      slidesPerView: 1.4,
      spaceBetween: 16,
      watchOverflow: true,
      observer: true,
      observeParents: true,
      pagination: {
        el: paginationRef.current as HTMLElement,
        type: "progressbar",
        clickable: true,
      },
      breakpoints: {
        768: { slidesPerView: 4 },
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
    <div className="mb-5 mt-[60px] w-full">
      <div className="relative mx-auto box-border w-[92%] max-w-[1560px] px-2 max-[767px]:w-[96%]">
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

        <div className="relative mt-8">
          <div
            className={`swiper overflow-visible! mx-auto w-full transition-opacity duration-300 ${
              ready ? "opacity-100" : "opacity-0"
            }`}
            ref={rootRef}
          >
            <ul className="swiper-wrapper">
              {products.map((product, index) => (
                <li key={product.id} className="swiper-slide">
                  <ThemeProductCard product={product} index={index} />
                </li>
              ))}
            </ul>
          </div>

          {/* Progressbar pagination + prev/next arrows (in the bottom bar, like the original).
              Kept mounted for Swiper, but hidden when there is nothing to scroll (no overflow). */}
          <div
            className={cn(
              "mx-auto mt-4 flex w-[56vw] items-center justify-center max-[767px]:w-[80vw]",
              "md:hidden",
            )}
          >
            <div
              ref={paginationRef}
              className="swiper-pagination swiper-pagination-prd relative! h-1 flex-1"
            />
            <SliderArrows
              onPrev={() => swiperRef.current?.slidePrev()}
              onNext={() => swiperRef.current?.slideNext()}
              canPrev={canPrev}
              canNext={canNext}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
