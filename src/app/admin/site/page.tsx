import { SiteSettingsForm } from "@/components/admin/site/site-settings-form";
import { db } from "@/lib/db";
import { loadSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/**
 * Site settings: the content that is identical across pages but differs per
 * store — contact details, the top banner and the store picker.
 */
export default async function AdminSitePage() {
  const [local, global, banners] = await Promise.all([
    loadSiteConfig("local"),
    loadSiteConfig("global"),
    // The brands page puts standalone banners above its directory, so it picks
    // them by name here (client's slide 3).
    db.banner.findMany({
      select: { id: true, title: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
  ]);

  return (
    <SiteSettingsForm
      initial={{ local, global }}
      banners={banners}
      // The store picker is shared: both stores render the same popup, so the
      // editor works on one copy and saves it to every version's row.
      initialSwitcher={local.switcher}
    />
  );
}
