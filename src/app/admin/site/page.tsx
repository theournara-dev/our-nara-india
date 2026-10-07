import { SiteSettingsForm } from "@/components/admin/site/site-settings-form";
import { loadSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/**
 * Site settings: the content that is identical across pages but differs per
 * store — contact details, the top banner and the store picker.
 */
export default async function AdminSitePage() {
  const [local, global] = await Promise.all([
    loadSiteConfig("local"),
    loadSiteConfig("global"),
  ]);

  return (
    <SiteSettingsForm
      initial={{ local, global }}
      // The store picker is shared: both stores render the same popup, so the
      // editor works on one copy and saves it to every version's row.
      initialSwitcher={local.switcher}
    />
  );
}
