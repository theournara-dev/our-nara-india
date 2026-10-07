import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import {
  DEFAULT_SITE_CONTENT,
  siteContentFromRow,
  type SiteContent,
} from "@/lib/site-content";
import type { SiteVersion } from "@/lib/site-version";

/**
 * Reads the per-version site configuration. A missing row (or missing fields)
 * falls back to the defaults baked into `site-content.ts`, so the storefront
 * never renders an empty footer while the content is still being filled in
 * from /admin/site.
 */
export async function loadSiteConfig(
  version: SiteVersion,
): Promise<SiteContent> {
  try {
    const row = await db.siteConfig.findUnique({ where: { version } });
    return siteContentFromRow(version, row);
  } catch (err) {
    // A DB hiccup must not take the whole storefront down with it.
    console.error(`[site-config] failed to load ${version} config:`, err);
    return DEFAULT_SITE_CONTENT[version];
  }
}

/**
 * Same read, deduped per request for server components (layout, footer, header
 * all need it). Server actions and webhook handlers should call
 * `loadSiteConfig` instead — there is no render to scope a cache to.
 */
export const getSiteConfig = cache(loadSiteConfig);
