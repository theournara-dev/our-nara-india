import {
  StoresManager,
  type AdminStore,
} from "@/components/admin/stores-manager";
import { db } from "@/lib/db";
import { parseStoreHours } from "@/lib/store-hours";
import { parseSiteVersion } from "@/lib/site-version";

export const dynamic = "force-dynamic";

/** Store list management: one dynamic list per storefront version. */
export default async function AdminStoresPage() {
  const rows = await db.store.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const stores: AdminStore[] = rows.map((row) => ({
    id: row.id,
    version: parseSiteVersion(row.version) ?? "local",
    name: row.name,
    address: row.address,
    phone: row.phone,
    email: row.email,
    hours: parseStoreHours(row.hours),
    mapQuery: row.mapQuery,
    isActive: row.isActive,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Stores</h1>
        <p className="text-sm text-zinc-500">
          The stores shown on each storefront&apos;s /stores page. Each store
          keeps its own address, phone, email, opening hours and map location.
        </p>
      </div>
      <StoresManager stores={stores} />
    </div>
  );
}
