import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div>
      <PageHeader eyebrow="Legal" title="Privacy Policy" />
      <Container className="mx-auto max-w-3xl space-y-6 pb-16 text-sm leading-relaxed text-zinc-600">
        <p>
          <strong className="text-zinc-900">1. Information we collect.</strong>{" "}
          We collect the information you provide when creating an account or
          placing an order, including your name, email, phone and delivery
          address.
        </p>
        <p>
          <strong className="text-zinc-900">2. How we use it.</strong> Your
          information is used to fulfil orders, provide support, and improve the
          store. Payment details are processed by our payment provider and are
          never stored on our servers.
        </p>
        <p>
          <strong className="text-zinc-900">3. Sharing.</strong> We do not sell
          your personal information. Data is shared only with service providers
          necessary to operate the store (e.g. shipping and payment).
        </p>
        <p>
          <strong className="text-zinc-900">4. Contact.</strong> For privacy
          questions, contact {SITE.supportEmail}.
        </p>
        <p>
          This is a placeholder policy for the frontend replica and will be
          replaced with the final legal text.
        </p>
      </Container>
    </div>
  );
}
