import Link from "next/link";
import { BrandsPageSettingsForm } from "@/components/admin/brands-page-settings-form";
import { db } from "@/lib/db";
import { loadSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/**
 * Page settings for /brands (client's slide 4: page configuration lives under
 * Pages). Its preview grid and the banners above the directory used to sit in
 * Site settings; that screen now keeps only the store-wide content.
 */
export default async function AdminBrandsPageSettings() {
  const [local, global, banners] = await Promise.all([
    loadSiteConfig("local"),
    loadSiteConfig("global"),
    // Every standalone banner can go above the directory.
    db.banner.findMany({
      select: { id: true, title: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
  ]);

  return (
    <div className="max-w-3xl">
      <nav className="mb-4 text-xs text-zinc-400">
        <Link href="/admin/pages" className="hover:text-point-500">
          Pages
        </Link>
        <span className="mx-1.5">/</span>
        <span>Brands page</span>
      </nav>

      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
          Brands page
        </h1>
        <p className="text-sm text-zinc-500">
          The directory at /brands: the banners above it and the preview grid
          under the group tabs.
        </p>
      </div>

      <BrandsPageSettingsForm
        initial={{ local: local.brandsPage, global: global.brandsPage }}
        banners={banners}
      />
    </div>
  );
}
