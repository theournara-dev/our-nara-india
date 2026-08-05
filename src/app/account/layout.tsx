import Link from "next/link";
import { Container } from "@/components/ui/container";

const accountLinks = [
  { label: "Overview", href: "/account" },
  { label: "Orders", href: "/account/orders" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "Mileage", href: "/account/mileage" },
  { label: "Coupons", href: "/account/coupons" },
];

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <Container className="grid gap-8 py-10 lg:grid-cols-[220px_1fr]">
      <aside>
        <p className="mb-3 text-sm font-semibold text-zinc-900">My Page</p>
        <nav className="space-y-1" aria-label="My Page">
          {accountLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </Container>
  );
}
