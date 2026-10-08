"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Heart, Home, LayoutGrid, User } from "lucide-react";

/**
 * Phone-only bottom navigation, as on the original site: CATE · MY PAGE ·
 * HOME · WISH · RECENT, fixed to the bottom of the viewport on every storefront
 * page. Hidden while a sheet or dialog is open (they sit above it) and on the
 * admin screens, which have their own chrome.
 */
const TABS = [
  { label: "CATE", href: "/category/skin-care", icon: LayoutGrid },
  { label: "MY PAGE", href: "/account", icon: User },
  { label: "HOME", href: "/", icon: Home },
  { label: "WISH", href: "/account/wishlist", icon: Heart },
  { label: "RECENT", href: "/recent-view", icon: Clock },
];

export function MobileTabBar() {
  const pathname = usePathname();
  // The admin dashboard is desktop-only; never cover it.
  if (pathname.startsWith("/admin")) return null;

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ececec] bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-[58px] flex-col items-center justify-center gap-1 text-[11px] tracking-wide transition-colors ${
                  active ? "font-semibold text-point-600" : "text-[#333]"
                }`}
              >
                <tab.icon className="h-[22px] w-[22px]" aria-hidden />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
