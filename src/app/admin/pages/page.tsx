import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const editBtnCls =
  "inline-flex h-8 items-center justify-center rounded bg-point-500 px-3 text-sm font-semibold text-white transition-colors hover:bg-point-600";

/**
 * Pages: every page the storefront renders from configuration. The content
 * pages (home, ambassador) are built from sections; the other pages — the
 * brands directory and each top-level category listing — keep their settings
 * here too, so the records they describe (categories, brands) stay records
 * (client's slide 4).
 */
export default async function AdminPagesPage() {
  const [pages, categories] = await Promise.all([
    db.page.findMany({
      include: { _count: { select: { sections: true } } },
      orderBy: { slug: "asc" },
    }),
    // Top-level categories own a page each; mid-level ones are its filters.
    db.category.findMany({
      where: { parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true },
    }),
  ]);

  // How many blocks each category page already has, for the index summary.
  const picks = await db.banner.groupBy({
    by: ["categoryId", "placement"],
    where: { categoryId: { in: categories.map((c) => c.id) } },
    _count: { _all: true },
  });
  const blocksOf = (categoryId: string) => {
    const of = (placement: string) =>
      picks.find(
        (p) => p.categoryId === categoryId && p.placement === placement,
      )?._count._all ?? 0;
    const parts = [
      of("category-top") > 0 ? `top ×${of("category-top")}` : null,
      of("category-long") > 0 ? `long ×${of("category-long")}` : null,
      of("category-ad") > 0 ? "ad" : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "None yet";
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Pages</h1>
        <p className="text-sm text-zinc-500">
          Structure pages by adding, reordering, and customizing sections, and
          set the pages that are not built from sections here.
        </p>
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Content pages
      </h2>
      <div className="overflow-x-auto rounded-2xl border border-zinc-100 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Page</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Sections</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-zinc-500"
                >
                  No pages yet.
                </td>
              </tr>
            ) : (
              pages.map((page) => (
                <tr
                  key={page.id}
                  className="border-b border-zinc-50 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {page.title}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">/{page.slug}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {page._count.sections}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        page.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {page.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/pages/${page.slug}/builder`}
                      className={editBtnCls}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Other pages
      </h2>
      <div className="overflow-x-auto rounded-2xl border border-zinc-100 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Page</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Blocks</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-50">
              <td className="px-4 py-3 font-medium text-zinc-900">
                Brands page
              </td>
              <td className="px-4 py-3 text-zinc-600">/brands</td>
              <td className="px-4 py-3 text-zinc-600">
                Banners + preview grid
              </td>
              <td className="px-4 py-3 text-right">
                <Link href="/admin/pages/brands" className={editBtnCls}>
                  Edit
                </Link>
              </td>
            </tr>
            {categories.map((category) => (
              <tr
                key={category.id}
                className="border-b border-zinc-50 last:border-0"
              >
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {category.name}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  /category/{category.slug}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {blocksOf(category.id)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/pages/category/${category.slug}`}
                    className={editBtnCls}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
