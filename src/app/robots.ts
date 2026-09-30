import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getSiteUrl, resolveRequestSiteVersion } from "@/lib/site-version";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const sitemap = `${getSiteUrl(resolveRequestSiteVersion(host))}/sitemap.xml`;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/account/",
          "/checkout/",
          "/cart/",
        ],
      },
    ],
    sitemap,
  };
}