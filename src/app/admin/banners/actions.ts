"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { BANNER_PLACEMENTS } from "./lib";

// ── Validation ──────────────────────────────────────────────────────────────

const bannerInput = z.object({
  title: z.string().min(1, "Title is required"),
  placement: z.enum(BANNER_PLACEMENTS).default("long"),
  image: z.string().min(1, "Image is required"),
  mobileImage: z.string().optional(),
  alt: z.string().optional(),
  href: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  // Optional schedule sent as `datetime-local` strings; empty means "no limit".
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export type BannerInput = z.infer<typeof bannerInput>;

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
}

// ── Actions ─────────────────────────────────────────────────────────────────

export async function createBanner(input: BannerInput, backHref: string) {
  await requireAdmin();
  const data = bannerInput.parse(input);
  await db.banner.create({
    data: {
      title: data.title.trim(),
      placement: data.placement,
      image: data.image.trim(),
      mobileImage: data.mobileImage?.trim() || null,
      alt: data.alt?.trim() || null,
      href: data.href?.trim() || null,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
      startsAt: toDate(data.startsAt),
      expiresAt: toDate(data.expiresAt),
    },
  });
  revalidateCatalog();
  redirect(backHref);
}

export async function updateBanner(id: string, input: BannerInput) {
  await requireAdmin();
  const data = bannerInput.parse(input);
  await db.banner.update({
    where: { id },
    data: {
      title: data.title.trim(),
      placement: data.placement,
      image: data.image.trim(),
      mobileImage: data.mobileImage?.trim() || null,
      alt: data.alt?.trim() || null,
      href: data.href?.trim() || null,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
      startsAt: toDate(data.startsAt),
      expiresAt: toDate(data.expiresAt),
    },
  });
  revalidateCatalog();
}

/** Soft-delete: deactivate so the banner disappears from the storefront. */
export async function softDeleteBanner(id: string) {
  await requireAdmin();
  await db.banner.update({ where: { id }, data: { isActive: false } });
  revalidateCatalog();
}

/** Permanently delete a banner. Banners have no dependent records, so it's safe. */
export async function hardDeleteBanner(id: string) {
  await requireAdmin();
  await db.banner.delete({ where: { id } });
  revalidateCatalog();
}

export async function toggleBannerActive(id: string, isActive: boolean) {
  await requireAdmin();
  await db.banner.update({ where: { id }, data: { isActive } });
  revalidateCatalog();
}
