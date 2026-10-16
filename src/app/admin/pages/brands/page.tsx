import Link from "next/link";
import { BrandsPageSettingsForm } from "@/components/admin/brands-page-settings-form";
import { db } from "@/lib/db";
import { loadSiteConfig } from "@/lib/site-config";

/** The banner columns the block pickers and previews need. */
const BANNER_OPTION_SELECT = {
  id: true,
  title: true,
  image: true,
  mobileImage: true,
  alt: true,
  href: true,
  placement: true,
  categoryId: true,
  style: true,
  heading: true,
  subheading: true,
  textAlign: true,
  textVAlign: true,
  textColor: true,
  scrim: true,
} as const;

export const dynamic = "force-dynamic";

/**
 * Page settings for /brands (client's slides 4 and 6): its long banner and promo
 * block — the same two blocks the category pages use — plus the preview grid.
 * They used to sit in Site settings, which now keeps only the store-wide
 * content.
 */
export default async function AdminBrandsPageSettings() {
  const [local, global, banners] = await Promise.all([
    loadSiteConfig("local"),
    loadSiteConfig("global"),
    // Every banner can go in either block.
    db.banner.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: BANNER_OPTION_SELECT,
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
          The directory at /brands: the long banner and promo block above it,
          between the title and the group tabs, plus the preview grid below.
        </p>
      </div>

      <BrandsPageSettingsForm
        initial={{ local: local.brandsPage, global: global.brandsPage }}
        banners={banners}
      />
    </div>
  );
}
