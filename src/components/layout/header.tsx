"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Brush,
  CalendarDays,
  ChevronRight,
  Clock,
  Home,
  LayoutGrid,
  MapPin,
  Megaphone,
  Scissors,
  Sparkles,
  Star,
  Tags,
  Ticket,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { TopBanner } from "@/components/layout/top-banner";
import { VersionSwitcher } from "@/components/layout/version-switcher";
import type { NavCategory } from "@/data/categories";
import { authClient } from "@/lib/auth-client";
import { useCart } from "@/lib/cart";
import { useSiteVersion } from "@/components/site-version-provider";
import { notify } from "@/lib/toast";
import type { SiteContent, TopBannerBlock } from "@/lib/site-content";
import type { SiteVersion } from "@/lib/site-version";

/**
 * Header (Tailwind-native).
 *
 * The bar keeps the client's list — **CATEGORY · BRAND · REVIEW · EVENT ·
 * STORES · B2B · AMBASSADOR** — beside the desktop hamburger, which opens a
 * two-pane dropdown anchored under itself (not a full-width panel): every
 * top-level item on the left, its links on the right, both panes scrollable.
 *
 * On phones and tablets the logo, the store control and the icons share one
 * row, and the links sit on the row below, scrolling sideways. There is no
 * drawer there: every link in that row opens its own page.
 */

const BAR_LINKS = [
  { label: "BRAND", href: "/brands" },
  { label: "REVIEW", href: "/review" },
  { label: "EVENT", href: "/event" },
  { label: "STORES", href: "/stores" },
  { label: "B2B", href: "/b2b" },
  { label: "AMBASSADOR", href: "/ambassador" },
];

const communityLinks = [
  { label: "Community", href: "/community" },
  { label: "Notice", href: "/community/notice" },
  { label: "Product Q&A", href: "/community/qa" },
  { label: "FAQ", href: "/community/faq" },
];

const myPageLinks = [
  { label: "My page", href: "/account" },
  { label: "Order", href: "/account/orders" },
  { label: "Wish list", href: "/account/wishlist" },
  { label: "Mileage", href: "/account/mileage" },
  { label: "Coupon", href: "/account/coupons" },
];

const logStateLinks = [
  { label: "Login", href: "/login" },
  { label: "Join", href: "/join" },
  { label: "Order", href: "/account/orders" },
  { label: "My page", href: "/account" },
  { label: "Couponzone", href: "/coupons" },
];

const loggedInLinks = [
  { label: "My page", href: "/account" },
  { label: "Order", href: "/account/orders" },
  { label: "Wish", href: "/account/wishlist" },
  { label: "Mileage", href: "/account/mileage" },
  { label: "Coupon", href: "/account/coupons" },
  { label: "Logout", href: "/api/auth/sign-out" },
];

interface MenuLink {
  label: string;
  href: string;
}

/** One top-level item of the menu: the left row and its right-hand links. */
interface MenuGroup {
  id: string;
  label: string;
  href: string;
  /** Shown before the label in the left pane, like the home row's icon. */
  icon: LucideIcon;
  links: MenuLink[];
}

/** Category roots get their own icon; a new one falls back to the grid. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "skin-care": Sparkles,
  makeup: Brush,
  "hair-care": Scissors,
  "pre-order": Clock,
};

/**
 * The full menu, in one place. Every internal link of the site hangs off a
 * top-level row, so the right pane is never empty: the category tree on top,
 * then the storefront's own pages.
 */
function buildMenu(
  navCategories: NavCategory[],
  preOrderEnabled: boolean,
): MenuGroup[] {
  const roots = preOrderEnabled
    ? navCategories
    : navCategories.filter((category) => category.slug !== "pre-order");

  return [
    ...roots.map((category) => ({
      id: `category-${category.slug}`,
      label: category.name,
      href: `/category/${category.slug}`,
      icon: CATEGORY_ICONS[category.slug] ?? LayoutGrid,
      links: [
        {
          label: `Shop all ${category.name}`,
          href: `/category/${category.slug}`,
        },
        ...category.children.map((child) => ({
          label: child.name,
          href: `/category/${category.slug}?sub=${child.slug}`,
        })),
      ],
    })),
    {
      id: "brand",
      label: "Brand",
      href: "/brands",
      icon: Tags,
      links: [{ label: "All brands", href: "/brands" }],
    },
    {
      id: "review",
      label: "Review",
      href: "/review",
      icon: Star,
      links: [{ label: "What our customers say", href: "/review" }],
    },
    {
      id: "event",
      label: "Event",
      href: "/event",
      icon: CalendarDays,
      links: [{ label: "All events", href: "/event" }],
    },
    {
      id: "stores",
      label: "Stores",
      href: "/stores",
      icon: MapPin,
      links: [{ label: "Our stores", href: "/stores" }],
    },
    {
      id: "b2b",
      label: "B2B",
      href: "/b2b",
      icon: Briefcase,
      links: [{ label: "Wholesale", href: "/b2b" }],
    },
    {
      id: "ambassador",
      label: "Ambassador",
      href: "/ambassador",
      icon: Megaphone,
      links: [{ label: "Ambassador programme", href: "/ambassador" }],
    },
    {
      id: "community",
      label: "Community",
      href: "/community",
      icon: Users,
      links: communityLinks,
    },
    {
      id: "account",
      label: "My page",
      href: "/account",
      icon: User,
      links: myPageLinks,
    },
    {
      id: "coupons",
      label: "Couponzone",
      href: "/coupons",
      icon: Ticket,
      links: [{ label: "Couponzone", href: "/coupons" }],
    },
  ];
}

/** The two panes of the menu: top-level rows on the left, links on the right. */
function MenuPanes({
  groups,
  activeId,
  onActive,
  onNavigate,
}: {
  groups: MenuGroup[];
  activeId: string;
  onActive: (id: string) => void;
  onNavigate: () => void;
}) {
  const active = groups.find((g) => g.id === activeId) ?? groups[0];

  return (
    <div className="flex h-full min-h-0 w-full">
      {/* Left: home, then every top-level item — scrollable on its own. */}
      <ul
        aria-label="Menu sections"
        className="w-[38%] max-w-[260px] shrink-0 overflow-y-auto border-r border-zinc-100 py-2"
      >
        <li className="border-b border-zinc-100">
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-point-600 transition-colors hover:bg-zinc-50"
          >
            <Home size={15} aria-hidden className="shrink-0" />
            OUR:NARA
          </Link>
        </li>
        {groups.map((group) => {
          const current = group.id === active?.id;
          const Icon = group.icon;
          return (
            <li key={group.id}>
              <button
                type="button"
                onMouseEnter={() => onActive(group.id)}
                onFocus={() => onActive(group.id)}
                onClick={() => onActive(group.id)}
                aria-current={current ? "true" : undefined}
                className={`flex w-full items-center justify-between gap-1 px-4 py-2.5 text-left text-sm transition-colors duration-200 ${
                  current
                    ? "bg-point-50 font-semibold text-point-600"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon
                    size={15}
                    aria-hidden
                    className={`shrink-0 ${
                      current ? "text-point-500" : "text-zinc-400"
                    }`}
                  />
                  <span className="truncate">{group.label}</span>
                </span>
                <ChevronRight
                  size={14}
                  aria-hidden
                  className="shrink-0 text-zinc-400"
                />
              </button>
            </li>
          );
        })}
      </ul>

      {/* Right: the selected item's links, also scrollable. */}
      <div className="min-w-0 flex-1 overflow-y-auto px-5 py-3">
        {active && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            {active.label}
          </p>
        )}
        <ul>
          {(active?.links ?? []).map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onNavigate}
                className="block truncate rounded px-2 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-ink"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Header({
  siteContent,
  navCategories = [],
  storeBackgrounds,
  topBanners,
}: {
  siteContent: SiteContent;
  /** The admin's category tree; the menu follows it without a deploy. */
  navCategories?: NavCategory[];
  /** Each store's top-banner background — the store toggle's two colours. */
  storeBackgrounds: Record<SiteVersion, string>;
  /** Each store's rotating strip, so a store switch swaps it client-side. */
  topBanners: Record<SiteVersion, TopBannerBlock[]>;
}) {
  const router = useRouter();
  const { config } = useSiteVersion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPanelTop, setSearchPanelTop] = useState<number | null>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);

  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const cartCount = useCart().reduce((sum, item) => sum + item.qty, 0);

  const groups = useMemo(
    () => buildMenu(navCategories, config.preOrderEnabled),
    [navCategories, config.preOrderEnabled],
  );
  const activeId = activeGroup || groups[0]?.id || "";

  // Close the panels on an outside press or Escape, and when a link inside them
  // is followed — a panel must never outlive the navigation it triggered.
  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuOpen &&
        !menuPanelRef.current?.contains(target) &&
        !menuTriggerRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }
      if (
        searchOpen &&
        !searchPanelRef.current?.contains(target) &&
        !searchTriggerRef.current?.contains(target)
      ) {
        setSearchOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, searchOpen]);

  // While the session is still loading, don't flash the logged-out dropdown —
  // show no menu until we know the real auth state.
  const links = user
    ? user.role === "admin"
      ? [{ label: "Dashboard", href: "/admin" }, ...loggedInLinks]
      : loggedInLinks
    : isPending
      ? null
      : logStateLinks;

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div>
      <TopBanner blocksByVersion={topBanners} />

      <div
        data-site-header
        className="relative z-[99] w-full bg-white shadow-[2px_2px_5px_rgba(0,0,0,0.1)]"
      >
        {/* One row on desktop (logo · menu · icons); on phones and tablets the
            logo and icons share the first row and the menu links take the
            second. */}
        <div className="mx-auto flex min-h-20 w-[96%] max-w-[1560px] flex-wrap items-center justify-between max-[1200px]:min-h-0 max-[1200px]:px-[7px] max-[1200px]:py-2">
          <h1 className="relative order-1 flex shrink-0 items-center pl-[18px] pr-4 max-[1200px]:pl-1 max-[1200px]:pr-2">
            <Link href="/">
              <Image
                src="/upload/goodymall1/en/main/logo_.png"
                alt="OUR:NARA"
                width={2483}
                height={392}
                loading="eager"
                className="h-auto w-auto max-h-8 max-w-[170px] max-[1200px]:max-w-[130px] max-md:max-w-[104px]"
              />
            </Link>
          </h1>

          {/* The bar, left-aligned right after the logo: the desktop hamburger,
              then CATEGORY and the storefront pages. */}
          <div className="order-2 flex min-w-0 flex-1 items-center justify-start max-[1200px]:order-3 max-[1200px]:h-10 max-[1200px]:basis-full">
            <div className="flex min-w-0 items-center max-[1200px]:w-full">
              {/* The hamburger and its dropdown, anchored under the icon. The
                  button is centred in the 80px row, so `mt-5` lands the panel
                  on the header's bottom edge. */}
              <div className="relative shrink-0 max-[1200px]:hidden">
                <button
                  type="button"
                  ref={menuTriggerRef}
                  aria-label="Open menu"
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex h-10 w-12 cursor-pointer flex-col items-center justify-center gap-[5px]"
                >
                  {[0, 1, 2].map((bar) => (
                    <span
                      key={bar}
                      className={`block h-0.5 w-[18px] bg-[#222] transition-transform duration-300 ${
                        menuOpen && bar === 0
                          ? "translate-y-[7px] rotate-45"
                          : menuOpen && bar === 1
                            ? "opacity-0"
                            : menuOpen
                              ? "-translate-y-[7px] -rotate-45"
                              : ""
                      }`}
                    />
                  ))}
                </button>

                {menuOpen && (
                  <div
                    ref={menuPanelRef}
                    role="dialog"
                    aria-label="Menu"
                    className="absolute left-0 top-full z-[100] mt-5 w-[760px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.16)]"
                  >
                    <div className="h-[min(60vh,520px)]">
                      <MenuPanes
                        groups={groups}
                        activeId={activeId}
                        onActive={setActiveGroup}
                        onNavigate={closeMenu}
                      />
                    </div>
                  </div>
                )}
              </div>

              <nav aria-label="Main" className="min-w-0 flex-1">
                <ul className="flex items-center gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] max-[1200px]:h-10 max-[1200px]:gap-4 [&::-webkit-scrollbar]:hidden">
                  <li className="shrink-0">
                    <Link
                      href="/category"
                      className="relative mx-1 inline-flex h-10 items-center px-1.5 text-base font-semibold text-ink transition-colors duration-500 hover:text-point-500 max-[1200px]:mx-0 max-[1200px]:text-[15px]"
                    >
                      CATEGORY
                    </Link>
                  </li>
                  {BAR_LINKS.map((item) => (
                    <li key={item.href} className="shrink-0">
                      <Link
                        href={item.href}
                        className={
                          item.label === "AMBASSADOR"
                            ? "ml-1 flex h-7 items-center gap-1 rounded-[30px_30px_30px_0] bg-point-500 pl-2.5 pr-1.5 text-base font-semibold whitespace-nowrap text-white max-[1200px]:text-[15px]"
                            : "relative mx-1 inline-flex h-10 items-center px-1.5 text-base font-semibold text-ink transition-colors duration-500 after:absolute after:bottom-[9px] after:left-1.5 after:h-0.5 after:w-0 after:bg-point-500 after:transition-all after:duration-500 hover:text-point-500 hover:after:w-[calc(100%-12px)] max-[1200px]:mx-0 max-[1200px]:text-[15px]"
                        }
                      >
                        {item.label}
                        {item.label === "AMBASSADOR" && (
                          <Image
                            src="/upload/goodymall1/icon/right_extra_bold.svg"
                            alt=""
                            width={20}
                            height={20}
                            unoptimized
                            className="w-5 brightness-0 invert"
                          />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>

          {/* Right: the store control (toggle + popup button), account, cart
              and search. Phones keep the cart only. */}
          <div className="relative order-3 flex shrink-0 items-center max-[1200px]:order-2 max-[1200px]:ml-auto">
            <VersionSwitcher
              content={siteContent.switcher}
              backgrounds={storeBackgrounds}
              className="mr-2 max-[1200px]:mr-1"
            />

            <ul className="inline-flex items-center">
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
              <li className="relative flex min-w-6 items-center px-1 max-[1200px]:px-0">
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

            {/* Search — desktop only; the phone bar keeps the cart and the
                store control. */}
            <div className="relative min-w-6 cursor-pointer pl-1 max-[1200px]:hidden">
              <button
                type="button"
                ref={searchTriggerRef}
                aria-label="Search"
                onClick={() => {
                  if (window.innerWidth < 1200) {
                    const header =
                      document.querySelector<HTMLElement>("[data-site-header]");
                    setSearchPanelTop(
                      header
                        ? Math.round(header.getBoundingClientRect().bottom + 6)
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

            {/* Search overlay */}
            {searchOpen && (
              <div
                ref={searchPanelRef}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a")) {
                    setSearchOpen(false);
                  }
                }}
                className="absolute right-0 top-[46px] z-[99] box-border w-[92vw] max-w-[380px] overflow-visible border border-[#e9e9e9] bg-white shadow-[1px_1px_10px_rgba(0,0,0,0.1)] max-[1200px]:fixed max-[1200px]:left-2 max-[1200px]:right-2 max-[1200px]:w-auto max-[1200px]:max-w-none"
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
                      placeholder="Search products"
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
    </div>
  );
}
