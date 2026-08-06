"use client";

import { Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { shortsPicks } from "@/data/content";

/** "Shorts Picks" reels carousel (TikTok links), powered by Swiper. */
export function ShortsCarousel() {
  return (
    <Swiper
      modules={[Navigation, Pagination]}
      spaceBetween={16}
      slidesPerView={1.5}
      navigation
      pagination={{ clickable: true }}
      breakpoints={{
        640: { slidesPerView: 3 },
        1024: { slidesPerView: 4 },
      }}
    >
      {shortsPicks.map((short) => (
        <SwiperSlide key={short.id}>
          <a
            href={short.tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex aspect-[3/4] flex-col justify-between rounded-2xl bg-zinc-900 p-5 text-white transition-transform hover:-translate-y-1"
          >
            <span className="text-sm text-zinc-300">{short.handle}</span>
            <span className="font-medium">{short.title}</span>
          </a>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
