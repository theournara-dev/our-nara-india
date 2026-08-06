"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- faithful port uses <a> */

import { useState } from "react";
import { TopBanner } from "@/components/layout/top-banner";

/**
 * Faithful port of the original Cafe24 header (Goody Mall theme).
 * Renders the original markup/classes so the imported theme CSS styles it
 * one-to-one; the menu/search interactions are driven by React state.
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

      <div id="header">
        <div className="header_wrap">
          <div className="inner">
            {/* Logo */}
            <h1 className="xans-element- xans-layout xans-layout-logotop">
              <a href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/upload/goodymall1/en/main/logo_.png"
                  alt="OUR:NARA"
                />
              </a>
            </h1>

            {/* Top category menu */}
            <div id="menuFix">
              <div className="topCate">
                <div className="topArea" id="fixed_menu">
                  {/* All categories button */}
                  <div className="AllCategory pc">
                    <button
                      type="button"
                      className="btn-allcate"
                      aria-label="All categories"
                      onClick={() => setAllCateOpen((v) => !v)}
                    >
                      <span />
                      <span />
                      <span />
                    </button>
                  </div>

                  {/* All-categories panel */}
                  {allCateOpen && (
                    <div id="allCate" className="pc">
                      <div className="allArea">
                        <div className="all_cont">
                          <ul>
                            <h1>Shopping Category</h1>
                            <div className="allCate_con">
                              <ul>
                                {categoryNav.map((item) => (
                                  <li key={item.href}>
                                    <a href={item.href}>{item.label}</a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="allCate_cs">
                              <div className="bbs">
                                <a href="/community" className="title">
                                  COMMUNITY
                                </a>
                                <ul className="bbs-dp1">
                                  {communityLinks.map((link) => (
                                    <li key={link.href}>
                                      <a href={link.href}>{link.label}</a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="bbs mypage">
                                <a href="/account" className="title">
                                  MY PAGE
                                </a>
                                <ul className="bbs-dp1">
                                  {myPageLinks.map((link) => (
                                    <li key={link.href}>
                                      <a href={link.href}>{link.label}</a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category nav */}
                  <div className="topCategory">
                    <div
                      id="categoryMenu"
                      className="xans-element- xans-layout xans-layout-category swiper swiperMenu"
                    >
                      <ul className="menu-dp1 swiper-wrapper">
                        {categoryNav.map((item) => (
                          <li
                            key={item.href}
                            className={
                              item.label === "AMBASSADOR"
                                ? "point bbs_none swiper-slide"
                                : "swiper-slide"
                            }
                          >
                            <a href={item.href}>
                              {item.label}
                              {item.label === "AMBASSADOR" && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src="/upload/goodymall1/icon/right_extra_bold.svg"
                                  alt="arrow"
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
            </div>

            {/* Right icons + search */}
            <div className="topArea02">
              <div className="shoppinginfo">
                {/* Multishop / global */}
                <div className="multi_state pc">
                  <div className="multi_icon">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/upload/goodymall1/icon/global.svg"
                      alt="language"
                    />
                  </div>
                </div>

                {/* User / log state */}
                <ul className="xans-element- xans-layout xans-layout-statelogoff">
                  <li className="pc">
                    <div>
                      <a href="/account">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/upload/goodymall1/icon/user.svg"
                          alt="my page"
                        />
                      </a>
                    </div>
                    <div className="tong">
                      <div className="t_bounce">
                        <a href="/join">+3,000P</a>
                        <div className="tails" />
                      </div>
                    </div>
                    <ul className="log_state">
                      {logStateLinks.map((link) => (
                        <li key={link.label}>
                          <a href={link.href} className={link.className}>
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </li>
                  {/* Basket */}
                  <li>
                    <a href="/cart">
                      <span className="count EC-Layout_Basket-count-display">
                        <span className="EC-Layout-Basket-count">0</span>
                      </span>
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/upload/goodymall1/icon/basket.svg"
                          alt="basket"
                        />
                      </div>
                    </a>
                  </li>
                </ul>

                {/* Search */}
                <div className="search">
                  <button
                    type="button"
                    className="search_icon"
                    aria-label="Search"
                    onClick={() => setSearchOpen(true)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/upload/goodymall1/icon/search.svg"
                      alt="search"
                    />
                  </button>
                </div>

                {/* Search overlay */}
                {searchOpen && (
                  <div
                    className="searchWrap round"
                    style={{ display: "block" }}
                  >
                    <form action="/search" method="get">
                      <fieldset>
                        <legend>Search</legend>
                        <input
                          name="q"
                          className="inputTypeText"
                          type="text"
                          autoFocus
                          placeholder="검색어를 입력해주세요"
                        />
                        <button
                          type="button"
                          className="btnSearch"
                          onClick={() => setSearchOpen(false)}
                        >
                          ✕
                        </button>
                      </fieldset>
                    </form>
                    <div className="list-wrap">
                      <div className="section hot-keyword">
                        <div className="section-title">recommended search</div>
                        <div className="section-item">
                          <ul>
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
                                >
                                  {term}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="mobMenuBtn"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
        >
          ☰
        </button>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="side mobile open">
            <div className="side_dim" onClick={() => setMobileOpen(false)} />
            <div className="side_area">
              <button
                type="button"
                className="side_close"
                aria-label="Close"
                onClick={() => setMobileOpen(false)}
              >
                ✕
              </button>
              <nav>
                <p className="side_title">CATEGORY</p>
                {categoryNav.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="side_menu"
                  >
                    {item.label}
                  </a>
                ))}
                <p className="side_title">MY PAGE</p>
                {myPageLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="side_menu"
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
