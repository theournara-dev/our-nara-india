"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Support override for a customer whose verification mail never arrived or
 * whose address was mistyped: marks it verified so they can sign in.
 */
export async function markEmailVerified(
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await requireAdmin();
    await db.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  } catch (err) {
    console.error("[admin.users] verify email failed", err);
    return { ok: false, message: "Could not verify this email." };
  }
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}
