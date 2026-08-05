import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { faqs } from "@/data/content";

export const metadata: Metadata = { title: "Help & Guide" };

export default function HelpPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Support"
        title="Help & Guide"
        subtitle="Common questions about ordering, shipping and returns."
      />
      <Container className="max-w-3xl space-y-4 pb-16">
        {faqs.map((faq) => (
          <details
            key={faq.q}
            className="rounded-2xl border border-zinc-100 bg-white p-5"
          >
            <summary className="cursor-pointer font-medium text-zinc-900">
              {faq.q}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              {faq.a}
            </p>
          </details>
        ))}
      </Container>
    </div>
  );
}
