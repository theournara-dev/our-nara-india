"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

/** Show/hide a review on the storefront. Admin-only. */
export async function toggleReviewVisible(id: string, isVisible: boolean) {
  await requireAdmin();
  await db.review.update({ where: { id }, data: { isVisible } });
  revalidatePath("/admin/reviews");
  revalidatePath("/review");
}

/** Permanently delete a review. Admin-only. */
export async function deleteReview(id: string) {
  await requireAdmin();
  await db.review.delete({ where: { id } });
  revalidatePath("/admin/reviews");
  revalidatePath("/review");
}
