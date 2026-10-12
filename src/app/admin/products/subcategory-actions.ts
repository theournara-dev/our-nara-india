"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  applySubcategoryCsv as applyCsv,
  bulkAssignSubcategories,
  previewSubcategoryCsv as previewCsv,
  type AssignResult,
  type CsvReport,
} from "@/data/subcategory-assignments";

/**
 * Mid-level category assignment actions for the admin: the products list's
 * multi-select bar and the CSV importer. The queries live in
 * `src/data/subcategory-assignments.ts`; these wrap them with the admin guard
 * and the storefront revalidation.
 */

export type { AssignResult, CsvReport };

function revalidateAssignment() {
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/category", "layout");
}

/** Bulk-assign one mid-level category to many products (or clear/remove). */
export async function assignSubcategories(
  productIds: string[],
  categoryId: string | null,
  mode: "add" | "remove" | "clear" = "add",
): Promise<AssignResult> {
  await requireAdmin();
  const result = await bulkAssignSubcategories(productIds, categoryId, mode);
  if (result.ok && result.changed > 0) revalidateAssignment();
  return result;
}

/** Dry run of a subcategory CSV import. */
export async function previewSubcategoryCsv(csv: string): Promise<CsvReport> {
  await requireAdmin();
  return previewCsv(csv);
}

/** Apply a subcategory CSV import. */
export async function applySubcategoryCsv(csv: string): Promise<CsvReport> {
  await requireAdmin();
  const report = await applyCsv(csv);
  if (report.summary.products > 0) revalidateAssignment();
  return report;
}
