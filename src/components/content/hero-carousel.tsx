"use client";

import { useEffect, useRef } from "react";
import Swiper from "swiper";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
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
 * Homepage hero — faithful port of the original "mainSlide" swiper.
 * Renders the original markup/classes inside .mainSlide (including the .btns
 * control row) and initializes Swiper against the theme's -main elements.
 */
export function HeroCarousel() {
  const rootRef = useRef<HTMLDivElement>(null);

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

    return () => {
      swiper.destroy(true, true);
    };
  }, []);

  return (
    <div className="slideWrap">
      <div className="swiper mainSlide" ref={rootRef}>
        <div className="swiper-wrapper">
          {slides.map((slide, i) => (
            <div key={slide.image + i} className="swiper-slide round">
              {slide.preorder && (
                <div className="preorder-badge">
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
                  className="pc"
                />
              </a>
              {slide.title && (
                <div className="txt wt">
                  <h3>{slide.title}</h3>
                  <p>{slide.description}</p>
                  {slide.brand && slide.href && (
                    <a href={slide.href} className="btn">
                      {slide.brand}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="btns">
          <div className="swiper-pagination swiper-pagination-main" />
          <div className="btn_arrow">
            <div className="swiper-button-prev swiper-button-prev-main" />
            <div className="swiper-button-next swiper-button-next-main" />
          </div>
        </div>
      </div>
    </div>
  );
}
