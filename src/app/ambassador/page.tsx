import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Ambassador" };

const perks = [
  "Early access to new product launches",
  "Exclusive ambassador discounts & perks",
  "Free products for featuring reviews & content",
  "Community spotlights and collabs",
];

export default function AmbassadorPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Join the Team"
        title="OUR:NARA Ambassador"
        subtitle="Love K-Beauty? Grow with us as a brand ambassador."
      />
      <Container className="pb-16">
        <div className="mx-auto max-w-2xl rounded-3xl bg-zinc-50 p-8">
          <ul className="space-y-3">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-zinc-700">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-point-500" />
                {perk}
              </li>
            ))}
          </ul>
          <div className="mt-8 text-center">
            <Button href="mailto:theournara@gmail.com">
              Apply to become an ambassador
            </Button>
            <p className="mt-3 text-xs text-zinc-400">
              We’ll get back to you by email.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
