"use client";

import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { TopBanner } from "@/components/layout/top-banner";
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

// Normalized to { label, href } so categories and pages can be mixed freely.
const categoryMenuItems = NAV_CATEGORIES.map((c) => ({
  label: c.name,
  href: `/category/${c.slug}`,
}));

const allCategoryItems = [...categoryMenuItems, ...navLinks];

const iconLinks = [
  { href: "/account/wishlist", label: "Wishlist", Icon: Heart },
  { href: "/account", label: "My Page", Icon: User },
  { href: "/cart", label: "Cart", Icon: ShoppingBag },
];

/** Storefront header with working menu popups and search overlay. */
export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [allCateOpen, setAllCateOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white">
      <TopBanner />

      {/* Utility bar */}
      <div className="border-b border-zinc-100 bg-zinc-50">
        <Container className="flex h-8 items-center justify-end gap-4 text-xs text-zinc-500">
          {utilityLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-zinc-900"
            >
              {link.label}
            </Link>
          ))}
        </Container>
      </div>

      {/* Main bar */}
      <Container className="flex h-16 items-center gap-4">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
          className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          type="button"
          aria-label="All categories"
          onMouseEnter={() => setAllCateOpen(true)}
          onClick={() => setAllCateOpen((v) => !v)}
          className="hidden items-center gap-1 rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:border-zinc-900 lg:inline-flex"
        >
          <Menu className="h-4 w-4" />
          Categories
        </button>

        <Link href="/" className="relative h-9 w-40 shrink-0">
          <Image
            src="/upload/goodymall1/en/main/logo_.png"
            alt={SITE.name}
            fill
            priority
            className="object-contain object-left"
          />
        </Link>

        <button
          type="button"
          aria-label="Search"
          onClick={() => setSearchOpen(true)}
          className="ml-auto rounded-full p-2 text-zinc-600 hover:bg-zinc-100"
        >
          <Search className="h-5 w-5" />
        </button>

        <div className="hidden items-center gap-1 sm:flex">
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

      {/* Desktop nav */}
      <nav
        className="hidden border-t border-zinc-100 lg:block"
        aria-label="Primary"
      >
        <Container className="flex h-11 items-center gap-6">
          {NAV_CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="whitespace-nowrap text-sm font-semibold text-zinc-800 hover:text-zinc-950"
            >
              {category.name}
            </Link>
          ))}
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm font-medium text-zinc-600 hover:text-zinc-950"
            >
              {link.label}
            </Link>
          ))}
        </Container>
      </nav>

      {/* All-categories popup */}
      {allCateOpen && (
        <div
          className="absolute inset-x-0 top-full hidden border-t border-zinc-100 bg-white shadow-md lg:block"
          onMouseLeave={() => setAllCateOpen(false)}
        >
          <Container className="grid grid-cols-2 gap-x-8 gap-y-2 py-6 md:grid-cols-4">
            <div className="col-span-full mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Shopping Category
            </div>
            {allCategoryItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setAllCateOpen(false)}
                className="py-1 text-sm text-zinc-700 hover:text-zinc-950"
              >
                {item.label}
              </Link>
            ))}
          </Container>
        </div>
      )}

      {/* Mobile menu drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <span className="font-bold">{SITE.name}</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="rounded-full p-1.5 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Shop
              </p>
              {[...categoryMenuItems, ...navLinks].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-2 text-sm text-zinc-800 hover:text-zinc-950"
                >
                  {item.label}
                </Link>
              ))}
              <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                My Page
              </p>
              {utilityLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-2 text-sm text-zinc-600 hover:text-zinc-950"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Search overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
            <Search className="h-5 w-5 text-zinc-400" />
            <form action="/search" method="get" className="flex-1">
              <input
                autoFocus
                type="search"
                name="q"
                placeholder="Search products, brands…"
                className="w-full bg-transparent text-sm outline-none"
              />
            </form>
            <button
              type="button"
              aria-label="Close search"
              onClick={() => setSearchOpen(false)}
              className="rounded-full p-1.5 hover:bg-zinc-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Recommended searches
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "Croissant",
                "Vitamin Serum",
                "Sunscreen",
                "Collagen",
                "Lip Tint",
              ].map((term) => (
                <a
                  key={term}
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:border-zinc-900"
                >
                  {term}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
