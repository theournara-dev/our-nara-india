"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Swiper from "swiper";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";
import type { LongBanner as LongBannerItem } from "@/data/banners";
import { toLoopable } from "@/lib/carousel";

const MAX_SLIDES_PER_VIEW = 1;

interface LongBannerProps {
  banners: LongBannerItem[];
}

/**
 * Full-width, rounded banner carousel reproducing the original `longBanner01`
 * section: autoplay, hover-reveal arrows, bullet pagination, and a desktop /
 * mobile image per banner (swapped responsively).
 */
export function LongBanner({ banners }: LongBannerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  const slides = useMemo(
    () => toLoopable(banners, MAX_SLIDES_PER_VIEW, (b) => b.id),
    [banners],
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const swiper = new Swiper(el, {
      modules: [Autoplay, Navigation, Pagination],
      speed: 600,
      spaceBetween: 0,
      centeredSlides: true,
      loop: true,
      autoplay: { delay: 3000, disableOnInteraction: false },
      pagination: {
        el: paginationRef.current as HTMLElement,
        clickable: true,
      },
      navigation: {
        prevEl: prevRef.current as HTMLElement,
        nextEl: nextRef.current as HTMLElement,
      },
      on: {
        init: () => setReady(true),
      },
    });

    return () => {
      swiper.destroy(true, true);
    };
  }, []);

  if (banners.length === 0) return null;

  // A single banner is shown as a static rounded image (no pointless carousel
  // chrome). The Swiper carousel below activates once there are 2+ banners.
  if (banners.length === 1) {
    const banner = banners[0];
    return (
      <div className="long-banner">
        <Link href={banner.href ?? "/"} className="long-banner-single">
          <Image
            src={banner.image}
            alt={banner.alt}
            width={2172}
            height={260}
            unoptimized
            className="hidden w-full md:block"
          />
          <Image
            src={banner.mobileImage}
            alt={banner.alt}
            width={800}
            height={210}
            unoptimized
            className="w-full md:hidden"
          />
        </Link>
      </div>
    );
  }

  return (
    <div className="long-banner">
      <div
        ref={rootRef}
        className={`swiper long-slide transition-opacity duration-300 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="swiper-wrapper">
          {slides.map(({ key, item }) => (
            <div key={key} className="swiper-slide">
              <Link href={item.href ?? "/"}>
                <Image
                  src={item.image}
                  alt={item.alt}
                  width={2172}
                  height={260}
                  unoptimized
                  className="hidden w-full md:block"
                />
                <Image
                  src={item.mobileImage}
                  alt={item.alt}
                  width={800}
                  height={210}
                  unoptimized
                  className="w-full md:hidden"
                />
              </Link>
            </div>
          ))}
        </div>

        <button
          ref={prevRef}
          type="button"
          className="long-banner-arrow long-banner-prev"
          aria-label="Previous"
        >
          <MdKeyboardArrowLeft size={28} />
        </button>
        <button
          ref={nextRef}
          type="button"
          className="long-banner-arrow long-banner-next"
          aria-label="Next"
        >
          <MdKeyboardArrowRight size={28} />
        </button>

        <div ref={paginationRef} className="swiper-pagination long-banner-pagination" />
      </div>
    </div>
  );
}
