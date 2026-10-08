"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseInput, safeMultiline, safeText } from "@/lib/validation";
import {
  DEFAULT_OVERLAY_OPACITY,
  DEFAULT_POPUP_SCALE,
  POPUP_CONTENT_LAYOUTS,
  POPUP_CONTENT_KINDS,
  POPUP_FREQUENCIES,
  POPUP_LIMITS,
  POPUP_PLACEMENTS,
  POPUP_SIZES,
  POPUP_TEXT_ALIGNS,
} from "@/lib/popups";

// ── Validation ──────────────────────────────────────────────────────────────

/**
 * Integer field that tolerates the empty string a form input sends: empty (or
 * missing) becomes `undefined` instead of coercing to 0 and failing the range.
 */
function optionalInt(min: number, max: number) {
  return z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(min).max(max).optional(),
  );
}

/** Integer field with a default for an empty/missing value. */
function defaultedInt(min: number, max: number, fallback: number) {
  return z.preprocess(
    (v) => (v === "" || v == null ? fallback : v),
    z.coerce.number().int().min(min).max(max),
  );
}

const popupInput = z.object({
  title: safeText(200).optional(),
  body: safeMultiline(2000).optional(),
  image: safeText(2000).optional(),
  ctaLabel: safeText(80).optional(),
  ctaHref: safeText(2000).optional(),
  placement: z.enum(POPUP_PLACEMENTS).default("center"),
  frequency: z.enum(POPUP_FREQUENCIES).default("once"),
  // Layout
  size: z.enum(POPUP_SIZES).default("md"),
  widthPx: optionalInt(POPUP_LIMITS.widthMin, POPUP_LIMITS.widthMax),
  scale: defaultedInt(
    POPUP_LIMITS.scaleMin,
    POPUP_LIMITS.scaleMax,
    DEFAULT_POPUP_SCALE,
  ),
  contentLayout: z.enum(POPUP_CONTENT_LAYOUTS).default("auto"),
  contentKind: z.enum(POPUP_CONTENT_KINDS).default("custom"),
  imageHeightPx: optionalInt(
    POPUP_LIMITS.imageHeightMin,
    POPUP_LIMITS.imageHeightMax,
  ),
  textAlign: z.enum(POPUP_TEXT_ALIGNS).default("left"),
  // Timing
  delaySeconds: defaultedInt(0, POPUP_LIMITS.delayMax, 0),
  timeoutSeconds: defaultedInt(0, POPUP_LIMITS.timeoutMax, 0),
  // Overlay & dismissal
  overlay: z.boolean().default(true),
  overlayOpacity: defaultedInt(
    0,
    POPUP_LIMITS.overlayOpacityMax,
    DEFAULT_OVERLAY_OPACITY,
  ),
  closeOnOverlay: z.boolean().default(true),
  hideToday: z.boolean().default(true),
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

/** The row fields both create and update write. */
function popupFields(data: PopupInput) {
  return {
    title: data.title?.trim() || null,
    body: data.body?.trim() || null,
    image: data.image?.trim() || null,
    ctaLabel: data.ctaLabel?.trim() || null,
    ctaHref: data.ctaHref?.trim() || null,
    placement: data.placement,
    frequency: data.frequency,
    size: data.size,
    // A custom width only applies to the "custom" size, so a stale value can't
    // surprise an admin who switches back to a preset.
    widthPx: data.size === "custom" ? (data.widthPx ?? null) : null,
    scale: data.scale,
    contentLayout: data.contentLayout,
    contentKind: data.contentKind,
    imageHeightPx: data.imageHeightPx ?? null,
    textAlign: data.textAlign,
    delaySeconds: data.delaySeconds,
    timeoutSeconds: data.timeoutSeconds,
    overlay: data.overlay,
    overlayOpacity: data.overlayOpacity,
    closeOnOverlay: data.closeOnOverlay,
    hideToday: data.hideToday,
    isActive: data.isActive,
    startsAt: toDate(data.startsAt),
    expiresAt: toDate(data.expiresAt),
  };
}

// ── Actions ─────────────────────────────────────────────────────────────────

export async function createPopup(input: PopupInput, backHref: string) {
  await requireAdmin();
  const data = parseInput(popupInput, input, "popups.create");
  await db.popup.create({
    data: popupFields(data),
  });
  revalidateCatalog();
  redirect(backHref);
}

export async function updatePopup(id: string, input: PopupInput) {
  await requireAdmin();
  const data = parseInput(popupInput, input, "popups.update");
  await db.popup.update({
    where: { id },
    data: popupFields(data),
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
