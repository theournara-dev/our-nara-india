"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeBlockConfig } from "@/lib/product-blocks/normalize";
import { slugify } from "@/lib/slug";
import { parseInput, safeMultiline, safeText } from "@/lib/validation";
import { Prisma } from "@/generated/prisma/client";

// ── Validation ──────────────────────────────────────────────────────────────

const blockInput = z.object({
  id: z.string().optional(),
  type: z.string().min(1, "Block type is required"),
  title: safeText(120).optional(),
  config: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().default(true),
});

const variantInput = z.object({
  id: z.string().optional(),
  // Everything except the images is optional: a blank option label/value or SKU
  // is derived from the product on save (see `resolveVariantFields`).
  optionLabel: safeText(60).optional(),
  optionValue: safeText(120).optional(),
  sku: safeText(80).optional(),
  priceCents: z.coerce.number().int().nonnegative().optional(),
  /** International-store price; unset = fall back to the variant/product local price. */
  globalPriceCents: z.coerce.number().int().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative().default(0),
  // Option images (the first one leads the gallery while selected) + swatch colour.
  images: z.array(safeText(500)).default([]),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Colour must be a hex value like #faddc3")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().default(true),
});

const productInput = z.object({
  name: safeText(200, { min: 1, message: "Name is required" }),
  slug: safeText(120, { min: 1, message: "Slug is required" }).refine(
    (v) => /^[a-z0-9-]+$/.test(v),
    { message: "Slug must be lowercase letters, numbers and hyphens" },
  ),
  brandId: z.string().min(1, "Brand is required"),
  categoryId: z.string().min(1, "Category is required"),
  summary: safeMultiline(500).optional(),
  shortTags: z.array(safeText(60)).default([]),
  description: safeMultiline(50000).optional(),
  priceCents: z.coerce.number().int().nonnegative("Price must be 0 or more"),
  compareAtCents: z.coerce.number().int().nonnegative().optional(),
  /** International-store price; unset = fall back to the local price. */
  globalPriceCents: z.coerce.number().int().nonnegative().optional(),
  globalCompareAtCents: z.coerce.number().int().nonnegative().optional(),
  /** Product-level stock for variantless products; null = untracked. */
  stock: z.coerce.number().int().nonnegative().nullable().optional(),
  currency: z.string().default("INR"),
  isPreOrder: z.boolean().default(false),
  preOrderNotice: safeText(300).optional(),
  images: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  seoTitle: safeText(200).optional(),
  seoDescription: safeMultiline(500).optional(),
  variants: z.array(variantInput).default([]),
  blocks: z.array(blockInput).default([]),
  infoRows: z
    .array(
      z.object({
        heading: safeText(120).optional(),
        body: safeMultiline(4000).optional(),
        visible: z.boolean().default(true),
      }),
    )
    .default([]),
  /** Rows of the "Product Info" card under Buy Now (label | value). */
  buyInfoRows: z
    .array(
      z.object({
        heading: safeText(120).optional(),
        body: safeMultiline(4000).optional(),
        visible: z.boolean().default(true),
      }),
    )
    .default([]),
});

export type ProductInput = z.infer<typeof productInput>;
type VariantInput = z.infer<typeof variantInput>;

// ── Guards & helpers ───────────────────────────────────────────────────────

/**
 * Fill in the blanks an admin may leave on a variant: a missing option value
 * falls back to the product name and a missing SKU to `<product-slug>-<n>`. A
 * variant that already exists keeps the SKU it has, so clearing the field never
 * rewrites an identifier other records already point at.
 */
function resolveVariantFields(
  variants: VariantInput[],
  product: { name: string; slug: string },
  currentSkuById: Map<string, string> = new Map(),
) {
  const used = new Set(currentSkuById.values());
  return variants.map((v, i) => {
    const optionValue = v.optionValue?.trim() || product.name;
    let sku = v.sku?.trim() || (v.id ? currentSkuById.get(v.id) : undefined);
    if (!sku) {
      let n = i + 1;
      sku = `${product.slug}-${n}`;
      while (used.has(sku)) {
        n += 1;
        sku = `${product.slug}-${n}`;
      }
    }
    used.add(sku);
    return { optionValue, sku };
  });
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
  // The brands page is built from the same catalog, so a brand created inline
  // in the product form has to appear there immediately.
  revalidatePath("/brands");
}

// ── Actions ─────────────────────────────────────────────────────────────────

export async function createProduct(input: ProductInput) {
  await requireAdmin();
  const data = parseInput(productInput, input, "products.create");
  const slug = await uniqueSlug(slugify(data.slug));
  const resolved = resolveVariantFields(data.variants, {
    name: data.name,
    slug,
  });

  const product = await db.product.create({
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
      globalPriceCents: data.globalPriceCents ?? null,
      globalCompareAtCents: data.globalCompareAtCents ?? null,
      stock: data.stock ?? null,
      currency: data.currency,
      isPreOrder: data.isPreOrder,
      preOrderNotice: data.preOrderNotice || null,
      images: data.images,
      isActive: data.isActive,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      infoRows: data.infoRows as Prisma.InputJsonValue,
      buyInfoRows: data.buyInfoRows as Prisma.InputJsonValue,
      variants: {
        create: data.variants.map((v, i) => ({
          optionLabel: v.optionLabel || null,
          optionValue: resolved[i].optionValue,
          sku: resolved[i].sku,
          priceCents: v.priceCents ?? null,
          globalPriceCents: v.globalPriceCents ?? null,
          images: v.images,
          color: v.color || null,
          sortOrder: i,
          stock: v.stock,
          isActive: v.isActive,
        })),
      },
      blocks: {
        create: data.blocks.map((b, i) => ({
          type: b.type,
          title: b.title || null,
          config: normalizeBlockConfig(
            b.type,
            b.config,
          ) as Prisma.InputJsonValue,
          sortOrder: i,
          isActive: b.isActive,
        })),
      },
    },
    select: { id: true, slug: true },
  });

  revalidateCatalog();
  return product;
}

export async function updateProduct(id: string, input: ProductInput) {
  await requireAdmin();
  const data = parseInput(productInput, input, "products.update");
  const slug = await uniqueSlug(slugify(data.slug), id);

  // Variants are synced to keep the ids of the ones the form sent back (the
  // form echoes each existing variant's id). Deleting and recreating them
  // would change every variant id on each save, which silently invalidates the
  // selections saved in shoppers' carts (checkout resolves the cart's option
  // id against the product's variants) and the ids recorded on order items.
  // Ids not seen in the payload belong to variants the admin removed.
  const current = await db.productVariant.findMany({
    where: { productId: id },
    select: { id: true, sku: true },
  });
  const currentIds = new Set(current.map((v) => v.id));
  const currentSkuById = new Map(current.map((v) => [v.id, v.sku]));
  const keptIds = new Set(
    data.variants
      .map((v) => v.id)
      .filter((vid): vid is string => !!vid && currentIds.has(vid)),
  );
  const removedIds = current.filter((v) => !keptIds.has(v.id)).map((v) => v.id);
  const resolved = resolveVariantFields(
    data.variants,
    { name: data.name, slug },
    currentSkuById,
  );

  await db.$transaction(
    [
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
          globalPriceCents: data.globalPriceCents ?? null,
          globalCompareAtCents: data.globalCompareAtCents ?? null,
          stock: data.stock ?? null,
          currency: data.currency,
          isPreOrder: data.isPreOrder,
          preOrderNotice: data.preOrderNotice || null,
          images: data.images,
          isActive: data.isActive,
          seoTitle: data.seoTitle || null,
          seoDescription: data.seoDescription || null,
          infoRows: data.infoRows as Prisma.InputJsonValue,
          buyInfoRows: data.buyInfoRows as Prisma.InputJsonValue,
        },
      }),
      // Blocks carry no external references, so replacing them wholesale is fine.
      db.productBlock.deleteMany({ where: { productId: id } }),
      ...(removedIds.length
        ? [db.productVariant.deleteMany({ where: { id: { in: removedIds } } })]
        : []),
      ...data.variants.map((v, i) => {
        const fields = {
          optionLabel: v.optionLabel || null,
          optionValue: resolved[i].optionValue,
          sku: resolved[i].sku,
          priceCents: v.priceCents ?? null,
          globalPriceCents: v.globalPriceCents ?? null,
          images: v.images,
          color: v.color || null,
          sortOrder: i,
          stock: v.stock,
          isActive: v.isActive,
        };
        return v.id && keptIds.has(v.id)
          ? db.productVariant.update({ where: { id: v.id }, data: fields })
          : db.productVariant.create({ data: { ...fields, productId: id } });
      }),
      ...data.blocks.map((b, i) =>
        db.productBlock.create({
          data: {
            productId: id,
            type: b.type,
            title: b.title || null,
            config: normalizeBlockConfig(
              b.type,
              b.config,
            ) as Prisma.InputJsonValue,
            sortOrder: i,
            isActive: b.isActive,
          },
        }),
      ),
    ],
    // This is the heaviest admin write: a product row plus a full replace of
    // its variants and blocks. Against a remote (Neon) database the default
    // 5s interactive-transaction budget can be exceeded on a cold pool, which
    // surfaced to admins as an opaque "Save failed". Give it real headroom.
    { timeout: 30000 },
  );

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

/** Mark/unmark a product as a pre-order. */
export async function toggleProductPreOrder(id: string, enabled: boolean) {
  await requireAdmin();
  await db.product.update({ where: { id }, data: { isPreOrder: enabled } });
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
