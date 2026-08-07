"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Swiper from "swiper";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import type { ProductCard as ProductCardType } from "@/data/products";
import type { ResolvedTripleBannerBox } from "@/data/triple-banner";
import { formatMoney } from "@/lib/money";
import { SliderNav } from "@/components/ui/slider-nav";

interface TripleBannerProps {
  boxes: ResolvedTripleBannerBox[];
}

/**
 * Home page "Triple Banner": a Swiper of banner panels (banner image + heading
 * overlay + curated product rows), reproducing the original theme's
 * `tripleBanner` section.
 *
 * Loop is intentionally off: with only 3 panels, Swiper's loop mode warns on
 * the tablet breakpoint (2.5 per view), and the original already disables loop
 * at desktop where all 3 panels fit at once.
 */
export function TripleBanner({ boxes }: TripleBannerProps) {
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
      speed: 600,
      slidesPerView: 1.2,
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
        768: { slidesPerView: 2.5, spaceBetween: 16 },
        1200: { slidesPerView: 3, spaceBetween: 0 },
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

  if (boxes.length === 0) return null;

  return (
    <div className="triple-banner">
      <div
        ref={rootRef}
        className={`swiper triple-inner transition-opacity duration-300 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <ul className="swiper-wrapper">
          {boxes.map((box) => (
            <li key={box.id} className="box swiper-slide">
              <div className="banner">
                <Image
                  src={box.image}
                  alt={box.alt}
                  width={960}
                  height={540}
                  unoptimized
                  className="h-auto w-full"
                />
                <div className="banner-title">
                  <h2>{box.title}</h2>
                  <span className="sub">{box.sub}</span>
                </div>
              </div>
              <ul className="prd-list">
                {box.products.map((product) => (
                  <TripleBannerProduct key={product.slug} product={product} />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <SliderNav
        paginationRef={paginationRef}
        paginationClassName="swiper-pagination-triple"
        onPrev={() => swiperRef.current?.slidePrev()}
        onNext={() => swiperRef.current?.slideNext()}
        canPrev={canPrev}
        canNext={canNext}
      />
    </div>
  );
}

/** A single horizontal product row: thumbnail + brand/name/price + cart. */
function TripleBannerProduct({ product }: { product: ProductCardType }) {
  return (
    <li className="product-row">
      <Link href={`/products/${product.slug}`} className="thumb">
        <Image
          src={product.images[0]}
          alt={product.name}
          width={200}
          height={200}
          unoptimized
          className="h-auto w-full"
        />
      </Link>

      <div className="desc">
        <span className="brand">[{product.brand.name}]</span>
        <strong className="name">
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </strong>
        {product.isPreOrder && (
          <span className="overview">PRE-ORDER/Order now, ships later</span>
        )}
        <span className="price">
          {formatMoney(product.priceCents, product.currency)}
        </span>
      </div>

      <button type="button" className="cart" aria-label="Add to cart">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/upload/icon_202508271427351600.png" alt="" />
      </button>
    </li>
  );
}
