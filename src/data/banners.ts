import { db } from "@/lib/db";

/**
 * Home page long banner content. Reproduces the original theme's
 * `longBanner01` section: a full-width, rounded banner carousel. Each banner
 * has a desktop and a mobile image (the theme swaps them responsively).
 *
 * Banners are managed from the admin dashboard (`/admin/banners`). If the DB
 * has no active long banners yet, we fall back to the original static list so
 * the homepage never regresses before content is created.
 */

export interface LongBanner {
  id: string;
  /** Desktop image (wide). */
  image: string;
  /** Mobile image (taller aspect), swapped in on small screens. */
  mobileImage: string;
  alt: string;
  href?: string;
}

const staticLongBanners: LongBanner[] = [
  {
    id: "lb1",
    image: "/upload/goodymall1/en/main/long__banner01.jpg",
    mobileImage: "/upload/goodymall1/en/main/m_long__banner01.jpg",
    alt: "OUR:NARA banner",
    href: "/",
  },
];

/**
 * Active long banners from the database, ordered by sort order. Falls back to
 * the static list when none are published/scheduled yet.
 */
export async function getLongBanners(): Promise<LongBanner[]> {
  const now = new Date();
  const rows = await db.banner.findMany({
    where: {
      placement: "long",
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }],
    },
    orderBy: { sortOrder: "asc" },
  });

  if (rows.length === 0) return staticLongBanners;

  return rows.map((b) => ({
    id: b.id,
    image: b.image,
    mobileImage: b.mobileImage || b.image,
    alt: b.alt || b.title,
    href: b.href ?? undefined,
  }));
}

export { staticLongBanners as longBanners };
