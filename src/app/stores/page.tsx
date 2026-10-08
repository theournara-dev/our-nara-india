import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { StoreInfo } from "@/components/stores/store-info";
import { StoreMap } from "@/components/stores/store-map";
import { getSiteConfig } from "@/lib/site-config";
import { resolveStoreMapQuery } from "@/lib/store-map";
import {
  SITE_VERSION_COOKIE,
  parseSiteVersion,
  resolveRequestSiteVersion,
} from "@/lib/site-version";

export const metadata: Metadata = { title: "Stores" };
export const dynamic = "force-dynamic";

/**
 * Stores page matching the original: a STORES heading, the store map and its
 * details card. Up to 1024px they stack; above that they sit side by side, as
 * on the original. Contact rows and store details come from the site settings.
 */
export default async function StoresPage() {
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const version =
    parseSiteVersion(cookieStore.get(SITE_VERSION_COOKIE)?.value) ??
    resolveRequestSiteVersion(
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    );
  const site = await getSiteConfig(version);

  return (
    <div className="mx-auto w-[98%] max-w-[1360px] px-[16px] pt-[50px] pb-[70px] leading-[normal] md:px-[20px] md:max-[1025px]:pt-[70px] md:max-[1025px]:pb-[90px] min-[1025px]:pt-[41px] min-[1025px]:pb-[120px]">
      <h1 className="mb-[35px] text-center text-[32px] leading-[normal] font-bold text-[#222] md:mb-[50px]">
        STORES
      </h1>
      <section className="grid grid-cols-[minmax(0,1fr)] gap-[22px] min-[1025px]:grid-cols-[minmax(0,2fr)_410px] min-[1025px]:gap-[36px]">
        <StoreMap
          name={site.storeName}
          query={resolveStoreMapQuery(site.storeMapQuery, site.address)}
        />
        <StoreInfo
          name={site.storeName}
          address={site.address}
          phone={site.phone}
          email={site.email}
          hours={site.storeHours}
        />
      </section>
    </div>
  );
}
