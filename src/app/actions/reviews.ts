"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isValidReviewImageUrl } from "@/lib/blob";
import { db } from "@/lib/db";
import { MAX_REVIEW_IMAGES } from "@/lib/reviews";
import { parseInput, safeMultiline, safeText } from "@/lib/validation";

/**
 * Customer review submission from the product page. Only signed-in users may
 * submit; reviews are shown by default once they pass validation and an admin
 * can hide any review from the dashboard.
 */

const reviewInput = z.object({
  productId: z.string().min(1, "Product is required"),
  rating: z.coerce.number().int().min(1).max(5),
  title: safeText(120).optional(),
  body: safeMultiline(2000, {
    min: 5,
    message: "Please write a short review.",
  }),
  // Photo URLs are re-validated: only our own `reviews/` uploads are accepted,
  // so a review can't embed arbitrary remote images.
  images: z
    .array(z.string().max(500))
    .max(MAX_REVIEW_IMAGES, `Up to ${MAX_REVIEW_IMAGES} photos per review`)
    .default([])
    .refine((urls) => urls.every(isValidReviewImageUrl), {
      message: "One of the photos could not be verified — please re-upload it.",
    }),
});

export type ReviewInput = z.infer<typeof reviewInput>;

export async function submitReview(input: ReviewInput) {
  const session = await requireUser();
  const data = parseInput(reviewInput, input, "reviews.submit");

  await db.review.create({
    data: {
      productId: data.productId,
      userId: session.user.id,
      rating: data.rating,
      title: data.title || null,
      body: data.body,
      images: data.images,
      isVerified: false,
      status: "APPROVED",
      isVisible: true,
    },
  });

  revalidatePath("/review");
  revalidatePath("/admin/reviews");
}
