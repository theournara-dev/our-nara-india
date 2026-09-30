"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseInput, safeMultiline, safeText } from "@/lib/validation";
import { POPUP_PLACEMENTS, POPUP_FREQUENCIES } from "./lib";

// ── Validation ──────────────────────────────────────────────────────────────

const popupInput = z.object({
  title: safeText(200).optional(),
  body: safeMultiline(2000).optional(),
  image: safeText(2000).optional(),
  ctaLabel: safeText(80).optional(),
  ctaHref: safeText(2000).optional(),
  placement: z.enum(POPUP_PLACEMENTS).default("center"),
  frequency: z.enum(POPUP_FREQUENCIES).default("once"),
  isActive: z.boolean().default(true),
  // Optional schedule sent as `datetime-local` strings; empty means "no limit".
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export type PopupInput = z.infer<typeof popupInput>;

/** Convert an optional `datetime-local` string to a Date or null. */
function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ── Guards & helpers ───────────────────────────────────────────────────────

function revalidateCatalog() {
  revalidatePath("/admin/banners");
  revalidatePath("/admin/popups");
  revalidatePath("/");
  revalidatePath("/api/popups");
}

// ── Actions ─────────────────────────────────────────────────────────────────

export async function createPopup(input: PopupInput, backHref: string) {
  await requireAdmin();
  const data = parseInput(popupInput, input, "popups.create");
  await db.popup.create({
    data: {
      title: data.title?.trim() || null,
      body: data.body?.trim() || null,
      image: data.image?.trim() || null,
      ctaLabel: data.ctaLabel?.trim() || null,
      ctaHref: data.ctaHref?.trim() || null,
      placement: data.placement,
      frequency: data.frequency,
      isActive: data.isActive,
      startsAt: toDate(data.startsAt),
      expiresAt: toDate(data.expiresAt),
    },
  });
  revalidateCatalog();
  redirect(backHref);
}

export async function updatePopup(id: string, input: PopupInput) {
  await requireAdmin();
  const data = parseInput(popupInput, input, "popups.update");
  await db.popup.update({
    where: { id },
    data: {
      title: data.title?.trim() || null,
      body: data.body?.trim() || null,
      image: data.image?.trim() || null,
      ctaLabel: data.ctaLabel?.trim() || null,
      ctaHref: data.ctaHref?.trim() || null,
      placement: data.placement,
      frequency: data.frequency,
      isActive: data.isActive,
      startsAt: toDate(data.startsAt),
      expiresAt: toDate(data.expiresAt),
    },
  });
  revalidateCatalog();
}

/** Soft-delete: deactivate so the popup no longer shows. */
export async function softDeletePopup(id: string) {
  await requireAdmin();
  await db.popup.update({ where: { id }, data: { isActive: false } });
  revalidateCatalog();
}

/** Permanently delete a popup. Popups have no dependent records, so it's safe. */
export async function hardDeletePopup(id: string) {
  await requireAdmin();
  await db.popup.delete({ where: { id } });
  revalidateCatalog();
}

export async function togglePopupActive(id: string, isActive: boolean) {
  await requireAdmin();
  await db.popup.update({ where: { id }, data: { isActive } });
  revalidateCatalog();
}
