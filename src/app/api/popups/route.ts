import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public endpoint returning active, in-schedule popups. Consumed client-side by
 * <PopupHost /> so the root layout can stay static (no per-request DB work on
 * every page). Popups are managed entirely from the admin dashboard
 * (`/admin/popups`); there's no per-product/brand gating.
 */
export async function GET() {
  const now = new Date();
  const popups = await db.popup.findMany({
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      image: true,
      ctaLabel: true,
      ctaHref: true,
      placement: true,
      frequency: true,
    },
  });

  return NextResponse.json({ popups });
}
