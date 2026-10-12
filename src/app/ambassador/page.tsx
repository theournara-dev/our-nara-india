import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AmbassadorApplyForm } from "@/components/ambassador/apply-form";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { db } from "@/lib/db";
import { getSiteConfig } from "@/lib/site-config";
import { getRequestSiteVersion } from "@/lib/site-version.server";

export const metadata: Metadata = { title: "Ambassador" };

// The image column and the product select are admin-managed, so the page must
// reflect the database on every request instead of caching the first render.
export const dynamic = "force-dynamic";

const perks = [
  "Early access to new product launches",
  "Exclusive ambassador discounts & perks",
  "Free products for featuring reviews & content",
  "Community spotlights and collabs",
];

/**
 * /ambassador: the client's sticky layout — the admin's long-form images
 * scroll on the left while the application form stays pinned on the right
 * (released at the end of the section). On phones the page is one column:
 * images first, then the form.
 */
export default async function AmbassadorPage() {
  const version = await getRequestSiteVersion();
  const site = await getSiteConfig(version);
  const images = site.ambassador.images;

  const productRows = await db.product.findMany({
    where: version === "global" ? { globalIsActive: true } : { isActive: true },
    orderBy: { name: "asc" },
    select: { name: true, brand: { select: { name: true } } },
  });
  const products = productRows.map((p) => ({
    name: p.name,
    brand: p.brand.name,
  }));

  return (
    <div>
      <PageHeader title="OUR:NARA Ambassador" />
      <Container className="pb-16">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(380px,430px)] lg:gap-12">
          {/* Long-form images (left). Until the client uploads artwork, the
              perks list keeps the column from being empty. */}
          <div className="min-w-0 overflow-hidden rounded-2xl">
            {images.length > 0 ? (
              images.map((image) =>
                image.href ? (
                  <Link
                    key={image.id}
                    href={image.href}
                    className="block overflow-hidden"
                  >
                    <Image
                      src={image.image}
                      alt={image.alt ?? ""}
                      width={1200}
                      height={1600}
                      unoptimized
                      className="h-auto w-full"
                    />
                  </Link>
                ) : (
                  <Image
                    key={image.id}
                    src={image.image}
                    alt={image.alt ?? ""}
                    width={1200}
                    height={1600}
                    unoptimized
                    className="block h-auto w-full"
                  />
                ),
              )
            ) : (
              <div className="rounded-2xl bg-zinc-50 p-8">
                <ul className="space-y-3">
                  {perks.map((perk) => (
                    <li
                      key={perk}
                      className="flex items-start gap-3 text-zinc-700"
                    >
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-point-500" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Application form (right): sticky within the section on desktop,
              scrolling its own fields when taller than the viewport. */}
          <div className="lg:sticky lg:top-6">
            <div className="flex flex-col rounded-3xl border border-zinc-100 bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)] lg:max-h-[calc(100dvh-3rem)]">
              <AmbassadorApplyForm products={products} />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
