"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";
import { TopBanner } from "@/components/layout/top-banner";
import { VersionSwitcher } from "@/components/layout/version-switcher";
import type { NavCategory } from "@/data/categories";
import { authClient } from "@/lib/auth-client";
import { useCart } from "@/lib/cart";
import { useSiteVersion } from "@/components/site-version-provider";
import { notify } from "@/lib/toast";
import type { SiteContent } from "@/lib/site-content";

/**
 * Header (Tailwind-native). Faithful port of the original Cafe24 header,
 * with the menu/search interactions driven by React state.
 */

interface NavItem {
  label: string;
  href: string;
  children: { slug: string; name: string }[];
}

/** Storefront pages that sit after the category menu, unchanged per request. */
const staticNavItems: NavItem[] = [
  { label: "BRAND", href: "/brands", children: [] },
  { label: "REVIEW", href: "/review", children: [] },
  { label: "EVENT", href: "/event", children: [] },
  { label: "STORES", href: "/stores", children: [] },
  { label: "B2B", href: "/b2b", children: [] },
  { label: "AMBASSADOR", href: "/ambassador", children: [] },
];

/**
 * The category menu is the admin's category tree: roots in their own order,
 * each linking to its listing and listing its mid-level categories in the
 * dropdown (as ?sub= filters, exactly what the old hardcoded menu produced).
 */
function buildNav(navCategories: NavCategory[]): NavItem[] {
  return [
    ...navCategories.map((category) => ({
      label: category.name,
      href: `/category/${category.slug}`,
      children: category.children,
    })),
    ...staticNavItems,
  ];
}

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

export function Header({
  siteContent,
  navCategories = [],
}: {
  siteContent: SiteContent;
  /** The admin's category tree; the menu follows it without a deploy. */
  navCategories?: NavCategory[];
}) {
  const router = useRouter();
  const { config } = useSiteVersion();
  const [allCateOpen, setAllCateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // On compact headers (phones and tablets) the search panel is pinned under
  // the whole header instead of hanging off the icons cluster, which would put
  // it half off-screen. Measured on open, like the store panel does.
  const [searchPanelTop, setSearchPanelTop] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openCate, setOpenCate] = useState<string | null>(null);

  // Escape closes the header's overlays (mobile drawer, search, all-categories),
  // like any other menu.
  useEffect(() => {
    if (!mobileOpen && !searchOpen && !allCateOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setMobileOpen(false);
      setSearchOpen(false);
      setAllCateOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, searchOpen, allCateOpen]);

  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const cartCount = useCart().reduce((sum, item) => sum + item.qty, 0);
  // In global mode pre-orders are disabled, so drop PRE-ORDER from the nav
  // (everywhere it's listed: top bar, all-categories panel and mobile drawer).
  const navItems = useMemo(() => {
    const all = buildNav(navCategories);
    return config.preOrderEnabled
      ? all
      : all.filter((item) => item.label !== "PRE-ORDER");
  }, [navCategories, config.preOrderEnabled]);
  // While the session is still loading, don't flash the logged-out dropdown —
  // show no menu until we know the real auth state.
  const links = user
    ? user.role === "admin"
      ? [{ label: "Dashboard", href: "/admin" }, ...loggedInLinks]
      : loggedInLinks
    : isPending
      ? null
      : logStateLinks;

  // ── Category nav strip: horizontal scrolling with edge arrows ─────────────
  // Below 1200px the strip is a native scroller (it already was). From 1200px
  // up it is clipped so the hover submenus can escape it, and the arrows shift
  // the strip with a transform instead. Either way the arrows only show while
  // there is content to reach in that direction — tablets used to clip the
  // rightmost items (B2B, AMBASSADOR) with no way to reach them.
  const navViewportRef = useRef<HTMLDivElement>(null);
  const navListRef = useRef<HTMLUListElement>(null);
  const [navShift, setNavShift] = useState(0);
  const [navEdges, setNavEdges] = useState({ left: false, right: false });

  const navMaxShift = useCallback(() => {
    const list = navListRef.current;
    const viewport = navViewportRef.current;
    const last = list?.lastElementChild as HTMLElement | null;
    if (!list || !viewport || !last) return 0;
    return Math.max(
      0,
      last.offsetLeft + last.offsetWidth - viewport.clientWidth,
    );
  }, []);

  useEffect(() => {
    const list = navListRef.current;
    const viewport = navViewportRef.current;
    if (!list || !viewport) return;
    const isDesktop = () => window.matchMedia("(min-width: 1200px)").matches;
    const compute = () => {
      if (!isDesktop()) {
        // Leaving the desktop layout hands the strip back to the native
        // scroller.
        if (navShift !== 0) setNavShift(0);
        const max = navMaxShift();
        setNavEdges({
          left: list.scrollLeft > 2,
          right: list.scrollLeft < max - 2,
        });
        return;
      }
      const max = navMaxShift();
      if (navShift > max) {
        // The window grew (or the menu shrank): pull the strip back in.
        setNavShift(max);
        return;
      }
      setNavEdges({ left: navShift > 2, right: navShift < max - 2 });
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(list);
    observer.observe(viewport);
    list.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      observer.disconnect();
      list.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [navShift, navItems, navMaxShift]);

  function scrollNav(dir: -1 | 1) {
    const list = navListRef.current;
    const viewport = navViewportRef.current;
    if (!list || !viewport) return;
    const step = Math.round(viewport.clientWidth * 0.7);
    if (window.matchMedia("(min-width: 1200px)").matches) {
      const max = navMaxShift();
      setNavShift((cur) => Math.min(Math.max(cur + dir * step, 0), max));
      return;
    }
    list.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  /** Trackpads: a clear sideways swipe nudges the strip like the arrows do. */
  function onNavWheel(e: React.WheelEvent) {
    if (!window.matchMedia("(min-width: 1200px)").matches) return;
    if (Math.abs(e.deltaX) < 4 || Math.abs(e.deltaX) < Math.abs(e.deltaY))
      return;
    const max = navMaxShift();
    setNavShift((cur) => Math.min(Math.max(cur + e.deltaX, 0), max));
  }

  return (
    <div>
      <TopBanner blocks={siteContent.topBanner} />

      <div
        data-site-header
        className="relative z-[99] w-full bg-white shadow-[2px_2px_5px_rgba(0,0,0,0.1)]"
      >
        <div className="mx-auto flex min-h-20 w-[96%] max-w-[1560px] flex-wrap items-center justify-between max-[1200px]:min-h-0 max-[1200px]:px-[7px] max-md:pt-2">
          {/* Logo. Desktop/tablet: row 1, left. Phones: its own row, centred. */}
          <h1 className="relative order-1 pl-[18px] pr-10 max-[1200px]:flex max-[1200px]:w-[160px] max-[1200px]:shrink-0 max-[1200px]:items-center max-[1200px]:p-0 max-md:basis-full max-md:justify-center">
            <Link href="/">
              <Image
                src="/upload/goodymall1/en/main/logo_.png"
                alt="OUR:NARA"
                width={2483}
                height={392}
                loading="eager"
                className="h-auto w-auto max-h-8 max-w-[170px] max-[1200px]:max-h-none max-[1200px]:w-[160px] max-[1200px]:max-w-none"
              />
            </Link>
          </h1>

          {/* Top category menu. Desktop: middle row (flex-1). Mobile: full-width
              second row that scrolls horizontally (like the original). */}
          <div className="flex flex-1 min-w-0 order-2 items-center justify-center max-[1200px]:order-3 max-[1200px]:h-9 max-[1200px]:w-full max-[1200px]:justify-start max-[1200px]:basis-full">
            <div className="flex w-full min-w-0 items-center max-[1200px]:w-full max-[1200px]:min-w-0">
              {/* All categories button (desktop-only) */}
              <div className="relative h-20 w-[50px] shrink-0 max-[1200px]:hidden">
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
                <div className="absolute left-0 right-0 top-16 z-40 mx-auto w-full bg-white shadow-[2px_2px_5px_rgba(0,0,0,0.1)] max-[1200px]:hidden">
                  <div className="mx-auto box-border w-[96%] max-w-[1440px] px-2.5 py-[30px]">
                    <div className="flex">
                      <div className="w-[70%]">
                        <ul className="flex flex-wrap">
                          {navItems.map((item) => (
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
                                    <li key={child.slug}>
                                      <Link
                                        href={`${item.href}?sub=${child.slug}`}
                                        className="block text-sm font-light leading-[25px] text-[#777] transition-all duration-300 group-hover:text-black hover:pl-[5px]"
                                      >
                                        {child.name}
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
              <div className="relative mr-2.5 flex h-20 w-[calc(100%-60px)] min-w-0 items-center lg:mr-0 lg:w-[calc(100%-50px)] max-[1200px]:mr-0 max-[1200px]:h-9 max-[1200px]:w-full max-[1200px]:min-w-0">
                <div
                  ref={navViewportRef}
                  onWheel={onNavWheel}
                  className="relative z-[39] min-w-0 max-[1200px]:w-full max-[1200px]:min-w-0 min-[1200px]:overflow-x-clip"
                >
                  <ul
                    ref={navListRef}
                    style={
                      navShift > 0
                        ? { transform: `translateX(-${navShift}px)` }
                        : undefined
                    }
                    className="flex items-center overflow-x-auto whitespace-nowrap min-[1200px]:w-max min-[1200px]:overflow-x-visible min-[1200px]:transition-transform min-[1200px]:duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[1200px]:h-9 max-[1200px]:w-full max-[1200px]:gap-4 max-[1200px]:overflow-y-hidden"
                  >
                    {navItems.map((item, index) => (
                      <li
                        key={item.href}
                        data-nav-item
                        className={
                          item.label === "AMBASSADOR"
                            ? "relative grid shrink-0 place-items-center"
                            : "group relative inline-block leading-20 max-[1200px]:leading-9"
                        }
                      >
                        <Link
                          href={item.href}
                          className={
                            item.label === "AMBASSADOR"
                              ? "flex h-7 shrink-0 items-center gap-1 rounded-[30px_30px_30px_0] bg-point-500 pl-2.5 pr-1.25 text-base font-semibold whitespace-nowrap text-white max-[1200px]:ml-2.5 max-[1200px]:mr-6 max-[1200px]:text-[15px]"
                              : "relative mx-3 pb-1 text-base font-semibold leading-[22px] text-ink transition-colors duration-500 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-point-500 after:transition-all after:duration-500 hover:text-point-500 hover:after:w-full lg:mx-1 2xl:mx-2.5 max-[1200px]:mx-0 max-[1200px]:pb-0 max-[1200px]:text-[15px] max-[1200px]:leading-9"
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
                            {item.children.map((child) => (
                              <li key={child.slug}>
                                <Link
                                  href={`${item.href}?sub=${child.slug}`}
                                  className="block px-2 py-0.5 text-[13px] leading-5 text-[#787878] transition-all duration-300 hover:pl-[13px] hover:text-ink"
                                >
                                  {child.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>

                  {/* Fade + blur under each arrow so scrolled items dissolve
                      into the header instead of showing through it. */}
                  {navEdges.left && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-white via-white/80 to-transparent backdrop-blur-[2px]"
                    />
                  )}
                  {navEdges.right && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-white via-white/80 to-transparent backdrop-blur-[2px]"
                    />
                  )}

                  {/* Scroll arrows: shown only while the strip has more to
                      reach in that direction (any width). */}
                  {navEdges.left && (
                    <button
                      type="button"
                      aria-label="Scroll categories left"
                      onClick={() => scrollNav(-1)}
                      className="absolute left-0 top-1/2 z-[40] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#e9e9e9] bg-white text-[#222] shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-colors hover:bg-zinc-50 max-[1200px]:h-7 max-[1200px]:w-7"
                    >
                      <MdKeyboardArrowLeft size={20} />
                    </button>
                  )}
                  {navEdges.right && (
                    <button
                      type="button"
                      aria-label="Scroll categories right"
                      onClick={() => scrollNav(1)}
                      className="absolute right-0 top-1/2 z-[40] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#e9e9e9] bg-white text-[#222] shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-colors hover:bg-zinc-50 max-[1200px]:h-7 max-[1200px]:w-7"
                    >
                      <MdKeyboardArrowRight size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right icons + search. Phones: own row, flush right (the logo's
              full-basis row above pushes it there). */}
          <div className="order-3 grid shrink-0 place-items-center max-[1200px]:order-2 max-[1200px]:h-[50px] max-md:ml-auto">
            <div className="relative flex items-center">
              {/* User / log state (desktop-only; drawer covers mobile) */}
              <ul className="inline-flex items-center">
                {/* Store switcher (leftmost) */}
                <li className="relative flex items-center px-1 max-[1200px]:pl-0 max-[1200px]:pr-2">
                  <VersionSwitcher content={siteContent.switcher} />
                </li>
                <li className="group relative min-w-6 px-1 max-[1200px]:hidden">
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
                                const id = notify.loading("Signing out…");
                                try {
                                  await authClient.signOut();
                                  notify.success(
                                    id,
                                    "Signed out",
                                    "See you soon!",
                                  );
                                  router.push("/");
                                  router.refresh();
                                } catch {
                                  notify.error(
                                    id,
                                    "Sign out failed",
                                    "Please try again.",
                                  );
                                }
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
                <li className="relative flex items-center min-w-6 px-1 max-[1200px]:px-0">
                  <Link
                    href="/cart"
                    className="block text-center text-[13px] font-medium text-[#555]"
                  >
                    {cartCount > 0 && (
                      <span className="absolute -right-0.5 top-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-point-500 text-[12px] font-semibold text-white">
                        {cartCount}
                      </span>
                    )}
                    <div>
                      <Image
                        src="/upload/goodymall1/icon/basket.svg"
                        alt="basket"
                        width={32}
                        height={32}
                        unoptimized
                        className="w-8"
                      />
                    </div>
                  </Link>
                </li>
              </ul>

              {/* Search */}
              <div className="relative min-w-6 cursor-pointer pl-1 max-[1200px]:pl-2">
                <button
                  type="button"
                  aria-label="Search"
                  onClick={() => {
                    if (window.innerWidth < 1200) {
                      const header =
                        document.querySelector<HTMLElement>(
                          "[data-site-header]",
                        );
                      setSearchPanelTop(
                        header
                          ? Math.round(
                              header.getBoundingClientRect().bottom + 6,
                            )
                          : null,
                      );
                    } else {
                      setSearchPanelTop(null);
                    }
                    setSearchOpen(true);
                  }}
                  className="flex items-center justify-center"
                >
                  <Image
                    src="/upload/goodymall1/icon/search.svg"
                    alt="search"
                    width={32}
                    height={32}
                    unoptimized
                    className="mx-auto block w-8"
                  />
                </button>
              </div>

              {/* Hamburger (mobile-only, inline in the header like the original) */}
              <div className="relative ml-1 hidden h-8 w-8 max-[1200px]:block">
                <button
                  type="button"
                  aria-label="Open menu"
                  onClick={() => setMobileOpen(true)}
                  className="block h-full w-full cursor-pointer"
                >
                  <Image
                    src="/upload/goodymall1/icon/option.svg"
                    alt="menu"
                    width={32}
                    height={32}
                    unoptimized
                    className="h-8 w-8"
                  />
                </button>
              </div>

              {/* Search overlay */}
              {searchOpen && (
                <div
                  className="absolute right-[-10%] top-[46px] z-[99] box-border w-[92vw] max-w-[380px] overflow-visible border border-[#e9e9e9] bg-white shadow-[1px_1px_10px_rgba(0,0,0,0.1)] max-[1200px]:fixed max-[1200px]:right-2 max-[1200px]:left-2 max-[1200px]:w-auto max-[1200px]:max-w-none"
                  style={
                    searchPanelTop == null ? undefined : { top: searchPanelTop }
                  }
                >
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
          <div className="fixed inset-0 z-[110]" data-overlay>
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
                {/* Store switcher (mobile) */}
                <VersionSwitcher
                  content={siteContent.switcher}
                  className="mt-4"
                  logoClassName="h-3.5 w-auto shrink-0"
                />
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
                      {cartCount > 0 && (
                        <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-point-500 px-1 text-[11px] font-semibold text-white">
                          {cartCount}
                        </span>
                      )}
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
                    {navItems
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
                                {item.children.map((child) => (
                                  <li key={child.slug}>
                                    <Link
                                      href={`${item.href}?sub=${child.slug}`}
                                      onClick={() => setMobileOpen(false)}
                                      className="block py-[7px] pl-5 pr-5 text-sm font-normal text-[#555]"
                                    >
                                      {child.name}
                                    </Link>
                                  </li>
                                ))}
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
