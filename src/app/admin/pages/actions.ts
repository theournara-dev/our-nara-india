"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  SECTION_TYPE_META_BY_TYPE,
  type PageSectionRow,
  type SectionType,
} from "@/lib/page-builder/types";

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
