"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TopBanner } from "@/components/layout/top-banner";
import { getSubcategorySlugByName } from "@/data/subcategories";
import { authClient } from "@/lib/auth-client";

/**
 * Header (Tailwind-native). Faithful port of the original Cafe24 header,
 * with the menu/search interactions driven by React state.
 */

const categoryNav = [
  {
    label: "Skin Care",
    href: "/category/skin-care",
    children: [
      "Masks & Patches",
      "Facial Care",
      "Cleansing",
      "Sun Care",
      "Set",
    ],
  },
  {
    label: "Makeup",
    href: "/category/makeup",
    children: ["Base Makeup", "Eye Makeup", "Lip Makeup"],
  },
  {
    label: "Hair Care",
    href: "/category/hair-care",
    children: ["Hair Care"],
  },
  {
    label: "PRE-ORDER",
    href: "/category/pre-order",
    children: [
      "Masks & Patches",
      "Facial Care",
      "Cleansing",
      "Sun Care",
      "Hair Care",
      "Base Makeup",
      "Eye Makeup",
      "Lip Makeup",
    ],
  },
  { label: "BRAND", href: "/brands", children: [] },
  { label: "REVIEW", href: "/review", children: [] },
  { label: "EVENT", href: "/event", children: [] },
  { label: "STORES", href: "/stores", children: [] },
  { label: "AMBASSADOR", href: "/ambassador", children: [] },
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

const loggedInLinks = [
  { label: "My page", href: "/account" },
  { label: "Order", href: "/account/orders" },
  { label: "Wish", href: "/account/wishlist" },
  { label: "Mileage", href: "/account/mileage" },
  { label: "Coupon", href: "/account/coupons" },
  { label: "Logout", href: "/api/auth/sign-out", className: "log" },
];

export function Header() {
  const router = useRouter();
  const [allCateOpen, setAllCateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openCate, setOpenCate] = useState<string | null>(null);
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  // While the session is still loading, don't flash the logged-out dropdown —
  // show no menu until we know the real auth state.
  const links = user ? loggedInLinks : isPending ? null : logStateLinks;

  return (
    <div>
      <TopBanner />

      <div className="relative z-[99] w-full bg-white shadow-[2px_2px_5px_rgba(0,0,0,0.1)]">
        <div className="mx-auto flex min-h-20 w-[96%] max-w-[1560px] flex-wrap items-center justify-between max-md:min-h-0 max-md:px-[7px]">
          {/* Logo (row 1, left) */}
          <h1 className="relative order-1 pl-[18px] pr-10 max-md:flex max-md:max-w-[160px] max-md:items-center max-md:p-0">
            <Link href="/">
              <Image
                src="/upload/goodymall1/en/main/logo_.png"
                alt="OUR:NARA"
                width={2483}
                height={392}
                loading="eager"
                className="h-auto w-auto max-h-8 max-w-[170px] max-md:max-h-[30px] max-md:max-w-[160px]"
              />
            </Link>
          </h1>

          {/* Top category menu. Desktop: middle row (flex-1). Mobile: full-width
              second row that scrolls horizontally (like the original). */}
          <div className="flex flex-1 min-w-0 order-2 items-center justify-center max-md:order-3 max-md:h-9 max-md:w-full max-md:justify-start max-md:basis-full">
            <div className="flex w-full min-w-0 items-center max-md:w-full max-md:min-w-0">
              {/* All categories button (desktop-only) */}
              <div className="relative h-20 w-[50px] shrink-0 max-md:hidden">
                <button
                  type="button"
                  aria-label="All categories"
                  onClick={() => setAllCateOpen((v) => !v)}
                  className="relative top-1/2 block h-10 w-full -translate-y-1/2 cursor-pointer"
                >
                  <span
                    className={`absolute left-0 ml-3 block h-0.5 w-[18px] bg-[#222] transition-all duration-300 ${
                      allCateOpen ? "top-[19px] -rotate-45" : "top-[14px]"
                    }`}
                  />
                  <span
                    className={`absolute left-0 top-[19px] ml-3 block h-0.5 w-[18px] bg-[#222] transition-all duration-300 ${
                      allCateOpen ? "opacity-0" : ""
                    }`}
                  />
                  <span
                    className={`absolute left-0 ml-3 block h-0.5 w-[18px] bg-[#222] transition-all duration-300 ${
                      allCateOpen ? "top-[19px] rotate-45" : "top-[24px]"
                    }`}
                  />
                </button>
              </div>

              {/* All-categories panel (desktop-only) */}
              {allCateOpen && (
                <div className="absolute left-0 right-0 top-16 z-40 mx-auto w-full bg-white shadow-[2px_2px_5px_rgba(0,0,0,0.1)] max-md:hidden">
                  <div className="mx-auto box-border w-[96%] max-w-[1440px] px-2.5 py-[30px]">
                    <div className="flex">
                      <div className="w-[70%]">
                        <ul className="flex flex-wrap">
                          {categoryNav.map((item) => (
                            <li
                              key={item.href}
                              className="group mb-[30px] w-1/5 align-top"
                            >
                              <Link
                                href={item.href}
                                className="mx-2.5 block pb-2.5 text-base font-semibold leading-[22px] text-[#222] transition-all duration-500 group-hover:pl-[5px]"
                              >
                                {item.label}
                              </Link>
                              {item.children.length > 0 && (
                                <ul className="relative left-0 mx-2.5 transition-all duration-500 group-hover:left-[10px]">
                                  {item.children.map((child) => (
                                    <li key={child}>
                                      <Link
                                        href={item.href}
                                        className="block text-sm font-light leading-[25px] text-[#777] transition-all duration-300 group-hover:text-black hover:pl-[5px]"
                                      >
                                        {child}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex w-[30%] border-l border-[#ddd] pl-[2%] text-left">
                        <div className="group w-1/2">
                          <Link
                            href="/community"
                            className="mx-2.5 block pb-2.5 text-base font-semibold leading-[22px] text-[#222] transition-all duration-500 group-hover:pl-[5px]"
                          >
                            COMMUNITY
                          </Link>
                          <ul className="relative left-0 mx-2.5 transition-all duration-500 group-hover:left-[10px]">
                            {communityLinks.map((link) => (
                              <li key={link.href}>
                                <Link
                                  href={link.href}
                                  className="block text-sm font-normal leading-[25px] text-[#777] transition-all duration-300 group-hover:text-black hover:pl-[5px]"
                                >
                                  {link.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="group w-1/2">
                          <Link
                            href="/account"
                            className="mx-2.5 block pb-2.5 text-base font-semibold leading-[22px] text-[#222] transition-all duration-500 group-hover:pl-[5px]"
                          >
                            MY PAGE
                          </Link>
                          <ul className="relative left-0 mx-2.5 transition-all duration-500 group-hover:left-[10px]">
                            {myPageLinks.map((link) => (
                              <li key={link.href}>
                                <Link
                                  href={link.href}
                                  className="block text-sm font-normal leading-[25px] text-[#777] transition-all duration-300 group-hover:text-black hover:pl-[5px]"
                                >
                                  {link.label}
                                </Link>
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
              <div className="relative mr-2.5 flex h-20 w-[calc(100%-60px)] items-center max-md:mr-0 max-md:h-9 max-md:w-full max-md:min-w-0">
                <div className="relative z-[39] max-md:w-full max-md:min-w-0">
                  <ul className="flex items-center overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-x-clip max-md:h-9 max-md:w-full max-md:overflow-y-hidden">
                    {categoryNav.map((item, index) => (
                      <li
                        key={item.href}
                        className={
                          item.label === "AMBASSADOR"
                            ? "relative grid place-items-center"
                            : "group relative inline-block leading-20 max-md:leading-9"
                        }
                      >
                        <Link
                          href={item.href}
                          className={
                            item.label === "AMBASSADOR"
                              ? "flex h-7 items-center gap-1 rounded-[30px_30px_30px_0] bg-point-500 pl-2.5 pr-1.25 text-white max-md:mx-1.5"
                              : "relative mx-3 pb-1 text-base font-semibold leading-[22px] text-ink transition-colors duration-500 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-point-500 after:transition-all after:duration-500 hover:text-point-500 hover:after:w-full max-md:mx-1.5 max-md:pb-0 max-md:text-[15px] max-md:leading-9"
                          }
                        >
                          {item.label}
                          {item.label === "AMBASSADOR" && (
                            <Image
                              src="/upload/goodymall1/icon/right_extra_bold.svg"
                              alt="arrow"
                              width={20}
                              height={20}
                              unoptimized
                              className="w-5 brightness-0 invert"
                            />
                          )}
                        </Link>
                        {item.children && item.children.length > 0 && (
                          <ul
                            className={`invisible absolute top-[110%] z-20 w-[140px] rounded-md border border-[#e9e9e9] bg-white p-2.5 text-left opacity-0 shadow-[1px_1px_10px_rgba(0,0,0,0.1)] transition-all duration-500 group-hover:visible group-hover:top-[calc(100%-10px)] group-hover:opacity-100 max-lg:hidden ${
                              index === 0
                                ? "left-0"
                                : "left-1/2 -translate-x-1/2"
                            }`}
                          >
                            {item.children.map((child) => {
                              const subSlug = getSubcategorySlugByName(
                                item.href.split("/").pop() ?? "",
                                child,
                              );
                              const childHref = subSlug
                                ? `${item.href}?sub=${subSlug}`
                                : item.href;
                              return (
                                <li key={child}>
                                  <Link
                                    href={childHref}
                                    className="block px-2 py-0.5 text-[13px] leading-5 text-[#787878] transition-all duration-300 hover:pl-[13px] hover:text-ink"
                                  >
                                    {child}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right icons + search */}
          <div className="order-3 grid place-items-center max-md:order-2 max-md:h-[50px]">
            <div className="relative flex items-center">
              {/* User / log state (desktop-only; drawer covers mobile) */}
              <ul className="inline-flex">
                <li className="group relative min-w-6 px-1 max-md:hidden">
                  <div>
                    <Link href="/account">
                      <Image
                        src="/upload/goodymall1/icon/user.svg"
                        alt="my page"
                        width={32}
                        height={32}
                        unoptimized
                        className="w-8"
                      />
                    </Link>
                  </div>
                  {!user && (
                    <div className="absolute -top-5 left-1/2 z-[99] h-5 -translate-x-1/2 text-center shadow-[1px_1px_10px_rgba(0,0,0,0.1)] animate-[motion_0.6s_linear_0s_infinite_alternate]">
                      <div className="flex h-5 w-[60px] items-center justify-center rounded bg-point-500">
                        <Link
                          href="/join"
                          className="text-[11px] leading-5 text-white"
                        >
                          +3,000P
                        </Link>
                      </div>
                    </div>
                  )}
                  {links && (
                    <ul className="invisible absolute left-1/2 top-[70px] z-40 w-[120px] -translate-x-1/2 rounded-md border border-[#e9e9e9] bg-white p-2.5 text-left opacity-0 shadow-[1px_1px_10px_rgba(0,0,0,0.1)] transition-all duration-500 group-hover:visible group-hover:top-[45px] group-hover:opacity-100">
                      {links.map((link) => (
                        <li key={link.label}>
                          {link.label === "Logout" ? (
                            <button
                              type="button"
                              onClick={async () => {
                                await authClient.signOut();
                                router.push("/");
                                router.refresh();
                              }}
                              className="block w-full truncate pl-2 pt-0.5 text-left text-[13px] leading-5 text-[#787878] hover:pl-[13px] hover:pr-2 hover:text-black"
                            >
                              {link.label}
                            </button>
                          ) : (
                            <Link
                              href={link.href}
                              className="block truncate pl-2 pt-0.5 text-[13px] leading-5 text-[#787878] hover:pl-[13px] hover:pr-2 hover:text-black"
                            >
                              {link.label}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
                {/* Basket */}
                <li className="relative min-w-6 px-1">
                  <Link
                    href="/cart"
                    className="block text-center text-[13px] font-medium text-[#555]"
                  >
                    <span className="absolute -right-0.5 top-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-point-500 text-[12px] font-semibold text-white">
                      0
                    </span>
                    <div>
                      <Image
                        src="/upload/goodymall1/icon/basket.svg"
                        alt="basket"
                        width={32}
                        height={32}
                        unoptimized
                        className="w-8 max-md:w-7"
                      />
                    </div>
                  </Link>
                </li>
              </ul>

              {/* Search */}
              <div className="relative min-w-6 cursor-pointer pl-1">
                <button
                  type="button"
                  aria-label="Search"
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center justify-center"
                >
                  <Image
                    src="/upload/goodymall1/icon/search.svg"
                    alt="search"
                    width={32}
                    height={32}
                    unoptimized
                    className="mx-auto block w-8 max-md:w-7"
                  />
                </button>
              </div>

              {/* Hamburger (mobile-only, inline in the header like the original) */}
              <div className="relative ml-1 hidden h-8 w-8 max-md:block">
                <button
                  type="button"
                  aria-label="Open menu"
                  onClick={() => setMobileOpen(true)}
                  className="block h-full w-full cursor-pointer"
                >
                  <Image
                    src="/upload/goodymall1/icon/option.svg"
                    alt="menu"
                    width={28}
                    height={28}
                    unoptimized
                    className="h-7 w-7"
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
                            <Link
                              href={`/search?q=${encodeURIComponent(term)}`}
                              className="text-sm text-[#555] hover:text-black"
                            >
                              {term}
                            </Link>
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

        {/* Mobile drawer — matches the original #aside (right-side slide-out) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/40"
            />
            <aside className="absolute inset-y-0 right-0 h-full w-full min-w-[225px] max-w-[340px] overflow-y-auto bg-white shadow-xl">
              <div className="relative bg-white px-4 pb-4 pt-10 shadow-[2px_2px_5px_rgba(0,0,0,0.1)]">
                {/* Logo + login/join */}
                <div className="flex items-center gap-5">
                  <Image
                    src="/upload/goodymall1/en/main/logo_.png"
                    alt="OUR:NARA"
                    width={2483}
                    height={392}
                    className="h-auto w-auto max-w-[120px]"
                  />
                  <div className="flex items-center gap-4 text-sm font-normal text-[#222]">
                    <Link href="/login" className="hover:text-black">
                      Login
                    </Link>
                    <span className="h-[11px] w-px bg-[#ddd]" />
                    <Link href="/join" className="hover:text-black">
                      Join
                    </Link>
                  </div>
                </div>
                {/* Account quick links */}
                <div className="mt-6 flex w-4/5 flex-wrap gap-x-4 gap-y-2 text-[13px]">
                  <span>
                    <Link
                      href="/account"
                      className="text-[#555] hover:text-black"
                    >
                      My page
                    </Link>
                  </span>
                  <span>
                    <Link
                      href="/account/orders"
                      className="text-[#555] hover:text-black"
                    >
                      Order
                    </Link>
                  </span>
                  <span>
                    <Link href="/cart" className="text-[#555] hover:text-black">
                      Cart
                    </Link>
                  </span>
                  <span>
                    <Link
                      href="/account/wishlist"
                      className="text-[#555] hover:text-black"
                    >
                      Wish (0)
                    </Link>
                  </span>
                  <span>
                    <Link
                      href="/account"
                      className="text-[#555] hover:text-black"
                    >
                      Recent (0)
                    </Link>
                  </span>
                  <span>
                    <Link
                      href="/coupons"
                      className="text-[#555] hover:text-black"
                    >
                      Couponzone
                    </Link>
                  </span>
                </div>
              </div>

              <div className="my-5 px-4 md:my-10">
                <div className="px-4">
                  {/* Categories — accordion, matching the original #aside */}
                  <ul className="text-[13px] font-normal">
                    {categoryNav
                      .filter((item) => item.label !== "AMBASSADOR")
                      .map((item) => {
                        const hasChildren = item.children.length > 0;
                        const open = openCate === item.href;
                        return (
                          <li key={item.href} className="relative">
                            <div className="relative">
                              <Link
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className="block py-2.5 pl-2.5 pr-10 text-[17px] font-semibold leading-[18px] tracking-[0.5px] text-[#222]"
                              >
                                {item.label}
                              </Link>
                              {hasChildren && (
                                <button
                                  type="button"
                                  aria-label="View subcategories"
                                  onClick={() =>
                                    setOpenCate(open ? null : item.href)
                                  }
                                  className="absolute right-0 top-0 flex h-10 w-10 cursor-pointer items-center justify-center"
                                >
                                  <Image
                                    src="/upload/goodymall1/en/layout/bg_snb_1depth_on.gif"
                                    alt=""
                                    width={30}
                                    height={18}
                                    unoptimized
                                    className={`h-[18px] w-[30px] transition-transform duration-300 ${
                                      open ? "rotate-180" : ""
                                    }`}
                                  />
                                </button>
                              )}
                            </div>
                            {hasChildren && open && (
                              <ul className="pb-1.5">
                                {item.children.map((child) => {
                                  const subSlug = getSubcategorySlugByName(
                                    item.href.split("/").pop() ?? "",
                                    child,
                                  );
                                  const childHref = subSlug
                                    ? `${item.href}?sub=${subSlug}`
                                    : item.href;
                                  return (
                                    <li key={child}>
                                      <Link
                                        href={childHref}
                                        onClick={() => setMobileOpen(false)}
                                        className="block py-[7px] pl-5 pr-5 text-sm font-normal text-[#555]"
                                      >
                                        {child}
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                </div>
              </div>

              {/* Close */}
              <button
                type="button"
                aria-label="Close"
                onClick={() => setMobileOpen(false)}
                className="absolute right-0 top-0 p-2.5 text-lg text-[#555]"
              >
                ✕
              </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
