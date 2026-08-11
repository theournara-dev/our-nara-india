"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

/** Mark a pre-order as fulfilled (stock has arrived / shipped). */
export async function markPreorderFulfilled(id: string) {
  await requireAdmin();
  await db.preorder.update({ where: { id }, data: { status: "FULFILLED" } });
  revalidatePath("/admin/preorders");
  revalidatePath("/admin/products");
}
