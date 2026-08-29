"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { FEEDBACK_STATUSES, type FeedbackStatusValue } from "./status";

/** Update the triage status of a feedback item. Admin-only. */
export async function updateFeedbackStatus(id: string, status: string) {
  await requireAdmin();
  if (!(FEEDBACK_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Invalid feedback status");
  }
  await db.feedback.update({
    where: { id },
    data: { status: status as FeedbackStatusValue },
  });
  revalidatePath("/admin/feedback");
}