import type { Metadata } from "next";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { getSiteConfig } from "@/lib/site-config";
import { resolveRequestSiteVersion } from "@/lib/site-version";

export const metadata: Metadata = { title: "B2B" };

/**
 * Wholesale / B2B landing page. The programme is not open yet, so this is a
 * holding page with a way to register interest — replace the copy when it
 * launches.
 */
export default async function B2BPage() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const version = resolveRequestSiteVersion(host);
  const site = await getSiteConfig(version);

  return (
    <div>
      <PageHeader
        eyebrow="Wholesale"
        title="B2B"
        subtitle="Buy OUR:NARA for your shop, salon or retail chain."
      />
      <Container className="pb-20">
        <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-point-500">
            Coming soon
          </p>
          <h2 className="mt-3 text-xl font-semibold text-zinc-900">
            Our wholesale programme is being prepared
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            Trade pricing, bulk order support and retail distribution are coming
            soon. In the meantime, tell us about your business and we will get in
            touch as soon as it opens.
          </p>
          <div className="mt-6 flex justify-center">
            <Button href={`mailto:${site.email}?subject=B2B%20enquiry`}>
              Contact the team
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
