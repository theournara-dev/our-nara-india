import type { Metadata } from "next";
import { AmbassadorApplyForm } from "@/components/ambassador/apply-form";
import { AmbassadorStage } from "@/components/ambassador/ambassador-stage";
import { PageHeader } from "@/components/ui/page-header";
import { db } from "@/lib/db";
import { getSiteConfig } from "@/lib/site-config";
import { getRequestSiteVersion } from "@/lib/site-version.server";

export const metadata: Metadata = { title: "Ambassador" };

// The images and the form copy are admin-managed, so the page must reflect the
// database on every request instead of caching the first render.
export const dynamic = "force-dynamic";

const perks = [
  "Early access to new product launches",
  "Exclusive ambassador discounts & perks",
  "Free products for featuring reviews & content",
  "Community spotlights and collabs",
];

/**
 * /ambassador (client slide 12): full-bleed. The admin's images fill the left
 * half and change as the visitor scrolls; the application form is the right
 * half. Until artwork is uploaded the page falls back to a simple two-column
 * layout with the perks list, so it never looks unfinished.
 */
export default async function AmbassadorPage() {
  const version = await getRequestSiteVersion();
  const site = await getSiteConfig(version);
  const { images, formTitle, formIntro } = site.ambassador;

  const productRows = await db.product.findMany({
    where: version === "global" ? { globalIsActive: true } : { isActive: true },
    orderBy: { name: "asc" },
    select: { name: true, brand: { select: { name: true } } },
  });
  const products = productRows.map((p) => ({
    name: p.name,
    brand: p.brand.name,
  }));

  const form = (
    <AmbassadorApplyForm
      products={products}
      title={formTitle}
      intro={formIntro}
    />
  );

  return (
    <div>
      <PageHeader title="OUR:NARA Ambassador" />
      {images.length > 0 ? (
        <AmbassadorStage images={images}>{form}</AmbassadorStage>
      ) : (
        <div className="mx-auto grid w-full max-w-7xl items-start gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,430px)] lg:px-8">
          <div className="rounded-2xl bg-zinc-50 p-8">
            <ul className="space-y-3">
              {perks.map((perk) => (
                <li key={perk} className="flex items-start gap-3 text-zinc-700">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-point-500" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
          {form}
        </div>
      )}
    </div>
  );
}
