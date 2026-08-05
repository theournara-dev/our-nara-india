import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div>
      <PageHeader
        eyebrow="About us"
        title="About OUR:NARA"
        subtitle="Your new K-Beauty destination — Korean beauty, now in India."
      />
      <Container className="max-w-3xl space-y-6 pb-16 text-zinc-600">
        <p>
          OUR:NARA brings curated Korean beauty to customers around the world,
          with a focus on India. We partner with trusted Korean brands to make
          effective, well-priced skincare, makeup and haircare accessible and
          enjoyable.
        </p>
        <p>
          From lightweight sunscreens to peptide-powered essences, every product
          is selected with care — so building a simple, consistent routine feels
          like a treat.
        </p>
        <div className="rounded-2xl bg-zinc-50 p-6 text-sm">
          <p className="mb-2 font-semibold text-zinc-900">Company</p>
          <p>
            OUR:NARA · A brand of Seoulveda Trading LLP &amp; The First Team
          </p>
          <p className="mt-2">
            India: One World, S.V. Road, Malad West, Mumbai, Maharashtra 400064
          </p>
          <p className="mt-1">
            South Korea: Room 1816, Building B, Incheon Techno Valley U1 Center,
            94, Galsan-dong, Bupyeong-gu, Incheon
          </p>
        </div>
      </Container>
    </div>
  );
}
