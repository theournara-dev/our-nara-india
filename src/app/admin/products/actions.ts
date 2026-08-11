"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

// ── Validation ──────────────────────────────────────────────────────────────

const variantInput = z.object({
  id: z.string().optional(),
  optionLabel: z.string().optional(),
  optionValue: z.string().min(1, "Variant option is required"),
  sku: z.string().min(1, "Variant SKU is required"),
  priceCents: z.coerce.number().int().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

const productInput = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must be lowercase letters, numbers and hyphens",
    ),
  brandId: z.string().min(1, "Brand is required"),
  categoryId: z.string().min(1, "Category is required"),
  summary: z.string().optional(),
  shortTags: z.array(z.string()).default([]),
  description: z.string().optional(),
  priceCents: z.coerce.number().int().nonnegative("Price must be 0 or more"),
  compareAtCents: z.coerce.number().int().nonnegative().optional(),
  currency: z.string().default("INR"),
  isPreOrder: z.boolean().default(false),
  preOrderNotice: z.string().optional(),
  images: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  variants: z.array(variantInput).default([]),
});

export type ProductInput = z.infer<typeof productInput>;

// ── Guards & helpers ───────────────────────────────────────────────────────

async function requireAdmin() {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    session = null;
  }
  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

/** Return a slug that is unique among products, appending -2, -3, … on clash. */
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base;
  let i = 2;
  for (;;) {
    const existing = await db.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${i}`;
    i++;
  }
}

function revalidateCatalog() {
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/api/popups");
}

// ── Actions ─────────────────────────────────────────────────────────────────

export async function createProduct(input: ProductInput, backHref: string) {
  await requireAdmin();
  const data = productInput.parse(input);
  const slug = await uniqueSlug(slugify(data.slug));

  await db.product.create({
    data: {
      name: data.name,
      slug,
      brandId: data.brandId,
      categoryId: data.categoryId,
      summary: data.summary || null,
      shortTags: data.shortTags,
      description: data.description || null,
      priceCents: data.priceCents,
      compareAtCents: data.compareAtCents ?? null,
      currency: data.currency,
      isPreOrder: data.isPreOrder,
      preOrderNotice: data.preOrderNotice || null,
      images: data.images,
      isActive: data.isActive,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      variants: {
        create: data.variants.map((v) => ({
          optionLabel: v.optionLabel || null,
          optionValue: v.optionValue,
          sku: v.sku,
          priceCents: v.priceCents ?? null,
          stock: v.stock,
          isActive: v.isActive,
        })),
      },
    },
  });

  revalidateCatalog();
  redirect(backHref);
}

export async function updateProduct(id: string, input: ProductInput) {
  await requireAdmin();
  const data = productInput.parse(input);
  const slug = await uniqueSlug(slugify(data.slug), id);

  await db.$transaction([
    db.product.update({
      where: { id },
      data: {
        name: data.name,
        slug,
        brandId: data.brandId,
        categoryId: data.categoryId,
        summary: data.summary || null,
        shortTags: data.shortTags,
        description: data.description || null,
        priceCents: data.priceCents,
        compareAtCents: data.compareAtCents ?? null,
        currency: data.currency,
        isPreOrder: data.isPreOrder,
        preOrderNotice: data.preOrderNotice || null,
        images: data.images,
        isActive: data.isActive,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
      },
    }),
    db.productVariant.deleteMany({ where: { productId: id } }),
    ...data.variants.map((v) =>
      db.productVariant.create({
        data: {
          productId: id,
          optionLabel: v.optionLabel || null,
          optionValue: v.optionValue,
          sku: v.sku,
          priceCents: v.priceCents ?? null,
          stock: v.stock,
          isActive: v.isActive,
        },
      }),
    ),
  ]);

  revalidateCatalog();
}

/** Soft-delete: deactivate so the product disappears from the storefront but
 *  order history and references stay intact. */
export async function softDeleteProduct(id: string) {
  await requireAdmin();
  await db.product.update({ where: { id }, data: { isActive: false } });
  revalidateCatalog();
}

/** Permanently delete a product. Blocked if it has order history, since order
 *  items reference the product and must be preserved. */
export async function hardDeleteProduct(id: string) {
  await requireAdmin();
  const orderItems = await db.orderItem.count({ where: { productId: id } });
  if (orderItems > 0) {
    throw new Error(
      "This product has order history and cannot be permanently deleted.",
    );
  }
  await db.product.delete({ where: { id } });
  revalidateCatalog();
}

export async function toggleProductActive(id: string, isActive: boolean) {
  await requireAdmin();
  await db.product.update({ where: { id }, data: { isActive } });
  revalidateCatalog();
}

/** Enable/disable the Buy Now button for a single product. */
export async function toggleProductBuyNow(id: string, enabled: boolean) {
  await requireAdmin();
  await db.product.update({ where: { id }, data: { buyNowEnabled: enabled } });
  revalidateCatalog();
}

/** Enable/disable popups for a single product. */
export async function toggleProductPopup(id: string, enabled: boolean) {
  await requireAdmin();
  await db.product.update({ where: { id }, data: { popupEnabled: enabled } });
  revalidateCatalog();
}

/** Enable/disable Buy Now for every product of a brand. */
export async function toggleBrandBuyNow(brandId: string, enabled: boolean) {
  await requireAdmin();
  await db.brand.update({
    where: { id: brandId },
    data: { buyNowEnabled: enabled },
  });
  revalidateCatalog();
}

/** Enable/disable popups for every product of a brand. */
export async function toggleBrandPopup(brandId: string, enabled: boolean) {
  await requireAdmin();
  await db.brand.update({
    where: { id: brandId },
    data: { popupEnabled: enabled },
  });
  revalidateCatalog();
}

/** Create a brand (used inline in the product form). Returns the new brand. */
export async function createBrand(name: string) {
  await requireAdmin();
  const base = slugify(name) || "brand";
  let candidate = base;
  let i = 2;
  for (;;) {
    const existing = await db.brand.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) break;
    candidate = `${base}-${i}`;
    i++;
  }
  const brand = await db.brand.create({
    data: { slug: candidate, name: name.trim(), isActive: true },
    select: { id: true, name: true },
  });
  revalidateCatalog();
  return brand;
}

/** Create a category (used inline in the product form). Returns the new category. */
export async function createCategory(name: string) {
  await requireAdmin();
  const base = slugify(name) || "category";
  let candidate = base;
  let i = 2;
  for (;;) {
    const existing = await db.category.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) break;
    candidate = `${base}-${i}`;
    i++;
  }
  const category = await db.category.create({
    data: { slug: candidate, name: name.trim() },
    select: { id: true, name: true },
  });
  revalidateCatalog();
  return category;
}
