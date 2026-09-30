import { db } from "@/lib/db";

/**
 * Read model for product reviews shown on the storefront REVIEW tab. Only
 * visible reviews are returned; admins hide reviews from /admin/reviews.
 */

export interface ProductReviewView {
  id: string;
  rating: number;
  title?: string;
  body?: string;
  authorName: string;
  createdAt: string;
  isVerified: boolean;
  images: string[];
}

export interface ReviewSummary {
  count: number;
  average: number;
}

export async function getVisibleProductReviews(
  productId: string,
  take = 50,
): Promise<ProductReviewView[]> {
  const rows = await db.review.findMany({
    where: { productId, isVisible: true },
    orderBy: { createdAt: "desc" },
    take,
    include: { user: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title ?? undefined,
    body: r.body ?? undefined,
    authorName: r.user?.name?.trim() || "Customer",
    createdAt: r.createdAt.toISOString(),
    isVerified: r.isVerified,
    images: r.images,
  }));
}

export async function getReviewSummary(
  productId: string,
): Promise<ReviewSummary> {
  const [count, avg] = await Promise.all([
    db.review.count({ where: { productId, isVisible: true } }),
    db.review.aggregate({
      where: { productId, isVisible: true },
      _avg: { rating: true },
    }),
  ]);
  return { count, average: avg._avg.rating ?? 0 };
}
