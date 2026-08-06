"use client";

import { useEffect, useRef, useState } from "react";
import Swiper from "swiper";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";
import { HiPause, HiPlay } from "react-icons/hi2";

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

export function HeroCarousel() {
  const rootRef = useRef<HTMLDivElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<Swiper | null>(null);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const swiper = new Swiper(el, {
      modules: [Autoplay, Pagination],
      speed: 600,
      slidesPerView: 1.2,
      spaceBetween: 16,
      centeredSlides: true,
      loop: true,
      autoplay: { delay: 3000, disableOnInteraction: false },
      pagination: {
        el: paginationRef.current as HTMLElement,
        type: "progressbar",
        clickable: true,
      },
      breakpoints: {
        768: { slidesPerView: 2.5, spaceBetween: 16 },
        1200: { slidesPerView: 3.7, spaceBetween: 16 },
      },
      on: {
        init: () => setReady(true),
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
      <div
        className={`swiper transition-opacity duration-300 ${
          ready ? "opacity-100" : "opacity-0 min-h-20"
        }`}
        ref={rootRef}
      >
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
      </div>

      {/* Nav controls (below the slider) */}
      <div className="mx-auto mt-4 flex w-[56vw] items-center justify-center gap-3">
        <div
          ref={paginationRef}
          className="swiper-pagination swiper-pagination-main relative! h-1 flex-1"
        />
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Previous"
            className="cursor-pointer hover:opacity-50 transition-opacity duration-150"
            onClick={() => swiperRef.current?.slidePrev()}
          >
            <MdKeyboardArrowLeft size={28} />
          </button>
          <div className="w-px h-3 bg-gray-200" />
          <button
            type="button"
            aria-label="Next"
            className="cursor-pointer hover:opacity-50 transition-opacity duration-150"
            onClick={() => swiperRef.current?.slideNext()}
          >
            <MdKeyboardArrowRight size={28} />
          </button>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Pause"
            className="cursor-pointer hover:opacity-50 transition-opacity duration-150"
            onClick={() => {
              if (paused) {
                swiperRef.current?.autoplay.start();
              } else {
                swiperRef.current?.autoplay.stop();
              }
              setPaused(!paused);
            }}
          >
            {paused ? <HiPause size={24} /> : <HiPlay size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
}
