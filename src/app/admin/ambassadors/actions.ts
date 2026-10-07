"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { safeMultiline } from "@/lib/validation";
import { AMBASSADOR_STATUSES, type AmbassadorStatusValue } from "./status";

/**
 * Ambassador application triage actions. Expected failures are RETURNED as
 * structured results, never thrown — Next.js masks thrown Server Action errors
 * in production builds, so their messages would reach the client as an opaque
 * digest and break the friendly error copy.
 */

export type AmbassadorActionResult =
  | { ok: true }
  | { ok: false; message: string };

const noteSchema = safeMultiline(500);

/**
 * Set the review status of one application (approve / reject / reset to
 * pending). The optional staff note replaces the stored one; clearing the
 * note field removes it. The applicant is not emailed — staff follow up
 * through the inbox.
 */
export async function setAmbassadorStatus(
  id: string,
  status: string,
  note?: string,
): Promise<AmbassadorActionResult> {
  await requireAdmin();
  if (typeof id !== "string" || !id) {
    return { ok: false, message: "Unknown application." };
  }
  if (!(AMBASSADOR_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, message: "Unknown status." };
  }

  const parsedNote = noteSchema.safeParse(note ?? "");
  if (!parsedNote.success) {
    return {
      ok: false,
      message: parsedNote.error.issues[0]?.message ?? "Invalid note.",
    };
  }

  try {
    await db.ambassadorApplication.update({
      where: { id },
      data: {
        status: status as AmbassadorStatusValue,
        note: parsedNote.data.trim() || null,
      },
    });
  } catch (err) {
    console.error(`[ambassadors] status update failed for ${id}:`, err);
    return { ok: false, message: "Could not update this application." };
  }

  revalidatePath("/admin/ambassadors");
  return { ok: true };
}
