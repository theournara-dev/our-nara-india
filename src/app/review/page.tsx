import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { reviews } from "@/data/content";

export const metadata: Metadata = { title: "What Our Customers Say" };

/** Review board list matching the original: a Write button above a grid of
 *  photo review cards (photo, rating, writer, product, content). */
export default function ReviewPage() {
  return (
    <div>
      <Container className="py-12">
        <div className="mb-2 text-center">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-point-500">
            REAL REVIEWS
          </p>
          <h1 className="font-display text-3xl font-semibold text-ink">
            What Our Customers Say
          </h1>
        </div>

        <div className="mx-auto mb-8 mt-8 flex max-w-6xl items-center justify-between">
          <span className="text-sm text-[#888]">{reviews.length} reviews</span>
          <Link
            href="/join"
            className="rounded border border-ink px-5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
          >
            Write a Review
          </Link>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {reviews.map((review) => (
            <Link
              key={review.id}
              href={`/review/${review.id}`}
              className="block overflow-hidden rounded-xl border border-[#e9e9e9] bg-white transition-shadow hover:shadow-lg"
            >
              <div className="relative aspect-square overflow-hidden bg-[#f6f6f6]">
                <Image
                  src={review.image}
                  alt={review.author}
                  width={600}
                  height={600}
                  unoptimized
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-3 top-3 rounded bg-point-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                  BEST
                </span>
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Image
                    src="/upload/goodymall1/en/layout/star5.png"
                    alt={`${review.rating} star rating`}
                    width={70}
                    height={13}
                    unoptimized
                  />
                  <span className="text-sm font-medium text-[#222]">
                    {review.rating}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#222]">
                    {review.author}
                  </span>
                  {review.product && (
                    <span className="text-xs text-[#888]">
                      {review.product}
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#666]">
                  {review.body}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}
