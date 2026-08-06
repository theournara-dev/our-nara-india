"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- faithful port uses <a> */

import { useState } from "react";
import { TopBanner } from "@/components/layout/top-banner";

/**
 * Header (Tailwind-native). Faithful port of the original Cafe24 header,
 * with the menu/search interactions driven by React state.
 */

const categoryNav = [
  { label: "Skin Care", href: "/category/skin-care" },
  { label: "Makeup", href: "/category/makeup" },
  { label: "Hair Care", href: "/category/hair-care" },
  { label: "PRE-ORDER", href: "/category/pre-order" },
  { label: "BRAND", href: "/brands" },
  { label: "REVIEW", href: "/review" },
  { label: "EVENT", href: "/event" },
  { label: "STORES", href: "/stores" },
  { label: "AMBASSADOR", href: "/ambassador" },
];

const communityLinks = [
  { label: "Notice", href: "/community/notice" },
  { label: "Product Q&A", href: "/community/qa" },
  { label: "FAQ", href: "/community/faq" },
];

const myPageLinks = [
  { label: "Order", href: "/account/orders" },
  { label: "Recent", href: "/account" },
  { label: "Wish", href: "/account/wishlist" },
  { label: "Mileage", href: "/account/mileage" },
  { label: "Coupon", href: "/account/coupons" },
];

const logStateLinks = [
  { label: "Login", href: "/login", className: "log" },
  { label: "Join", href: "/join" },
  { label: "Order", href: "/account/orders" },
  { label: "My page", href: "/account" },
  { label: "Couponzone", href: "/coupons", className: "couponzoneBanner" },
];

export function Header() {
  const [allCateOpen, setAllCateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div>
      <TopBanner />

      <div className="relative z-[99] w-full bg-white shadow-[2px_2px_5px_rgba(0,0,0,0.1)]">
        <div className="mx-auto flex min-h-20 w-[96%] max-w-[1560px] items-center justify-between">
          {/* Logo */}
          <h1 className="relative px-[18px]">
            <a href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/upload/goodymall1/en/main/logo_.png"
                alt="OUR:NARA"
                className="max-h-8 max-w-[170px]"
              />
            </a>
          </h1>

          {/* Top category menu */}
          <div className="flex flex-1 justify-center">
            <div className="flex items-center">
              {/* All categories button */}
              <div className="relative h-20 w-[50px] shrink-0">
                <button
                  type="button"
                  aria-label="All categories"
                  onClick={() => setAllCateOpen((v) => !v)}
                  className="relative top-1/2 block h-10 w-full -translate-y-1/2 cursor-pointer"
                >
                  <span className="absolute left-0 top-[14px] ml-3 block h-0.5 w-[18px] bg-[#222]" />
                  <span className="absolute left-0 top-[19px] ml-3 block h-0.5 w-[18px] bg-[#222]" />
                  <span className="absolute left-0 top-[24px] ml-3 block h-0.5 w-[18px] bg-[#222]" />
                </button>
              </div>

              {/* All-categories panel */}
              {allCateOpen && (
                <div className="absolute left-0 right-0 top-16 z-40 mx-auto w-full bg-white shadow-[2px_2px_5px_rgba(0,0,0,0.1)]">
                  <div className="mx-auto box-border w-[96%] max-w-[1440px] px-2.5 py-[30px]">
                    <div className="flex">
                      <div className="w-[70%]">
                        <ul className="flex flex-wrap">
                          {categoryNav.map((item) => (
                            <li key={item.href} className="w-1/5 py-1.5">
                              <a
                                href={item.href}
                                className="text-sm text-[#555] hover:text-black"
                              >
                                {item.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex w-[30%] border-l border-[#ddd] pl-[2%] text-left">
                        <div className="w-1/2">
                          <a
                            href="/community"
                            className="mx-2.5 mb-2.5 block text-base font-semibold leading-[22px] text-[#222]"
                          >
                            COMMUNITY
                          </a>
                          <ul>
                            {communityLinks.map((link) => (
                              <li key={link.href}>
                                <a
                                  href={link.href}
                                  className="block px-2.5 py-1 text-sm text-[#555] hover:text-black"
                                >
                                  {link.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="w-1/2">
                          <a
                            href="/account"
                            className="mx-2.5 mb-2.5 block text-base font-semibold leading-[22px] text-[#222]"
                          >
                            MY PAGE
                          </a>
                          <ul>
                            {myPageLinks.map((link) => (
                              <li key={link.href}>
                                <a
                                  href={link.href}
                                  className="block px-2.5 py-1 text-sm text-[#555] hover:text-black"
                                >
                                  {link.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Category nav */}
              <div className="relative mr-2.5 flex h-20 w-[calc(100%-60px)] items-center justify-center">
                <div className="relative z-[39]">
                  <ul className="flex items-center">
                    {categoryNav.map((item) => (
                      <li
                        key={item.href}
                        className={
                          item.label === "AMBASSADOR"
                            ? "relative grid place-items-center"
                            : "relative flex items-center"
                        }
                      >
                        <a
                          href={item.href}
                          className={
                            item.label === "AMBASSADOR"
                              ? "flex h-7 items-center gap-1 rounded-[30px_30px_30px_0] bg-point-500 px-2.5 text-white"
                              : "mx-3 pb-1 text-base font-semibold tracking-[-0.1px] text-ink"
                          }
                        >
                          {item.label}
                          {item.label === "AMBASSADOR" && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src="/upload/goodymall1/icon/right_extra_bold.svg"
                              alt="arrow"
                              className="w-5 brightness-0 invert"
                            />
                          )}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right icons + search */}
          <div className="grid place-items-center">
            <div className="relative flex items-center">
              {/* User / log state */}
              <ul className="inline-flex">
                <li className="group relative min-w-6 px-1">
                  <div>
                    <a href="/account">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/upload/goodymall1/icon/user.svg"
                        alt="my page"
                        className="w-8"
                      />
                    </a>
                  </div>
                  <div className="absolute -top-5 left-1/2 z-[99] h-5 -translate-x-1/2 text-center shadow-[1px_1px_10px_rgba(0,0,0,0.1)]">
                    <div className="h-5 w-[60px] rounded bg-point-500">
                      <a
                        href="/join"
                        className="text-[11px] leading-5 text-white"
                      >
                        +3,000P
                      </a>
                    </div>
                  </div>
                  <ul className="invisible absolute left-1/2 top-[70px] z-40 w-[120px] -translate-x-1/2 rounded-md border border-[#e9e9e9] bg-white p-2.5 text-left opacity-0 shadow-[1px_1px_10px_rgba(0,0,0,0.1)] transition-all duration-500 group-hover:visible group-hover:top-[45px] group-hover:opacity-100">
                    {logStateLinks.map((link) => (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          className="block truncate px-2 pt-0.5 text-[13px] leading-5 text-[#787878] hover:px-3.5 hover:text-black"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
                {/* Basket */}
                <li className="relative min-w-6 px-1">
                  <a
                    href="/cart"
                    className="block text-center text-[13px] font-medium text-[#555]"
                  >
                    <span className="absolute -right-0.5 top-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-point-500 text-[12px] font-semibold text-white">
                      0
                    </span>
                    <div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/upload/goodymall1/icon/basket.svg"
                        alt="basket"
                        className="w-8"
                      />
                    </div>
                  </a>
                </li>
              </ul>

              {/* Search */}
              <div className="relative min-w-6 cursor-pointer pl-1">
                <button
                  type="button"
                  aria-label="Search"
                  onClick={() => setSearchOpen(true)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/upload/goodymall1/icon/search.svg"
                    alt="search"
                    className="mx-auto block w-8"
                  />
                </button>
              </div>

              {/* Search overlay */}
              {searchOpen && (
                <div className="absolute right-[-10%] top-[46px] z-[99] box-border w-[92vw] max-w-[380px] overflow-visible border border-[#e9e9e9] bg-white shadow-[1px_1px_10px_rgba(0,0,0,0.1)]">
                  <form
                    action="/search"
                    method="get"
                    className="border-b border-[#e9e9e9]"
                  >
                    <fieldset className="flex items-center gap-2 px-4 py-3">
                      <legend className="sr-only">Search</legend>
                      <input
                        name="q"
                        type="text"
                        autoFocus
                        placeholder="검색어를 입력해주세요"
                        className="h-9 flex-1 bg-transparent text-sm outline-none"
                      />
                      <button
                        type="button"
                        aria-label="Close search"
                        onClick={() => setSearchOpen(false)}
                        className="text-sm text-[#555]"
                      >
                        ✕
                      </button>
                    </fieldset>
                  </form>
                  <div className="mx-auto box-border max-w-[700px] px-4 py-2.5">
                    <div className="w-full py-2.5">
                      <div className="mb-2 text-xs font-semibold text-[#999]">
                        recommended search
                      </div>
                      <ul className="flex flex-wrap gap-2">
                        {[
                          "Plain Croissant",
                          "Vitamin Serum",
                          "Sunscreen",
                          "Collagen",
                          "Lip Tint",
                        ].map((term) => (
                          <li key={term}>
                            <a
                              href={`/search?q=${encodeURIComponent(term)}`}
                              className="text-sm text-[#555] hover:text-black"
                            >
                              {term}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile toggle (mobile-only floating button) */}
        <button
          type="button"
          className="fixed bottom-4 right-4 z-50 hidden h-12 w-12 items-center justify-center rounded-full bg-point-500 text-xl text-white max-md:inline-flex"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
        >
          ☰
        </button>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/40"
            />
            <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
              <button
                type="button"
                aria-label="Close"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-3 text-lg text-[#555]"
              >
                ✕
              </button>
              <nav className="h-full overflow-y-auto p-5 pt-12">
                <p className="mb-2 text-xs font-semibold text-[#999]">
                  CATEGORY
                </p>
                {categoryNav.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 text-sm text-[#555] hover:text-black"
                  >
                    {item.label}
                  </a>
                ))}
                <p className="mb-2 mt-6 text-xs font-semibold text-[#999]">
                  MY PAGE
                </p>
                {myPageLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 text-sm text-[#555] hover:text-black"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
