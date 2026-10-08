import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { StoreDirectory } from "@/components/stores/store-directory";
import { getStores } from "@/data/stores";
import {
  SITE_VERSION_COOKIE,
  parseSiteVersion,
  resolveRequestSiteVersion,
} from "@/lib/site-version";

export const metadata: Metadata = { title: "Stores" };
export const dynamic = "force-dynamic";

/**
 * Stores page matching the original: a STORES heading and, per store, the map
 * and its details card. The list is dynamic (edited in /admin/stores); with
 * more than one store a row of name pills switches between them.
 */
export default async function StoresPage() {
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const version =
    parseSiteVersion(cookieStore.get(SITE_VERSION_COOKIE)?.value) ??
    resolveRequestSiteVersion(
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    );
  const stores = await getStores(version);

  return (
    <div className="mx-auto w-[98%] max-w-[1360px] px-[16px] pt-[50px] pb-[70px] leading-[normal] md:px-[20px] md:max-[1025px]:pt-[70px] md:max-[1025px]:pb-[90px] min-[1025px]:pt-[41px] min-[1025px]:pb-[120px]">
      <h1 className="mb-[35px] text-center text-[32px] leading-[normal] font-bold text-[#222] md:mb-[50px]">
        STORES
      </h1>
      <StoreDirectory stores={stores} />
    </div>
  );
}
