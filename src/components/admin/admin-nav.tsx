"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { label: "Overview", href: "/admin" },
  { label: "Users & Permissions", href: "/admin/users" },
  { label: "Products", href: "/admin/products" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Coupons", href: "/admin/coupons" },
  { label: "Reviews", href: "/admin/reviews" },
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
