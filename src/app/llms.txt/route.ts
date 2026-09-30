import { headers } from "next/headers";
import { categories } from "@/data/catalog";
import { getSiteUrl, resolveRequestSiteVersion } from "@/lib/site-version";

export async function GET(): Promise<Response> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const siteUrl = getSiteUrl(resolveRequestSiteVersion(host));

  const content = [
    "# OUR:NARA",
    "",
    "> OUR:NARA is a Korean beauty and skincare ecommerce platform serving customers in India.",
    "",
    "## Website",
    `- Homepage: ${siteUrl}/`,
    `- Brands: ${siteUrl}/brands`,
    `- Stores: ${siteUrl}/stores`,
    "",
    "## Categories",
    ...categories.map(
      (category) => `- ${category.name}: ${siteUrl}/category/${category.slug}`,
    ),
    "",
    "## About",
    `${siteUrl}/about`,
    "",
    "## Crawling",
    `- Robots: ${siteUrl}/robots.txt`,
    `- Sitemap: ${siteUrl}/sitemap.xml`,
  ].join("\n");

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}