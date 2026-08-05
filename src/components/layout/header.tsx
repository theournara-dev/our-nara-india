import { Heart, Search, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { NAV_CATEGORIES, SITE } from "@/lib/constants";

const utilityLinks = [
  { label: "Login", href: "/login" },
  { label: "Join", href: "/join" },
  { label: "Order", href: "/account/orders" },
  { label: "My Page", href: "/account" },
  { label: "Couponzone", href: "/coupons" },
];

const navLinks = [
  { label: "Brand", href: "/brands" },
  { label: "Review", href: "/review" },
  { label: "Event", href: "/event" },
  { label: "Stores", href: "/stores" },
  { label: "Community", href: "/community" },
  { label: "Ambassador", href: "/ambassador" },
];

const iconLinks = [
  { href: "/search", label: "Search", Icon: Search },
  { href: "/account/wishlist", label: "Wishlist", Icon: Heart },
  { href: "/account", label: "My Page", Icon: User },
  { href: "/cart", label: "Cart", Icon: ShoppingBag },
];

/** Storefront header: utility bar, brand + search + icons, primary navigation. */
export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white">
      {/* Utility bar */}
      <div className="border-b border-zinc-100 bg-zinc-50">
        <Container className="flex h-9 items-center justify-between text-xs text-zinc-500">
          <p className="hidden sm:block">{SITE.tagline} 🎁</p>
          <nav className="ml-auto flex items-center gap-4" aria-label="Account">
            {utilityLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-zinc-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </Container>
      </div>

      {/* Main bar */}
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="shrink-0 text-xl font-bold tracking-tight">
          {SITE.name}
        </Link>

        <form
          action="/search"
          method="get"
          className="hidden flex-1 items-center justify-center md:flex"
          role="search"
        >
          <label className="relative w-full max-w-md">
            <span className="sr-only">Search products</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              name="q"
              placeholder="Search products, brands…"
              className="h-10 w-full rounded-full border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none focus:border-zinc-400 focus:bg-white"
            />
          </label>
        </form>

        <div className="flex items-center gap-1">
          {iconLinks.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              <Icon className="h-5 w-5" />
            </Link>
          ))}
        </div>
      </Container>

      {/* Primary nav */}
      <nav className="border-t border-zinc-100" aria-label="Primary">
        <Container className="flex h-12 items-center gap-6 overflow-x-auto">
          {NAV_CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="whitespace-nowrap text-sm font-semibold text-zinc-800 transition-colors hover:text-zinc-950"
            >
              {category.name}
            </Link>
          ))}
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950"
            >
              {link.label}
            </Link>
          ))}
        </Container>
      </nav>
    </header>
  );
}
