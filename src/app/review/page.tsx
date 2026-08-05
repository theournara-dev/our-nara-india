import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { reviews } from "@/data/content";

export const metadata: Metadata = { title: "Product Reviews" };

export default function ReviewPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Real Reviews"
        title="Product Reviews"
        subtitle="10,000+ reviews and counting — see what customers are saying."
      />
      <Container className="pb-16">
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-zinc-100 bg-white p-6"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-amber-500">
                  {"★".repeat(review.rating)}
                </span>
                <span className="text-xs text-zinc-400">{review.date}</span>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <p className="font-semibold text-zinc-900">{review.author}</p>
                {review.product && (
                  <Badge tone="default">{review.product}</Badge>
                )}
              </div>
              {review.title && (
                <p className="font-medium text-zinc-800">{review.title}</p>
              )}
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {review.body}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button href="/join" variant="outline">
            Write a review
          </Button>
        </div>
      </Container>
    </div>
  );
}
