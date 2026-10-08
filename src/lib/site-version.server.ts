import "server-only";
import { cookies, headers } from "next/headers";
import {
  parseSiteVersion,
  resolveRequestSiteVersion,
  SITE_VERSION_COOKIE,
  type SiteVersion,
} from "@/lib/site-version";

/**
 * The store a request belongs to: the store switcher's cookie wins (it is what
 * checkout charges), then the request host (our-nara.co.kr → global).
 *
 * Server components use this to serve the right catalogue — hidden products,
 * per-store prices and pre-order state all hang off it.
 */
export async function getRequestSiteVersion(): Promise<SiteVersion> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  return (
    parseSiteVersion(c.get(SITE_VERSION_COOKIE)?.value) ??
    resolveRequestSiteVersion(h.get("x-forwarded-host") ?? h.get("host"))
  );
}
