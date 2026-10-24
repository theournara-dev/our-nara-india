"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  categoryPageBlocksSchema,
  withCategoryPageBlocks,
  type CategoryPageBlocksConfig,
} from "@/lib/category-page-blocks";
import {
  SECTION_TYPE_META_BY_TYPE,
  type PageSectionRow,
  type SectionType,
} from "@/lib/page-builder/types";
import { parseSiteVersion } from "@/lib/site-version";
import { parseInput, safeText } from "@/lib/validation";

// ── Guards & helpers ───────────────────────────────────────────────────────

/**
 * A stored JSON value. The shapes we write are plain data, so the only thing
 * standing between them and Prisma's JSON columns is its recursive type.
 */
const asJson = (value: unknown) => value as Prisma.InputJsonValue;

/** Convert an optional `datetime-local` string to a Date or null. */
function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Revalidate the storefront + admin pages affected by a section change. */
function revalidate(pageId: string) {
  revalidatePath("/");
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${pageId}/builder`);
}

function toRow(s: {
  id: string;
  type: string;
  title: string | null;
  config: unknown;
  sortOrder: number;
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
}): PageSectionRow {
  return {
    id: s.id,
    type: s.type,
    title: s.title,
    config: s.config,
    sortOrder: s.sortOrder,
    isActive: s.isActive,
    startsAt: s.startsAt,
    expiresAt: s.expiresAt,
  };
}

// ── Actions ─────────────────────────────────────────────────────────────────

/** Append a new section of the given type to the end of the page. */
export async function createSection(
  pageId: string,
  type: SectionType,
): Promise<PageSectionRow> {
  await requireAdmin();
  const meta = SECTION_TYPE_META_BY_TYPE[type];
  if (!meta) throw new Error("Unknown section type");

  const agg = await db.pageSection.aggregate({
    where: { pageId },
    _max: { sortOrder: true },
  });
  const section = await db.pageSection.create({
    data: {
      pageId,
      type,
      title: meta.label,
      config: meta.defaultConfig() as Prisma.InputJsonValue,
      sortOrder: (agg._max.sortOrder ?? -1) + 1,
      isActive: true,
    },
  });
  revalidate(pageId);
  return toRow(section);
}

export interface UpdateSectionInput {
  title?: string;
  config: unknown;
  isActive?: boolean;
  startsAt?: string;
  expiresAt?: string;
}

/** Update a section's label, config, visibility, and schedule. */
export async function updateSection(
  id: string,
  input: UpdateSectionInput,
): Promise<PageSectionRow> {
  await requireAdmin();
  const section = await db.pageSection.findUnique({ where: { id } });
  if (!section) throw new Error("Section not found");

  const meta = SECTION_TYPE_META_BY_TYPE[section.type as SectionType];
  const config = meta
    ? (meta.configSchema.parse(input.config) as Prisma.InputJsonValue)
    : (input.config as Prisma.InputJsonValue);

  const updated = await db.pageSection.update({
    where: { id },
    data: {
      title: input.title?.trim() || null,
      config,
      isActive: input.isActive,
      startsAt: toDate(input.startsAt),
      expiresAt: toDate(input.expiresAt),
    },
  });
  revalidate(section.pageId);
  return toRow(updated);
}

/** Permanently delete a section. */
export async function deleteSection(id: string): Promise<void> {
  await requireAdmin();
  const section = await db.pageSection.findUnique({ where: { id } });
  if (!section) throw new Error("Section not found");
  await db.pageSection.delete({ where: { id } });
  revalidate(section.pageId);
}

/** Toggle a section's storefront visibility. */
export async function toggleSection(
  id: string,
  isActive: boolean,
): Promise<void> {
  await requireAdmin();
  const section = await db.pageSection.findUnique({ where: { id } });
  if (!section) throw new Error("Section not found");
  await db.pageSection.update({ where: { id }, data: { isActive } });
  revalidate(section.pageId);
}

/** Persist a new ordering of a page's sections (from drag-and-drop or arrows). */
export async function reorderSections(
  pageId: string,
  orderedIds: string[],
): Promise<void> {
  await requireAdmin();
  await db.$transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.pageSection.update({
        where: { id: orderedIds[i] },
        data: { sortOrder: i },
      });
    }
  });
  revalidate(pageId);
}

// ── Page settings (listings that are not built from sections) ───────────────

/**
 * The blocks of one category page (client's slide 4), per store: the long
 * banner under the filter tiles (up to three, one banner per column — the same
 * strip the home page and /brands use) and the single promo block under it. A
 * page either follows the all-pages blocks of that store or keeps its own, and
 * either way it can hide a block on its own. Everything is a reference, so a
 * banner can be used in several places at once.
 */
const categoryBannersInput = categoryPageBlocksSchema.extend({
  version: z.string(),
});

export type CategoryPageBanners = z.input<typeof categoryBannersInput>;

export type PageSettingsResult = { ok: true } | { ok: false; message: string };

/** Save one store's blocks for one category page. */
export async function setCategoryPageBanners(
  categoryId: string,
  input: CategoryPageBanners,
): Promise<PageSettingsResult> {
  await requireAdmin();

  let data: z.infer<typeof categoryBannersInput>;
  try {
    data = parseInput(categoryBannersInput, input, "category page banners");
  } catch {
    return { ok: false, message: "Check the selected banners." };
  }

  const version = parseSiteVersion(data.version);
  if (!version) return { ok: false, message: "Unknown store." };

  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { parentId: true, pageBanners: true },
  });
  if (!category)
    return { ok: false, message: "This category no longer exists." };
  if (category.parentId) {
    // Subcategories have no page of their own, so they host no banners.
    return {
      ok: false,
      message: "Only top-level categories have a page of their own.",
    };
  }

  const blocks: CategoryPageBlocksConfig = {
    mode: data.mode,
    hidden: data.hidden,
    long: [...new Set(data.long.filter(Boolean))].slice(0, 3),
    longHeight: data.longHeight,
    promoId: data.promoId?.trim() || null,
    promoHeight: data.promoHeight,
  };
  const missing = await missingBanners(blocks);
  if (missing) return { ok: false, message: missing };

  try {
    await db.category.update({
      where: { id: categoryId },
      data: {
        pageBanners: asJson(
          withCategoryPageBlocks(category.pageBanners, version, blocks),
        ),
      },
    });
  } catch (err) {
    console.error(`[pages] category blocks failed for ${categoryId}:`, err);
    return { ok: false, message: "Could not save the page banners." };
  }

  revalidatePath("/admin/pages");
  // Every category listing page renders these picks.
  revalidatePath("/category", "layout");
  return { ok: true };
}

/**
 * The blocks every category page of one store shows (client's slide 4): the
 * same shape as a page's own, on that store's config row. References again, so
 * a banner can be in the all-pages blocks and a page at once.
 */
const categoryDefaultsInput = categoryPageBlocksSchema.extend({
  version: z.string(),
});

export type CategoryPageDefaults = z.input<typeof categoryDefaultsInput>;

/** Save one store's all-category-pages blocks. */
export async function setCategoryPageDefaults(
  input: CategoryPageDefaults,
): Promise<PageSettingsResult> {
  await requireAdmin();

  let data: z.infer<typeof categoryDefaultsInput>;
  try {
    data = parseInput(categoryDefaultsInput, input, "category page defaults");
  } catch {
    return { ok: false, message: "Check the selected banners." };
  }

  const version = parseSiteVersion(data.version);
  if (!version) return { ok: false, message: "Unknown store." };

  const blocks: CategoryPageBlocksConfig = {
    mode: "default",
    hidden: [],
    long: [...new Set(data.long.filter(Boolean))].slice(0, 3),
    longHeight: data.longHeight,
    promoId: data.promoId?.trim() || null,
    promoHeight: data.promoHeight,
  };
  const missing = await missingBanners(blocks);
  if (missing) return { ok: false, message: missing };

  const fields = {
    categoryLongBannerIds: blocks.long,
    categoryLongBannerHeight: blocks.longHeight,
    categoryPromoBannerId: blocks.promoId,
    categoryPromoHeight: blocks.promoHeight,
  };

  try {
    await db.siteConfig.upsert({
      where: { version },
      create: { version, ...fields },
      update: fields,
    });
  } catch (err) {
    console.error(`[pages] category page defaults failed (${version}):`, err);
    return { ok: false, message: "Could not save the all-pages blocks." };
  }

  revalidatePath("/admin/pages");
  revalidatePath("/category", "layout");
  return { ok: true };
}

/** Refuse to store a banner id nothing can render. */
async function missingBanners(
  blocks: CategoryPageBlocksConfig,
): Promise<string | null> {
  const ids = [...blocks.long, ...(blocks.promoId ? [blocks.promoId] : [])];
  if (ids.length === 0) return null;
  const found = await db.banner.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  return found.length === ids.length
    ? null
    : "Those banners no longer exist — reopen the page.";
}

/**
 * The /brands page's own settings (client's slide 4: page configuration lives
 * under Pages): the preview grid under the group tabs and the banners above it.
 * Moved here from Site settings, which keeps the store-wide content.
 */
const brandsPageInput = z.object({
  version: z.string(),
  previewHeight: z.coerce.number().int().min(40).max(600),
  previewColumns: z.coerce.number().int().min(2).max(6),
  previewRows: z.coerce.number().int().min(1).max(10),
  previewBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f6f6f6"),
  previewTransparent: z.boolean().default(true),
  // The directory's own blocks (client's slide 6): the long banner's picks and
  // height, and the promo — a reference, empty until one is picked.
  longBannerIds: z.array(safeText(100)).max(3).default([]),
  longBannerHeight: z.coerce.number().int().min(0).max(600).default(0),
  promoBannerId: safeText(100).optional(),
  promoHeight: z.coerce.number().int().min(0).max(600).default(0),
});

/** Save /brands' blocks + banner picks for one store version. */
export async function saveBrandsPage(
  input: z.input<typeof brandsPageInput>,
): Promise<PageSettingsResult> {
  await requireAdmin();

  let data: z.infer<typeof brandsPageInput>;
  try {
    data = parseInput(brandsPageInput, input, "brands page");
  } catch {
    return { ok: false, message: "Check the brands page settings." };
  }

  const version = parseSiteVersion(data.version);
  if (!version) return { ok: false, message: "Unknown store." };

  const longBannerIds = [...new Set(data.longBannerIds.filter(Boolean))].slice(
    0,
    3,
  );
  const promoBannerId = data.promoBannerId?.trim() || null;
  if (longBannerIds.length > 0 || promoBannerId) {
    // Never store an id nothing can render — say so instead of saving a blank.
    const found = await db.banner.findMany({
      where: { id: { in: [...longBannerIds, ...(promoBannerId ?? [])] } },
      select: { id: true },
    });
    if (found.length !== longBannerIds.length + (promoBannerId ? 1 : 0)) {
      return { ok: false, message: "Those banners no longer exist." };
    }
  }

  const fields = {
    brandsPreviewHeight: data.previewHeight,
    brandsPreviewColumns: data.previewColumns,
    brandsPreviewRows: data.previewRows,
    brandsPreviewBackground: data.previewBackground,
    brandsPreviewTransparent: data.previewTransparent,
    brandsLongBannerIds: longBannerIds,
    brandsLongBannerHeight: data.longBannerHeight,
    brandsPromoBannerId: promoBannerId,
    brandsPromoHeight: data.promoHeight,
  };

  try {
    await db.siteConfig.upsert({
      where: { version },
      create: { version, ...fields },
      update: fields,
    });
  } catch (err) {
    console.error(`[pages] brands page save failed (${version}):`, err);
    return { ok: false, message: "Could not save the brands page." };
  }

  revalidatePath("/admin/pages");
  revalidatePath("/brands");
  return { ok: true };
}
