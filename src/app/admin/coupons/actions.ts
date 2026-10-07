"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { normalizeCouponCode } from "@/lib/coupons";
import { db } from "@/lib/db";
import { parseInput, safeMultiline, safeText } from "@/lib/validation";

/**
 * Admin writes for coupons. A coupon is either a percentage, a fixed amount or
 * a free-shipping code, and it can be limited to a brand, a category or a set
 * of products, to one store, to first-time buyers, and to a date window — see
 * `src/lib/coupons.ts` for the rules the storefront applies.
 */

export type CouponActionResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

const couponInput = z.object({
  id: z.string().optional(),
  code: safeText(40, { min: 1, message: "A coupon code is required." }),
  title: safeText(120).optional(),
  description: safeMultiline(300).optional(),
  type: z.enum(["PERCENT", "FIXED", "SHIPPING"]),
  /** Percent for PERCENT; minor units for FIXED; ignored for SHIPPING. */
  value: z.coerce.number().int().min(0).max(100_000_000),
  minOrderCents: z.coerce.number().int().min(0).max(100_000_000).nullable(),
  maxUses: z.coerce.number().int().min(0).max(1_000_000).nullable(),
  perUserLimit: z.coerce.number().int().min(0).max(1_000_000).nullable(),
  /** `YYYY-MM-DD` (or a datetime-local value); empty = open-ended. */
  startsAt: z.string().max(40).optional(),
  expiresAt: z.string().max(40).optional(),
  isActive: z.boolean(),
  siteVersion: z.enum(["all", "local", "global"]),
  firstPurchaseOnly: z.boolean(),
  scope: z.enum(["ALL", "BRAND", "CATEGORY", "PRODUCT"]),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
  productIds: z.array(z.string()).max(300).optional(),
});

/**
 * A date-only value means the whole day: `startsAt` opens at 00:00 and
 * `expiresAt` closes at 23:59:59.999, so "expires 31 Dec" includes 31 Dec.
 */
function parseWindowDate(
  raw: string | undefined,
  endOfDay: boolean,
): Date | null {
  const value = raw?.trim();
  if (!value) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const iso = dateOnly
    ? `${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`
    : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Create or update a coupon. */
export async function saveCoupon(
  input: z.infer<typeof couponInput>,
): Promise<CouponActionResult> {
  await requireAdmin();
  const data = parseInput(couponInput, input, "coupons.save");

  const code = normalizeCouponCode(data.code);
  if (!code) {
    return { ok: false, message: "A coupon code is required." };
  }

  // ── Business rules the form can't express on its own ──────────────────────
  if (data.type === "PERCENT" && (data.value < 1 || data.value > 100)) {
    return { ok: false, message: "A percentage must be between 1 and 100." };
  }
  if (data.type === "FIXED" && data.value < 1) {
    return { ok: false, message: "A fixed discount must be more than ₹0." };
  }
  if (data.scope === "BRAND" && !data.brandId) {
    return { ok: false, message: "Choose the brand this coupon applies to." };
  }
  if (data.scope === "CATEGORY" && !data.categoryId) {
    return { ok: false, message: "Choose the category this coupon applies to." };
  }
  if (data.scope === "PRODUCT" && (data.productIds?.length ?? 0) === 0) {
    return { ok: false, message: "Choose at least one product." };
  }

  const startsAt = parseWindowDate(data.startsAt, false);
  const expiresAt = parseWindowDate(data.expiresAt, true);
  if (startsAt && expiresAt && expiresAt < startsAt) {
    return { ok: false, message: "The expiry date is before the start date." };
  }

  // Codes are matched case-insensitively on the storefront, so they must be
  // unique case-insensitively too.
  const clash = await db.coupon.findFirst({
    where: {
      code: { equals: code, mode: "insensitive" },
      ...(data.id ? { NOT: { id: data.id } } : {}),
    },
    select: { id: true },
  });
  if (clash) {
    return { ok: false, message: `The code ${code} is already in use.` };
  }

  const fields = {
    code,
    title: data.title?.trim() || null,
    description: data.description?.trim() || null,
    type: data.type,
    value: data.type === "SHIPPING" ? 0 : data.value,
    minOrderCents: data.minOrderCents || null,
    maxUses: data.maxUses || null,
    perUserLimit: data.perUserLimit || null,
    startsAt,
    expiresAt,
    isActive: data.isActive,
    siteVersion: data.siteVersion,
    firstPurchaseOnly: data.firstPurchaseOnly,
    scope: data.scope,
    brandId: data.scope === "BRAND" ? (data.brandId ?? null) : null,
    categoryId: data.scope === "CATEGORY" ? (data.categoryId ?? null) : null,
    productIds: data.scope === "PRODUCT" ? (data.productIds ?? []) : [],
  };

  try {
    if (data.id) {
      await db.coupon.update({ where: { id: data.id }, data: fields });
      revalidateCouponPages();
      return { ok: true, id: data.id };
    }
    const created = await db.coupon.create({ data: fields });
    revalidateCouponPages();
    return { ok: true, id: created.id };
  } catch (err) {
    console.error("[coupons] save failed:", err);
    return { ok: false, message: "Could not save this coupon." };
  }
}

/** Delete a coupon. Used coupons are kept — they carry redemption history. */
export async function deleteCoupon(id: string): Promise<CouponActionResult> {
  await requireAdmin();
  const redemptions = await db.couponRedemption.count({
    where: { couponId: id },
  });
  if (redemptions > 0) {
    return {
      ok: false,
      message: `This coupon has been used ${redemptions} time${redemptions === 1 ? "" : "s"}. Deactivate it instead of deleting.`,
    };
  }
  try {
    await db.coupon.delete({ where: { id } });
  } catch (err) {
    console.error(`[coupons] delete failed for ${id}:`, err);
    return { ok: false, message: "Could not delete this coupon." };
  }
  revalidateCouponPages();
  return { ok: true, id };
}

/** Show or hide a coupon without losing its configuration. */
export async function toggleCouponActive(
  id: string,
  isActive: boolean,
): Promise<CouponActionResult> {
  await requireAdmin();
  try {
    await db.coupon.update({ where: { id }, data: { isActive } });
  } catch (err) {
    console.error(`[coupons] toggle failed for ${id}:`, err);
    return { ok: false, message: "Could not update this coupon." };
  }
  revalidateCouponPages();
  return { ok: true, id };
}

function revalidateCouponPages() {
  revalidatePath("/admin/coupons");
  revalidatePath("/coupons");
}
