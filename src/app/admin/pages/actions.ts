"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  SECTION_TYPE_META_BY_TYPE,
  type PageSectionRow,
  type SectionType,
} from "@/lib/page-builder/types";
import { parseSiteVersion } from "@/lib/site-version";
import { parseInput, safeText } from "@/lib/validation";

// ── Guards & helpers ───────────────────────────────────────────────────────

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
 * The blocks of one category page (client's slides 4): the "top pair" rendered
 * side by side, the long banner under the filter tiles (up to three, one banner
 * per column — the same strip the home page uses) and the single ad block under
 * that, plus the two heights. Page settings live under Pages; the category tree
 * in /admin/categories no longer edits them. A banner sits on at most one page
 * (`categoryId` is a single column), so a pick that is already attached
 * elsewhere moves here.
 */
const categoryBannersInput = z.object({
  top: z.array(safeText(100)).default([]),
  long: z.array(safeText(100)).default([]),
  ad: z.array(safeText(100)).default([]),
  /** Strip height in pixels; 0 keeps each banner's own proportions. */
  longHeight: z.coerce.number().int().min(0).max(600).default(0),
  /** Ad block height in pixels; 0 keeps the artwork's own proportions. */
  adHeight: z.coerce.number().int().min(0).max(600).default(0),
});

export type CategoryPageBanners = z.input<typeof categoryBannersInput>;

export type PageSettingsResult = { ok: true } | { ok: false; message: string };

/** Save one category page's banner picks (pair + long banner + ad). */
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

  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { parentId: true },
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

  // Drop blanks and duplicates; the pair keeps its first two slots, the strip
  // its first three columns and the ad its single pick. A banner picked in
  // several lists stays in the earlier one — the more specific pick wins.
  const cleanIds = (ids: string[]) => [...new Set(ids.filter(Boolean))];
  const top = cleanIds(data.top).slice(0, 2);
  const long = cleanIds(data.long)
    .filter((id) => !top.includes(id))
    .slice(0, 3);
  const ad = cleanIds(data.ad)
    .filter((id) => !top.includes(id) && !long.includes(id))
    .slice(0, 1);

  // Anything still attached to this page but no longer picked comes off it.
  // Detached, not deleted, so the banner stays available to other pages.
  const attached = await db.banner.findMany({
    where: {
      categoryId,
      placement: { in: ["category-top", "category-long", "category-ad"] },
    },
    select: { id: true },
  });
  const picked = new Set([...top, ...long, ...ad]);
  const detach = attached.filter((b) => !picked.has(b.id));

  const writes = [
    ...top.map((id, i) =>
      db.banner.update({
        where: { id },
        data: { placement: "category-top", categoryId, sortOrder: i },
      }),
    ),
    ...long.map((id, i) =>
      db.banner.update({
        where: { id },
        data: { placement: "category-long", categoryId, sortOrder: i },
      }),
    ),
    ...ad.map((id) =>
      db.banner.update({
        where: { id },
        data: { placement: "category-ad", categoryId, sortOrder: 0 },
      }),
    ),
    ...detach.map((b) =>
      db.banner.update({
        where: { id: b.id },
        data: { placement: "", categoryId: null },
      }),
    ),
    // The heights live on the page itself, not on the banner (client's slide 4).
    db.category.update({
      where: { id: categoryId },
      data: {
        longBannerHeight: data.longHeight,
        adBannerHeight: data.adHeight,
      },
    }),
  ];

  try {
    // One transaction so a failed pick cannot leave the page half-saved.
    await db.$transaction(writes);
  } catch (err) {
    console.error(
      `[pages] category banner picks failed for ${categoryId}:`,
      err,
    );
    return { ok: false, message: "Could not save the page banners." };
  }

  revalidatePath("/admin/pages");
  revalidatePath("/admin/banners");
  // Every category listing page renders these picks.
  revalidatePath("/category", "layout");
  return { ok: true };
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
  /** Up to two banners above the directory, in order. */
  bannerIds: z.array(safeText(100)).max(2).default([]),
});

/** Save /brands' preview grid + banner picks for one store version. */
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

  const fields = {
    brandsPreviewHeight: data.previewHeight,
    brandsPreviewColumns: data.previewColumns,
    brandsPreviewRows: data.previewRows,
    brandsBannerIds: data.bannerIds.filter(Boolean),
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
