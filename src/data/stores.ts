import { db } from "@/lib/db";
import { parseStoreHours, type StoreHours } from "@/lib/store-hours";
import type { SiteVersion } from "@/lib/site-version";

/** A store as the storefront needs it. */
export interface StoreView {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  hours: StoreHours;
  /** Place name/address or "lat,lng" for the map. */
  mapQuery: string;
}

/**
 * Active stores for a storefront, in the order the admin arranged them.
 * The list is dynamic: one row per store, editable in /admin/stores.
 */
export async function getStores(version: SiteVersion): Promise<StoreView[]> {
  const rows = await db.store.findMany({
    where: { version, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    email: row.email,
    hours: parseStoreHours(row.hours),
    mapQuery: row.mapQuery,
  }));
}

/** Every store (active or not) for the admin editor, per version. */
export async function getAllStores(version: SiteVersion) {
  return db.store.findMany({
    where: { version },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}
