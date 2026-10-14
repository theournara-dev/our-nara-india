import { db } from "@/lib/db";

/**
 * Event (campaign) data layer for /event. Events are managed in /admin/events
 * (client slide 10), so the storefront reads them from the database.
 */

export interface EventCard {
  id: string;
  title: string;
  text: string | null;
  dateLabel: string | null;
  image: string | null;
  /** Hex background for cards without artwork. */
  color: string | null;
  href: string | null;
}

/** Live events, in admin order, inside their display window. */
export async function getEvents(): Promise<EventCard[]> {
  const now = new Date();
  return db.event.findMany({
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      text: true,
      dateLabel: true,
      image: true,
      color: true,
      href: true,
    },
  });
}
