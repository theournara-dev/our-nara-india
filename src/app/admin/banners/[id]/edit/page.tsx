import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BannerForm } from "@/components/admin/banner-form";
import { buildBackHref } from "../../lib";

export const dynamic = "force-dynamic";

type Params = { id: string };
type SearchParams = Promise<{
  search?: string;
  placement?: string;
  active?: string;
  page?: string;
}>;

export default async function EditBannerPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: SearchParams;
}) {
  const [{ id }, listParams] = await Promise.all([params, searchParams]);
  const backHref = buildBackHref(listParams);

  const banner = await db.banner.findUnique({ where: { id } });
  if (!banner) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Edit banner</h1>
      <BannerForm banner={banner} backHref={backHref} />
    </div>
  );
}
