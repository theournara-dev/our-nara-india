"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Swiper from "swiper";
import "swiper/css";
import type { ProductCard as ProductCardType } from "@/data/products";
import type { ResolvedTripleBannerBox } from "@/data/triple-banner";
import { addProductToCart } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { notifyAddedToCart } from "@/lib/toast";

interface TripleBannerProps {
  boxes: ResolvedTripleBannerBox[];
}

/**
 * Home page "Triple Banner": a Swiper of banner panels (banner image + heading
 * overlay + curated product rows), reproducing the original theme's
 * `tripleBanner` section.
 *
 * The original hides its pagination/arrow bar entirely, so there are no nav
 * controls at any breakpoint. On small screens the panels loop infinitely
 * (swipe); on desktop all 3 panels fit at once so loop is switched off.
 */
export function TripleBanner({ boxes }: TripleBannerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const swiper = new Swiper(el, {
      speed: 600,
      slidesPerView: 1.2,
      spaceBetween: 16,
      loop: true,
      watchOverflow: false,
      observer: true,
      observeParents: true,
      breakpoints: {
        768: { slidesPerView: 2, spaceBetween: 16, loop: true },
        1200: {
          slidesPerView: 3,
          spaceBetween: 0,
          loop: false,
          watchOverflow: true,
        },
      },
      on: {
        init: () => setReady(true),
      },
    });

    return () => {
      swiper.destroy(true, true);
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
    </div>
  );
}

/** A single horizontal product row: thumbnail + brand/name/tags/price + cart. */
function TripleBannerProduct({ product }: { product: ProductCardType }) {
  function handleAddToCart() {
    addProductToCart(product);
    notifyAddedToCart(product.name);
  }

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
        <span className="tags">{product.shortTags.join(" · ")}</span>
        {product.isPreOrder && (
          <span className="overview">PRE-ORDER/Order now, ships later</span>
        )}
        <span className="price">
          {formatMoney(product.priceCents, product.currency)}
        </span>
      </div>

      <button
        type="button"
        className="cart"
        aria-label="Add to cart"
        onClick={handleAddToCart}
      >
        <Image
          src="/upload/icon_202508271427351600.png"
          alt=""
          width={30}
          height={30}
          unoptimized
        />
      </button>
    </li>
  );
}
