import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Extract the slug segment after a route prefix, e.g. `/products/[slug]`. */
function slugFrom(path: string | null, prefix: string): string | null {
  if (!path) return null;
  const m = path.match(new RegExp(`^/${prefix}/([^/?#]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Public endpoint returning active, in-schedule popups. Consumed client-side by
 * <PopupHost /> so the root layout can stay static (no per-request DB work on
 * every page).
 *
 * The client passes its current `path` so popups only show for brands/products
 * that have the popup feature enabled (product flag OR brand flag). Non-brand or
 * non-product pages (home, category, etc.) never get popups.
 */
export async function GET(req: NextRequest) {
  const now = new Date();
  const path = req.nextUrl.searchParams.get("path");
  const productSlug = slugFrom(path, "products");
  const brandSlug = slugFrom(path, "brand");

  // Resolve the effective popup flag for the current page. A product page also
  // inherits its brand's flag, so enabling a brand enables all its products.
  let popupEnabled = false;
  if (productSlug) {
    const product = await db.product.findUnique({
      where: { slug: productSlug },
      select: {
        popupEnabled: true,
        brand: { select: { popupEnabled: true } },
      },
    });
    popupEnabled = product
      ? product.popupEnabled || product.brand.popupEnabled
      : false;
  } else if (brandSlug) {
    const brand = await db.brand.findUnique({
      where: { slug: brandSlug },
      select: { popupEnabled: true },
    });
    popupEnabled = brand?.popupEnabled ?? false;
  }

  // Feature not enabled for this page -> show nothing.
  if (!popupEnabled) {
    return NextResponse.json({ popups: [] });
  }

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
