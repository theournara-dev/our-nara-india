import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getAllCategories } from "@/data/categories";
import { getBrands } from "@/data/brands";
import { db } from "@/lib/db";
import { getSiteUrl, resolveRequestSiteVersion } from "@/lib/site-version";

const publicPaths = [
  "/",
  "/about",
  "/ambassador",
  "/brands",
  "/community",
  "/coupons",
  "/event",
  "/help",
  "/policies/privacy",
  "/policies/refund",
  "/policies/terms",
  "/review",
  "/stores",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const baseUrl = getSiteUrl(resolveRequestSiteVersion(host));

  const [categories, brands, products] = await Promise.all([
    getAllCategories(),
    getBrands(),
    db.product.findMany({
      where: { isActive: true },
      select: { slug: true },
    }),
  ]);

  return [
    ...publicPaths.map((path) => ({ url: `${baseUrl}${path}` })),
    ...categories.map(({ slug }) => ({ url: `${baseUrl}/category/${slug}` })),
    ...brands.map(({ slug }) => ({ url: `${baseUrl}/brand/${slug}` })),
    ...products.map(({ slug }) => ({ url: `${baseUrl}/products/${slug}` })),
  ];
}