import { PopupForm } from "@/components/admin/popup-form";
import { getSiteConfig } from "@/lib/site-config";
import { getRequestSiteVersion } from "@/lib/site-version.server";
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
  // The store-picker popup renders this content; the form's preview needs it.
  const version = await getRequestSiteVersion();
  const site = await getSiteConfig(version);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">New popup</h1>
      <PopupForm popup={null} backHref={backHref} switcher={site.switcher} />
    </div>
  );
}
