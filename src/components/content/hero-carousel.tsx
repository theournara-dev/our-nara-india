"use client";

import { useEffect, useRef, useState } from "react";
import Swiper from "swiper";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

interface HeroSlide {
  image: string;
  title?: string;
  description?: string;
  brand?: string;
  href?: string;
  preorder?: boolean;
}

const slides: HeroSlide[] = [
  {
    image: "/upload/goodymall1/en/main/main_box_img01_2.jpg",
    title: "Sunscreen",
    description:
      "Strong UV protection without the oily feel\nmade gentle for sensitive, breakout-prone skin",
    brand: "LA THEORIE",
    href: "/brand/la-theorie",
    preorder: true,
  },
  {
    image: "/upload/goodymall1/en/main/main_box_img02_1.jpg",
    title: "Cica Panthenol Soothing Cream",
    description:
      "Calms sensitive skin with cica and panthenol\nwhile locking in deep moisture for lasting comfort",
    brand: "HEARIM",
    href: "/brand/hearim",
    preorder: true,
  },
  {
    image: "/upload/goodymall1/en/main/main_box_img03_1.jpg",
    title: "Peptide Volume Master Essence",
    description:
      "Multi-peptide care helps revive tired skin\nfor a firmer, healthier, and more vibrant look",
    brand: "DR.PEPTI",
    href: "/brand/dr-pepti",
    preorder: true,
  },
  {
    image: "/upload/goodymall1/en/main/main_box_img04_1.jpg",
    title: "Stem Cell Peptide Retinol",
    description:
      "Overnight repair with stem cells, peptide and retinol\nfor firmer, smoother, barrier-strengthened skin",
    brand: "FABYOU",
    href: "/brand/fabyou",
    preorder: true,
  },
  {
    image: "/upload/goodymall1/en/main/main_box_img05_1.jpg",
    title: "Nopore Cleansing Oil",
    description:
      "Melts away makeup, blackheads, and excess sebum\nwhile leaving skin clean and hydrated.",
    brand: "NOWATER",
    href: "/brand/nowater",
    preorder: false,
  },
  {
    image: "/upload/goodymall1/en/main/main_box_img06_1.jpg",
    title: "Heavy Blurring Slip Fit Lip Cheek",
    description:
      "Airy texture melts into every curve\nfor a naturally toned, soft-matte finish.",
    brand: "HEVVY MAKEUP",
    href: "/brand/hevvy-makeup",
    preorder: true,
  },
  {
    image: "/upload/goodymall1/en/main/main_box_img07.jpg",
    href: "/",
  },
];

/**
 * Homepage hero (Tailwind-native). Swiper's required classes are kept; all
 * layout/styling is Tailwind utilities.
 */
export function HeroCarousel() {
  const rootRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<Swiper | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const swiper = new Swiper(el, {
      modules: [Autoplay, Navigation, Pagination],
      speed: 600,
      slidesPerView: 1.2,
      spaceBetween: 16,
      centeredSlides: true,
      loop: true,
      autoplay: { delay: 3000, disableOnInteraction: false },
      pagination: {
        el: el.querySelector(".swiper-pagination-main") as HTMLElement,
        type: "progressbar",
        clickable: true,
      },
      navigation: {
        nextEl: el.querySelector(".swiper-button-next-main") as HTMLElement,
        prevEl: el.querySelector(".swiper-button-prev-main") as HTMLElement,
      },
      breakpoints: {
        768: { slidesPerView: 2.5, spaceBetween: 16 },
        1200: { slidesPerView: 3.7, spaceBetween: 16 },
      },
    });

    swiperRef.current = swiper;
    return () => {
      swiper.destroy(true, true);
      swiperRef.current = null;
    };
  }, []);

  return (
    <div className="mx-auto mt-5 mb-15 w-full">
      <div className="swiper pb-[50px]" ref={rootRef}>
        <div className="swiper-wrapper">
          {[...slides, ...slides].map((slide, i) => (
            <div
              key={`${slide.image}-${i}`}
              className="swiper-slide relative rounded-xl opacity-50 [&.swiper-slide-active]:opacity-100"
            >
              {slide.preorder && (
                <div className="pointer-events-none absolute right-5 top-5 z-10 flex h-20 w-20 items-center justify-center rounded-full bg-point-500 text-center text-[13px] font-semibold leading-tight tracking-wide text-white">
                  PRE
                  <br />
                  ORDER
                </div>
              )}
              <a href={slide.href ?? "/"}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.image}
                  alt={slide.title ?? "OUR:NARA"}
                  className="w-full"
                />
              </a>
              {slide.title && (
                <div className="absolute bottom-[8%] left-[10%] text-left tracking-tight text-white">
                  <h3 className="text-2xl font-semibold leading-8">
                    {slide.title}
                  </h3>
                  <p className="mt-2 text-lg leading-6">{slide.description}</p>
                  {slide.brand && slide.href && (
                    <a
                      href={slide.href}
                      className="mt-6 inline-block rounded-full border border-white bg-white px-5 py-3 text-sm font-medium text-black"
                    >
                      {slide.brand}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 mx-auto flex w-[56vw] items-center justify-center px-2.5 text-center">
          <div className="swiper-pagination swiper-pagination-main relative mr-3 inline-block h-1 w-full bg-black/10 [&_.swiper-pagination-progressbar-fill]:bg-black" />
          <div className="relative flex items-center">
            <div className="swiper-button-prev swiper-button-prev-main flex h-10 w-10 cursor-pointer items-center justify-center after:content-['']! after:block after:h-3.5 after:w-3.5 after:border-t-2 after:border-r-2 after:border-zinc-900 after:bg-transparent! after:rotate-[-135deg]" />
            <div className="swiper-button-next swiper-button-next-main flex h-10 w-10 cursor-pointer items-center justify-center after:content-['']! after:block after:h-3.5 after:w-3.5 after:border-t-2 after:border-r-2 after:border-zinc-900 after:bg-transparent! after:rotate-45" />
          </div>
          <div className={`flex items-center ${paused ? "active" : ""}`}>
            <button
              type="button"
              className="start hidden h-[34px] w-[34px] items-center justify-center rounded-full bg-transparent"
              aria-label="Play"
              onClick={() => {
                swiperRef.current?.autoplay.start();
                setPaused(false);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/upload/goodymall1/en/layout/play.png" alt="play" />
            </button>
            <button
              type="button"
              className="stop flex h-[34px] w-[34px] items-center justify-center rounded-full bg-transparent"
              aria-label="Pause"
              onClick={() => {
                swiperRef.current?.autoplay.stop();
                setPaused(true);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/upload/goodymall1/en/layout/pause.png" alt="pause" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
