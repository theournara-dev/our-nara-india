import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PopupForm } from "@/components/admin/popup-form";
import { getSiteConfig } from "@/lib/site-config";
import { getRequestSiteVersion } from "@/lib/site-version.server";
import { buildBackHref } from "../../lib";

export const dynamic = "force-dynamic";

type Params = { id: string };
type SearchParams = Promise<{
  search?: string;
  placement?: string;
  frequency?: string;
  active?: string;
  page?: string;
}>;

export default async function EditPopupPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: SearchParams;
}) {
  const [{ id }, listParams] = await Promise.all([params, searchParams]);
  const backHref = buildBackHref(listParams);

  const popup = await db.popup.findUnique({ where: { id } });
  if (!popup) notFound();

  // The store-picker popup renders this content; the form's preview needs it.
  const version = await getRequestSiteVersion();
  const site = await getSiteConfig(version);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Edit popup</h1>
      <PopupForm popup={popup} backHref={backHref} switcher={site.switcher} />
    </div>
  );
}
