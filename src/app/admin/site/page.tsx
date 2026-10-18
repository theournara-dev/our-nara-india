import { SiteSettingsForm } from "@/components/admin/site/site-settings-form";
import { getRootCategories } from "@/data/categories";
import { MENU_STATIC_ROWS } from "@/lib/menu-icons";
import { loadSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/**
 * Site settings: the content that is identical across pages but differs per
 * store — contact details, the top banner and the store picker — plus the header
 * menu's icons, which the admin chooses here. Page-level settings (the brands
 * page, the category pages) live under Pages (client's slide 4).
 */
export default async function AdminSitePage() {
  const [local, global, categories] = await Promise.all([
    loadSiteConfig("local"),
    loadSiteConfig("global"),
    // The menu's icon picker lists every row, including the admin's category
    // roots (their ids match the header's `category-<slug>` keys).
    getRootCategories(),
  ]);
  const menuRows = [
    { id: "home", label: "OUR:NARA (home)" },
    ...categories.map((category) => ({
      id: `category-${category.slug}`,
      label: category.name,
    })),
    ...MENU_STATIC_ROWS.map((row) => ({
      id: row.id,
      label: row.label,
    })),
  ];

  return (
    <SiteSettingsForm
      initial={{ local, global }}
      // The store picker and the menu icons are shared: both stores render the
      // same header furniture, so the editor works on one copy and saves it to
      // every version's row.
      initialSwitcher={local.switcher}
      initialMenuIcons={local.menuIcons}
      menuRows={menuRows}
    />
  );
}
