"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Swiper from "swiper";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { reviews } from "@/data/content";
import type { Review } from "@/data/content";
import { SliderNav } from "@/components/ui/slider-nav";

/**
 * Home "Real Reviews" section, reproducing the original `mainReview` board
 * carousel: a Swiper of review cards (photo + BEST badge + rating + writer +
 * content) over a beige band, with a progressbar/arrow nav and a MORE button.
 */
export function ReviewsSection() {
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
      pagination: {
        el: paginationRef.current as HTMLElement,
        type: "progressbar",
        clickable: true,
      },
      breakpoints: {
        767: { slidesPerView: 4, spaceBetween: 16 },
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

  if (reviews.length === 0) return null;

  return (
    <section className="main-review">
      <div className="inner">
        <div className="sub-title">
          <span className="sub">REAL REVIEWS</span>
          <h2>What Our Customers Say</h2>
        </div>

        <div
          ref={rootRef}
          className={`swiper review-slide transition-opacity duration-300 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          <ul className="swiper-wrapper">
            {reviews.map((review) => (
              <li key={review.id} className="swiper-slide">
                <ReviewCard review={review} />
              </li>
            ))}
          </ul>
        </div>

        <SliderNav
          paginationRef={paginationRef}
          paginationClassName="swiper-pagination-review"
          onPrev={() => swiperRef.current?.slidePrev()}
          onNext={() => swiperRef.current?.slideNext()}
          canPrev={canPrev}
          canNext={canNext}
          className="md:hidden"
        />

        <div className="btn">
          <Link href="/review">MORE</Link>
        </div>
      </div>
    </section>
  );
}

/** A single review card: BEST badge, photo, rating, writer, and content. */
function ReviewCard({ review }: { review: Review }) {
  return (
    <Link href={`/review/${review.id}`} className="review-card">
      <span className="best-badge">BEST</span>

      <div className="review-img img-zoom">
        <Image
          src={review.image}
          alt={review.author}
          width={600}
          height={600}
          unoptimized
          className="h-auto w-full"
        />
      </div>

      <div className="txt">
        <div className="info">
          <span className="product">{review.product}</span>
        </div>
        <div className="txt-area">
          <span className="point-rate">
            <Image
              src="/upload/goodymall1/en/layout/star5.png"
              alt={`${review.rating} star rating`}
              width={70}
              height={13}
              unoptimized
            />
            <span className="count">{review.rating}</span>
          </span>
          <span className="writer">{review.author}</span>
        </div>
        <p className="cont">{review.body}</p>
      </div>
    </Link>
  );
}
