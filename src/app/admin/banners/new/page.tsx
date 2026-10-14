import { BannerForm } from "@/components/admin/banner-form";
import { db } from "@/lib/db";
import { buildBackHref } from "../lib";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  search?: string;
  placement?: string;
  category?: string;
  active?: string;
  page?: string;
}>;

export default async function NewBannerPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const backHref = buildBackHref(params);
  const categories = await db.category.findMany({
    where: { parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">New banner</h1>
      <BannerForm
        banner={null}
        categories={categories}
        backHref={backHref}
        defaults={{ placement: params.placement, categoryId: params.category }}
      />
    </div>
  );
}
