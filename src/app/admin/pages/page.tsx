import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPagesPage() {
  const pages = await db.page.findMany({
    include: { _count: { select: { sections: true } } },
    orderBy: { slug: "asc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Pages</h1>
        <p className="text-sm text-zinc-500">
          Structure pages by adding, reordering, and customizing sections.
        </p>
      </div>

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
                      className="inline-flex h-8 items-center justify-center rounded bg-point-500 px-3 text-sm font-semibold text-white transition-colors hover:bg-point-600"
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
    </div>
  );
}
