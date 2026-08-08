import { BannerForm } from "@/components/admin/banner-form";
import { buildBackHref } from "../lib";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  search?: string;
  placement?: string;
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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">New banner</h1>
      <BannerForm banner={null} backHref={backHref} />
    </div>
  );
}
