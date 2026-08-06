"use client";

import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
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
    description: "Strong UV protection without the oily feel\nmade gentle for sensitive, breakout-prone skin",
    brand: "LA THEORIE",
    href: "/brand/la-theorie",
    preorder: true,
  },
  {
    image: "/upload/goodymall1/en/main/main_box_img02_1.jpg",
    title: "Cica Panthenol Soothing Cream",
    description: "Calms sensitive skin with cica and panthenol\nwhile locking in deep moisture for lasting comfort",
    brand: "HEARIM",
    href: "/brand/hearim",
    preorder: true,
  },
  {
    image: "/upload/goodymall1/en/main/main_box_img03_1.jpg",
    title: "Peptide Volume Master Essence",
    description: "Multi-peptide care helps revive tired skin\nfor a firmer, healthier, and more vibrant look",
    brand: "DR.PEPTI",
    href: "/brand/dr-pepti",
    preorder: true,
  },
  {
    image: "/upload/goodymall1/en/main/main_box_img04_1.jpg",
    title: "Stem Cell Peptide Retinol",
    description: "Overnight repair with stem cells, peptide and retinol\nfor firmer, smoother, barrier-strengthened skin",
    brand: "FABYOU",
    href: "/brand/fabyou",
    preorder: true,
  },
  {
    image: "/upload/goodymall1/en/main/main_box_img05_1.jpg",
    title: "Nopore Cleansing Oil",
    description: "Melts away makeup, blackheads, and excess sebum\nwhile leaving skin clean and hydrated.",
    brand: "NOWATER",
    href: "/brand/nowater",
    preorder: false,
  },
  {
    image: "/upload/goodymall1/en/main/main_box_img06_1.jpg",
    title: "Heavy Blurring Slip Fit Lip Cheek",
    description: "Airy texture melts into every curve\nfor a naturally toned, soft-matte finish.",
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
 * Homepage hero — full-width image carousel with text overlays and pre-order
 * badges, mirroring the original "mainSlide" section.
 */
export function HeroCarousel() {
  return (
    <Swiper
      modules={[Autoplay, Navigation, Pagination]}
      slidesPerView={1.2}
      spaceBetween={0}
      speed={600}
      loop
      autoplay={{ delay: 4000, disableOnInteraction: false }}
      navigation
      pagination={{ clickable: true }}
      className="group mainSlide"
    >
      {slides.map((slide, i) => (
        <SwiperSlide key={slide.image + i} className="relative">
          {slide.preorder && (
            <span className="absolute left-4 top-4 z-10 rounded bg-sale px-2 py-1 text-center text-xs font-semibold leading-tight text-white">
              PRE
              <br />
              ORDER
            </span>
          )}
          <div className="relative aspect-[16/9] w-full overflow-hidden sm:aspect-[21/9]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.image}
              alt={slide.title ?? "OUR:NARA"}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            {slide.title && (
              <div className="absolute bottom-0 left-0 p-6 text-white sm:p-12">
                <h3 className="font-display text-2xl font-semibold sm:text-4xl">{slide.title}</h3>
                {slide.description && (
                  <p className="mt-2 hidden max-w-xl whitespace-pre-line text-sm text-white/90 sm:block sm:text-base">
                    {slide.description}
                  </p>
                )}
                {slide.brand && slide.href && (
                  <a
                    href={slide.href}
                    className="mt-4 inline-flex h-10 items-center rounded-full border border-white/80 px-5 text-sm font-medium text-white transition-colors hover:bg-white hover:text-zinc-900"
                  >
                    {slide.brand}
                  </a>
                )}
              </div>
            )}
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
