import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const editBtnCls =
  "inline-flex h-8 items-center justify-center rounded bg-point-500 px-3 text-sm font-semibold text-white transition-colors hover:bg-point-600";

/**
 * Pages: one list of every page the storefront renders from configuration. A
 * page's settings open from here — the content pages (home, ambassador) in the
 * section builder, the brands directory and each top-level category listing on
 * their own screens. The pages differ only in what they can be configured with,
 * which the Configuration column names (client's slide 4).
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
      select: { id: true, slug: true, name: true, isActive: true },
    }),
  ]);

  // How many blocks each category page already has, for the summary column.
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

  const rows = [
    ...pages.map((page) => ({
      key: page.id,
      name: page.title,
      slug: page.slug,
      config: `${page._count.sections} section${page._count.sections === 1 ? "" : "s"}`,
      hidden: !page.isActive,
      href: `/admin/pages/${page.slug}/builder`,
    })),
    {
      key: "brands",
      name: "Brands page",
      slug: "brands",
      config: "Banners · preview grid",
      hidden: false,
      href: "/admin/pages/brands",
    },
    ...categories.map((category) => ({
      key: category.id,
      name: category.name,
      slug: `category/${category.slug}`,
      config: blocksOf(category.id),
      hidden: !category.isActive,
      href: `/admin/pages/category/${category.slug}`,
    })),
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Pages</h1>
        <p className="text-sm text-zinc-500">
          Every page the storefront renders from configuration. Open one to
          update what it shows — the options differ per page.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-100 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Page</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Configuration</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-zinc-500"
                >
                  No pages yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.key}
                  className="border-b border-zinc-50 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <span className="flex items-center gap-2">
                      {row.name}
                      {row.hidden && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                          Hidden
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">/{row.slug}</td>
                  <td className="px-4 py-3 text-zinc-600">{row.config}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={row.href} className={editBtnCls}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
