import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <div>
      <PageHeader eyebrow="Legal" title="Terms of Use & Privacy" />
      <Container className="mx-auto max-w-3xl space-y-6 pb-16 text-sm leading-relaxed text-zinc-600">
        <p>
          <strong className="text-zinc-900">1. Acceptance of Terms.</strong> By
          accessing the OUR:NARA website you agree to these terms of use.
        </p>
        <p>
          <strong className="text-zinc-900">2. Products.</strong> All products
          are subject to availability and may be offered as pre-orders that ship
          when stock arrives.
        </p>
        <p>
          <strong className="text-zinc-900">3. Pricing.</strong> Prices are
          displayed in Indian Rupees (INR) and include applicable taxes unless
          stated otherwise.
        </p>
        <p>
          <strong className="text-zinc-900">4. Use of Site.</strong> You agree
          not to misuse the site or attempt to interfere with its operation.
        </p>
        <p>
          <strong className="text-zinc-900">5. Limitation of Liability.</strong>{" "}
          OUR:NARA is not liable for indirect or consequential damages arising
          from your use of the site.
        </p>
        <p>
          This is a placeholder policy for the frontend replica and will be
          replaced with the final legal text.
        </p>
      </Container>
    </div>
  );
}
