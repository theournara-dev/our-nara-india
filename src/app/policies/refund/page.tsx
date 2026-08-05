import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Cancellation & Refund Policy" };

export default function RefundPage() {
  return (
    <div>
      <PageHeader eyebrow="Legal" title="Cancellation & Refund Policy" />
      <Container className="mx-auto max-w-3xl space-y-6 pb-16 text-sm leading-relaxed text-zinc-600">
        <p>
          <strong className="text-zinc-900">1. Order Cancellation.</strong> You
          may cancel an order before it has been shipped. Once shipped, standard
          return terms apply.
        </p>
        <p>
          <strong className="text-zinc-900">2. Returns.</strong> Damaged or
          incorrect items may be returned within 7 days of delivery for a refund
          or replacement.
        </p>
        <p>
          <strong className="text-zinc-900">3. Refunds.</strong> Approved
          refunds are processed to the original payment method within 5–10
          business days.
        </p>
        <p>
          <strong className="text-zinc-900">4. Pre-Orders.</strong> Pre-orders
          can be cancelled any time before the item ships from our warehouse.
        </p>
        <p>
          This is a placeholder policy for the frontend replica and will be
          replaced with the final legal text.
        </p>
      </Container>
    </div>
  );
}
