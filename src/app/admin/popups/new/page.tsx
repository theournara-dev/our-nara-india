import { PopupForm } from "@/components/admin/popup-form";
import { buildBackHref } from "../lib";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  search?: string;
  placement?: string;
  frequency?: string;
  active?: string;
  page?: string;
}>;

export default async function NewPopupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const backHref = buildBackHref(params);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">New popup</h1>
      <PopupForm popup={null} backHref={backHref} />
    </div>
  );
}
