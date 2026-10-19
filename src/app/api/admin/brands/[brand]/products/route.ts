import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = Promise<{ brand: string }>;

/**
 * Every product of one brand, for the page builder's brand-scoped pickers.
 *
 * The builder's initial product list is capped (it powers several pickers at
 * once), which made brands whose products fell outside the cap look empty in
 * the tabbed showcase editor. This endpoint queries the brand directly, with no
 * cap, and is admin-only because it includes inactive products.
 *
 * `brand` accepts the brand slug or its name (case-insensitive), so it can be
 * called with whichever identifier a caller has.
 */
export async function GET(_request: Request, { params }: { params: Params }) {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    session = null;
  }
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const term = (await params).brand?.trim();
  if (!term || term.length > 200) {
    return NextResponse.json(
      { error: "A brand slug or name is required." },
      { status: 400 },
    );
  }

  const brand = await db.brand.findFirst({
    where: {
      OR: [{ slug: term }, { name: { equals: term, mode: "insensitive" } }],
    },
    select: { id: true, slug: true, name: true },
  });
  if (!brand) {
    return NextResponse.json({ error: "Brand not found." }, { status: 404 });
  }

  const products = await db.product.findMany({
    where: { brandId: brand.id },
    select: {
      slug: true,
      name: true,
      images: true,
      summary: true,
      isPreOrder: true,
      brand: { select: { slug: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    brand,
    products: products.map((product) => ({
      slug: product.slug,
      name: product.name,
      image: product.images[0] ?? "",
      brandSlug: product.brand.slug,
      brandName: product.brand.name,
      isPreOrder: product.isPreOrder,
      summary: product.summary ?? undefined,
    })),
  });
}
