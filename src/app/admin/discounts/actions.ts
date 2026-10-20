"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { DiscountScope } from "@/lib/discounts";
import { parseInput, safeMultiline, safeText } from "@/lib/validation";

/**
 * Admin writes for product discounts. A discount needs no code: the storefront
 * resolver picks it up by scope and store, then applies it to the cart and
 * checkout — see `src/lib/discounts.ts`. Rows are soft-deleted so order
 * snapshots and old admin links keep resolving.
 */

export type DiscountActionResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

const discountInput = z.object({
  id: z.string().optional(),
  /** Customer-facing name shown on cards and orders. */
  title: safeText(120, { min: 1, message: "A title is required." }),
  adminNote: safeMultiline(500).optional(),
  type: z.enum(["PERCENT", "FIXED"]),
  /** Percent for PERCENT; amount in paise for FIXED. */
  value: z.coerce.number().int().min(1).max(100_000_000),
  scope: z.enum(["ALL", "BRAND", "CATEGORY", "PRODUCT"]),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
  productId: z.string().optional(),
  siteVersion: z.enum(["all", "local", "global"]).default("all"),
  /** ISO datetime (the manager sends `.toISOString()`); empty = open-ended. */
  startsAt: z.string().max(40).optional(),
  endsAt: z.string().max(40).optional(),
  isActive: z.boolean().default(true),
});

/**
 * A date-only value means the whole day: `startsAt` opens at 00:00 and `endsAt`
 * closes at 23:59:59.999, so "ends 31 Dec" includes 31 Dec. Anything else must
 * be an ISO datetime; the manager converts `datetime-local` so the admin's
 * timezone survives.
 */
function parseDiscountDate(
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

async function targetExists(scope: DiscountScope, id: string) {
  switch (scope) {
    case "BRAND":
      return (await db.brand.count({ where: { id } })) > 0;
    case "CATEGORY":
      return (await db.category.count({ where: { id } })) > 0;
    case "PRODUCT":
      return (await db.product.count({ where: { id } })) > 0;
    default:
      return true;
  }
}

/** Create or update a discount. */
export async function saveDiscount(
  input: z.infer<typeof discountInput>,
): Promise<DiscountActionResult> {
  await requireAdmin();
  let data: z.infer<typeof discountInput>;
  try {
    data = parseInput(discountInput, input, "discounts.save");
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        message: err.issues[0]?.message ?? "Check the form and try again.",
      };
    }
    throw err;
  }

  // ── Business rules the form can't express on its own ──────────────────────
  if (data.type === "PERCENT" && data.value > 100) {
    return { ok: false, message: "A percentage must be between 1 and 100." };
  }

  const startsAt = parseDiscountDate(data.startsAt, false);
  if (data.startsAt?.trim() && !startsAt) {
    return { ok: false, message: "The start date isn't valid." };
  }
  const endsAt = parseDiscountDate(data.endsAt, true);
  if (data.endsAt?.trim() && !endsAt) {
    return { ok: false, message: "The end date isn't valid." };
  }
  if (startsAt && endsAt && startsAt >= endsAt) {
    return { ok: false, message: "The end must be after the start." };
  }

  if (data.scope !== "ALL") {
    const targetId =
      data.scope === "BRAND"
        ? data.brandId
        : data.scope === "CATEGORY"
          ? data.categoryId
          : data.productId;
    if (!targetId) {
      return {
        ok: false,
        message:
          data.scope === "BRAND"
            ? "Choose the brand this discount applies to."
            : data.scope === "CATEGORY"
              ? "Choose the category this discount applies to."
              : "Choose the product this discount applies to.",
      };
    }
    if (!(await targetExists(data.scope, targetId))) {
      return { ok: false, message: "That target no longer exists." };
    }
  }

  const fields = {
    title: data.title,
    adminNote: data.adminNote?.trim() || null,
    type: data.type,
    value: data.value,
    scope: data.scope,
    brandId: data.scope === "BRAND" ? (data.brandId ?? null) : null,
    categoryId: data.scope === "CATEGORY" ? (data.categoryId ?? null) : null,
    productId: data.scope === "PRODUCT" ? (data.productId ?? null) : null,
    siteVersion: data.siteVersion,
    startsAt,
    endsAt,
    isActive: data.isActive,
  };

  try {
    if (data.id) {
      const updated = await db.discount.updateMany({
        where: { id: data.id, deletedAt: null },
        data: fields,
      });
      if (updated.count === 0) {
        return { ok: false, message: "This discount has been deleted." };
      }
      revalidateDiscountPages();
      return { ok: true, id: data.id };
    }
    const created = await db.discount.create({ data: fields });
    revalidateDiscountPages();
    return { ok: true, id: created.id };
  } catch (err) {
    console.error("[discounts] save failed:", err);
    return { ok: false, message: "Could not save this discount." };
  }
}

/** Pause or resume a live discount without losing its configuration. */
export async function setDiscountActive(
  id: string,
  isActive: boolean,
): Promise<DiscountActionResult> {
  await requireAdmin();
  try {
    const updated = await db.discount.updateMany({
      where: { id, deletedAt: null },
      data: { isActive },
    });
    if (updated.count === 0) {
      return { ok: false, message: "This discount is no longer available." };
    }
  } catch (err) {
    console.error(`[discounts] toggle failed for ${id}:`, err);
    return { ok: false, message: "Could not update this discount." };
  }
  revalidateDiscountPages();
  return { ok: true, id };
}

/** Soft-delete a discount: it stops applying but stays in the list. */
export async function softDeleteDiscount(
  id: string,
): Promise<DiscountActionResult> {
  await requireAdmin();
  try {
    const updated = await db.discount.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
    if (updated.count === 0) {
      return { ok: false, message: "This discount was already deleted." };
    }
  } catch (err) {
    console.error(`[discounts] soft delete failed for ${id}:`, err);
    return { ok: false, message: "Could not delete this discount." };
  }
  revalidateDiscountPages();
  return { ok: true, id };
}

/** Permanently remove a discount that was already soft-deleted. */
export async function hardDeleteDiscount(
  id: string,
): Promise<DiscountActionResult> {
  await requireAdmin();
  try {
    const deleted = await db.discount.deleteMany({
      where: { id, deletedAt: { not: null } },
    });
    if (deleted.count === 0) {
      return {
        ok: false,
        message: "Only deleted discounts can be permanently removed.",
      };
    }
  } catch (err) {
    console.error(`[discounts] hard delete failed for ${id}:`, err);
    return { ok: false, message: "Could not delete this discount." };
  }
  revalidateDiscountPages();
  return { ok: true, id };
}

function revalidateDiscountPages() {
  revalidatePath("/admin/discounts");
  revalidatePath("/", "layout");
}
