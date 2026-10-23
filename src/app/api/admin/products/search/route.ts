import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  parseProductSearchParams,
  parseSelectedSlugs,
} from "@/lib/admin-product-search";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const productSelect = {
  slug: true,
  name: true,
  images: true,
  summary: true,
  isPreOrder: true,
  brand: { select: { slug: true, name: true } },
} satisfies Prisma.ProductSelect;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

function toOption(product: ProductRow) {
  return {
    slug: product.slug,
    name: product.name,
    image: product.images[0] ?? "",
    brandSlug: product.brand.slug,
    brandName: product.brand.name,
    isPreOrder: product.isPreOrder,
    summary: product.summary ?? undefined,
  };
}

function whereFor(
  q: string,
  brand: string,
  category: string,
): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ isActive: true }];

  if (brand) and.push({ brand: { slug: brand } });

  if (category) {
    and.push({
      OR: [
        { category: { slug: category } },
        {
          subcategories: {
            some: { category: { parent: { slug: category } } },
          },
        },
      ],
    });
  }

  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  return { AND: and };
}

/**
 * Server-side search for the page builder's product picker, so it can reach
 * every product instead of filtering the 500 rows the builder page ships.
 *
 * `selected` slugs are resolved separately: a chosen product may not be on the
 * current result page, but the editor still has to show its name.
 */
export async function GET(request: Request) {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    session = null;
  }
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const { q, brand, category, page, pageSize } = parseProductSearchParams(
    url.searchParams,
  );
  const selectedSlugs = parseSelectedSlugs(url.searchParams.get("selected"));
  const where = whereFor(q, brand, category);

  const [total, products, selected] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      select: productSelect,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    selectedSlugs.length
      ? db.product.findMany({
          where: { slug: { in: selectedSlugs } },
          select: productSelect,
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    products: products.map(toOption),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
    selected: selected.map(toOption),
  });
}
