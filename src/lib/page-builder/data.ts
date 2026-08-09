import "server-only";
import { db } from "@/lib/db";
import type { PageRow } from "./types";

/**
 * Server-side page-builder data access. Reads a Page with its ordered sections
 * from the database. The storefront renderer and the admin builder both use
 * this so they always agree on the current structure.
 */

export async function getPage(slug: string): Promise<PageRow | null> {
  const page = await db.page.findUnique({
    where: { slug },
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });
  if (!page) return null;

  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    isActive: page.isActive,
    sections: page.sections.map((s) => ({
      id: s.id,
      type: s.type,
      title: s.title,
      config: s.config,
      sortOrder: s.sortOrder,
      isActive: s.isActive,
      startsAt: s.startsAt,
      expiresAt: s.expiresAt,
    })),
  };
}

/** Whether a section is currently within its optional schedule window. */
export function isInSchedule(
  s: { startsAt: Date | null; expiresAt: Date | null },
  now: Date = new Date(),
): boolean {
  if (s.startsAt && s.startsAt > now) return false;
  if (s.expiresAt && s.expiresAt < now) return false;
  return true;
}
