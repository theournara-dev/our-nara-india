import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { reviews } from "@/data/content";

type Params = { id: string };

export function generateStaticParams(): Params[] {
  return reviews.map((review) => ({ id: review.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const review = reviews.find((r) => r.id === id);
  return { title: review ? `Review by ${review.author}` : "Review" };
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const review = reviews.find((r) => r.id === id);

  if (!review) notFound();

  return (
    <div>
      <PageHeader
        eyebrow="Real Reviews"
        title={`Review by ${review.author}`}
        subtitle={review.product ? `On ${review.product}` : undefined}
      />
      <Container className="pb-16">
        <article className="mx-auto max-w-2xl rounded-2xl border border-zinc-100 bg-white p-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-amber-500">{"★".repeat(review.rating)}</span>
            <span className="text-xs text-zinc-400">{review.date}</span>
          </div>
          <h2 className="text-xl font-semibold text-zinc-900">
            {review.title ?? "Review"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{review.author}</p>
          <p className="mt-5 leading-relaxed text-zinc-700">{review.body}</p>
        </article>
      </Container>
    </div>
  );
}
