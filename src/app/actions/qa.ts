"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseInput, safeMultiline } from "@/lib/validation";

/**
 * "Ask a question" submission from the product page. Only signed-in users may
 * submit; the question is stored PENDING and hidden until an admin promotes it
 * into the published Q&A list.
 */

const questionInput = z.object({
  productId: z.string().min(1, "Product is required"),
  question: safeMultiline(1000, {
    min: 5,
    message: "Please write your question.",
  }),
});

export type QuestionInput = z.infer<typeof questionInput>;

export async function submitQuestion(input: QuestionInput) {
  const session = await requireUser();
  const data = parseInput(questionInput, input, "qa.submit");

  await db.productQA.create({
    data: {
      productId: data.productId,
      question: data.question,
      source: "USER",
      status: "PENDING",
      isVisible: false,
      sortOrder: 0,
      submittedById: session.user.id,
    },
  });

  revalidatePath("/admin/products");
}
