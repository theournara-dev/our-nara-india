"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  /** Greyed out + non-clickable until the section is built. */
  disabled?: boolean;
};

const nav: NavItem[] = [
  { label: "Overview", href: "/admin" },
  { label: "Users & Permissions", href: "/admin/users" },
  { label: "Products", href: "/admin/products" },
  { label: "Pre-orders", href: "/admin/preorders" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Feedback", href: "/admin/feedback" },
  // Not built yet — kept visible but disabled so the roadmap is visible.
  { label: "Coupons", href: "/admin/coupons", disabled: true },
  { label: "Reviews", href: "/admin/reviews", disabled: true },
  { label: "Pages", href: "/admin/pages" },
  { label: "Banners & Popups", href: "/admin/banners" },
];

export function AdminNav() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="space-y-1" aria-label="Admin">
      {nav.map((item) => {
        if ("disabled" in item && item.disabled) {
          return (
            <span
              key={item.href}
              aria-disabled="true"
              title="Coming soon"
              className="block cursor-not-allowed rounded-lg px-3 py-2 text-sm text-zinc-300"
            >
              {item.label}
              <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                Soon
              </span>
            </span>
          );
        }
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-white font-semibold text-point-600 shadow-sm"
                : "text-zinc-600 hover:bg-white hover:text-zinc-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
