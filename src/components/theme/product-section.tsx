"use client";

import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
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
 */
export function ThemeProductSection({
  sub,
  title,
  products,
}: ThemeProductSectionProps) {
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
        <Swiper
          modules={[Autoplay, Navigation, Pagination]}
          slidesPerView={4}
          spaceBetween={0}
          navigation
          pagination={{ clickable: true }}
          wrapperTag="ul"
          wrapperClass="prdList"
          className="prdSlide"
        >
          {products.map((product) => (
            <SwiperSlide key={product.id} tag="li" className="xans-record-">
              <ThemeProductCard product={product} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}
