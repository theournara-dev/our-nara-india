import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <div>
      <PageHeader eyebrow="Your basket" title="Cart" />
      <Container className="pb-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center">
          <p className="text-3xl">🛍️</p>
          <p className="mt-3 text-zinc-600">Your cart is empty.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Cart &amp; checkout will be enabled with the commerce milestone.
          </p>
          <Button href="/category/skin-care" variant="outline" className="mt-6">
            Start shopping
          </Button>
        </div>
      </Container>
    </div>
  );
}
