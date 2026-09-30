import { db } from "@/lib/db";

/**
 * Read model for the Q&A tab. Only published, visible entries are shown; user
 * submissions stay PENDING (hidden) until an admin promotes them.
 */

export interface QAView {
  id: string;
  question: string;
  answer?: string;
  createdAt: string;
}

export async function getPublishedProductQA(
  productId: string,
): Promise<QAView[]> {
  const rows = await db.productQA.findMany({
    where: { productId, status: "PUBLISHED", isVisible: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    question: r.question,
    answer: r.answer ?? undefined,
    createdAt: r.createdAt.toISOString(),
  }));
}
