import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Help" };

const guideSections = [
  {
    title: "How to Join",
    body: "Create an account from the Join page to track orders, save wishlists and collect mileage points on every purchase.",
  },
  {
    title: "How to order",
    body: "Browse the catalog, select your options and quantity, then add to cart. Proceed to checkout to place your order.",
  },
  {
    title: "Payment",
    body: "We accept cards, UPI, netbanking and wallets via Razorpay. Payment is processed securely at checkout.",
  },
  {
    title: "Shipping",
    body: "Domestic (India) orders ship in 3–7 business days; international orders in 7–14 business days. Shipping is free.",
  },
  {
    title: "Returns & Exchanges",
    body: "Unopened items can be returned within 14 days of delivery. Contact support to start a return or exchange.",
  },
  {
    title: "Refunds",
    body: "Refunds are issued to the original payment method within 5–7 business days after we receive the returned item.",
  },
  {
    title: "Other",
    body: "For anything else, reach our support team during business hours — see the Stores page for contact details.",
  },
];

/** Help/guide page matching the original: HOME › HELP breadcrumb and the
 *  guide sections (How to Join / How to order / Payment / Shipping /
 *  Returns & Exchanges / Refunds / Other). */
export default function HelpPage() {
  return (
    <div>
      <Container className="py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-xs text-[#888]">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-point-500">
                HOME
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-[#222]">HELP</li>
          </ol>
        </nav>

        <h1 className="mb-8 font-display text-3xl font-semibold text-ink">
          HELP
        </h1>

        <div className="mx-auto max-w-3xl space-y-4">
          {guideSections.map((section) => (
            <details
              key={section.title}
              className="rounded-xl border border-[#e9e9e9] bg-white p-5"
            >
              <summary className="cursor-pointer font-semibold text-ink">
                {section.title}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[#666]">
                {section.body}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </div>
  );
}
