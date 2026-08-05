import Link from "next/link";
import { Container } from "@/components/ui/container";
import { NAV_CATEGORIES, SITE } from "@/lib/constants";

const shopLinks = NAV_CATEGORIES.map((c) => ({
  label: c.name,
  href: `/category/${c.slug}`,
}));

const communityLinks = [
  { label: "Notice", href: "/community/notice" },
  { label: "Product Q&A", href: "/community/qa" },
  { label: "FAQ", href: "/community/faq" },
  { label: "Review", href: "/review" },
  { label: "Stores", href: "/stores" },
  { label: "Ambassador", href: "/ambassador" },
];

const supportLinks = [
  { label: "Terms of Use & Privacy", href: "/policies/terms" },
  { label: "Cancellation & Refund Policy", href: "/policies/refund" },
  { label: "Privacy Policy", href: "/policies/privacy" },
  { label: "Help / Guide", href: "/help" },
  { label: "About the Company", href: "/about" },
];

const accountLinks = [
  { label: "My Page", href: "/account" },
  { label: "Orders", href: "/account/orders" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "Mileage", href: "/account/mileage" },
  { label: "Coupons", href: "/account/coupons" },
];

function LinkColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <nav aria-label={title}>
      <p className="mb-3 text-sm font-semibold text-zinc-900">{title}</p>
      <ul className="space-y-2 text-sm text-zinc-600">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="hover:text-zinc-900">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Storefront footer: navigation columns, CS center, world shipping, legal. */
export function Footer() {
  return (
    <footer className="border-t border-zinc-100 bg-zinc-50">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <p className="text-lg font-bold tracking-tight">{SITE.name}</p>
          <p className="mt-2 text-sm text-zinc-500">
            {SITE.tagline}. {SITE.description}
          </p>
          <p className="mt-4 text-sm text-zinc-600">
            A brand of Seoulveda Trading LLP &amp; The First Team.
          </p>
        </div>
        <LinkColumn title="Shop" links={shopLinks} />
        <LinkColumn title="Community" links={communityLinks} />
        <LinkColumn title="Support" links={supportLinks} />
        <LinkColumn title="My Page" links={accountLinks} />
      </Container>

      <Container className="grid gap-6 border-t border-zinc-100 py-8 text-sm text-zinc-600 lg:grid-cols-3">
        <div>
          <p className="mb-1 font-semibold text-zinc-900">CS CENTER</p>
          <p>{SITE.supportPhone}</p>
          <p className="text-xs text-zinc-500">
            Weekdays 09:00–18:00 · Sat, Sun &amp; holidays off
          </p>
        </div>
        <div>
          <p className="mb-1 font-semibold text-zinc-900">WORLD SHIPPING</p>
          <p>
            Shipping available worldwide. Select your destination country at
            checkout.
          </p>
        </div>
        <div>
          <p className="mb-1 font-semibold text-zinc-900">PAYMENTS</p>
          <p>Cards · UPI · Netbanking · Wallets (via Razorpay)</p>
        </div>
      </Container>

      <div className="border-t border-zinc-100">
        <Container className="flex flex-col gap-2 py-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <p>
            Address: One World, S.V. Road, Malad West, Mumbai, Maharashtra
            400064 · Incheon, Republic of Korea
          </p>
        </Container>
      </div>
    </footer>
  );
}
