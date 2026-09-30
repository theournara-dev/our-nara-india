"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseInput, safeMultiline } from "@/lib/validation";

/**
 * Admin management of a product's Q&A list: authoring, ordering, visibility,
 * promoting user submissions, and copying entries from another product.
 */

const qaInput = z.object({
  question: safeMultiline(1000, { min: 1, message: "Question is required" }),
  answer: safeMultiline(3000).optional(),
});

function revalidate(productId: string) {
  revalidatePath(`/admin/products/${productId}/qa`);
  revalidatePath("/admin/products");
}

async function nextSortOrder(productId: string): Promise<number> {
  const agg = await db.productQA.aggregate({
    where: { productId },
    _max: { sortOrder: true },
  });
  return (agg._max.sortOrder ?? -1) + 1;
}

export async function createQA(
  productId: string,
  input: { question: string; answer?: string },
) {
  await requireAdmin();
  const data = parseInput(qaInput, input, "qa.create");
  await db.productQA.create({
    data: {
      productId,
      question: data.question,
      answer: data.answer || null,
      source: "ADMIN",
      status: "PUBLISHED",
      isVisible: true,
      sortOrder: await nextSortOrder(productId),
    },
  });
  revalidate(productId);
}

export async function updateQA(
  id: string,
  input: { question: string; answer?: string },
) {
  await requireAdmin();
  const data = parseInput(qaInput, input, "qa.update");
  const row = await db.productQA.update({
    where: { id },
    data: { question: data.question, answer: data.answer || null },
    select: { productId: true },
  });
  revalidate(row.productId);
}

export async function deleteQA(id: string) {
  await requireAdmin();
  const row = await db.productQA.delete({
    where: { id },
    select: { productId: true },
  });
  revalidate(row.productId);
}

export async function setQAVisible(id: string, isVisible: boolean) {
  await requireAdmin();
  const row = await db.productQA.update({
    where: { id },
    data: { isVisible },
    select: { productId: true },
  });
  revalidate(row.productId);
}

/** Persist a manual ordering for a product's Q&A entries. */
export async function reorderQA(productId: string, orderedIds: string[]) {
  await requireAdmin();
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.productQA.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
  revalidate(productId);
}

/** Promote a PENDING user submission into the published list. */
export async function publishSubmission(id: string) {
  await requireAdmin();
  const row = await db.productQA.findUnique({
    where: { id },
    select: { productId: true },
  });
  if (!row) return;
  await db.productQA.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      isVisible: true,
      sortOrder: await nextSortOrder(row.productId),
    },
  });
  revalidate(row.productId);
}

/** Discard a PENDING user submission. */
export async function discardSubmission(id: string) {
  await requireAdmin();
  const row = await db.productQA.update({
    where: { id },
    data: { status: "DISCARDED" },
    select: { productId: true },
  });
  revalidate(row.productId);
}

/** Search products for the "copy Q&A" dialog. */
export async function searchProductsForQA(query: string) {
  await requireAdmin();
  const q = query.trim();
  const rows = await db.product.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : { isActive: true },
    take: 20,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { questions: true } },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    qaCount: p._count.questions,
  }));
}

/** Load a product's published Q&A entries for the copy dialog. */
export async function getProductQAList(productId: string) {
  await requireAdmin();
  return db.productQA.findMany({
    where: { productId, status: "PUBLISHED" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, question: true, answer: true },
  });
}

/** Copy selected Q&A entries from another product into `targetProductId`. */
export async function copyQA(
  sourceProductId: string,
  qaIds: string[],
  targetProductId: string,
) {
  await requireAdmin();
  if (!qaIds.length) return;
  const rows = await db.productQA.findMany({
    where: { id: { in: qaIds }, productId: sourceProductId },
    select: { question: true, answer: true },
  });
  if (!rows.length) return;
  let sort = await nextSortOrder(targetProductId);
  await db.productQA.createMany({
    data: rows.map((r) => ({
      productId: targetProductId,
      question: r.question,
      answer: r.answer,
      source: "ADMIN",
      status: "PUBLISHED",
      isVisible: true,
      sortOrder: sort++,
    })),
  });
  revalidate(targetProductId);
}
