"use client";

import { Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { ProductCard } from "@/components/product/product-card";
import type { ProductCard as ProductCardType } from "@/data/products";

interface ProductCarouselProps {
  products: ProductCardType[];
  className?: string;
}

/** Horizontal product carousel with arrows + dots, powered by Swiper. */
export function ProductCarousel({ products, className }: ProductCarouselProps) {
  if (!products.length) return null;

  return (
    <Swiper
      modules={[Navigation, Pagination]}
      spaceBetween={16}
      slidesPerView={2}
      navigation
      pagination={{ clickable: true }}
      breakpoints={{
        640: { slidesPerView: 3 },
        1024: { slidesPerView: 4 },
      }}
      className={className}
    >
      {products.map((product) => (
        <SwiperSlide key={product.id} className="h-auto pb-1">
          <ProductCard product={product} />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
