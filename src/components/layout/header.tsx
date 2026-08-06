"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- faithful port uses <a> */

import { useState } from "react";
import { TopBanner } from "@/components/layout/top-banner";

/**
 * Faithful port of the original Cafe24 header (Goody Mall theme).
 * Renders the original markup/classes so the imported theme CSS styles it
 * one-to-one; the menu/search/category interactions are driven by React state.
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
                          <li key={item.href} className="swiper-slide">
                            <a
                              href={item.href}
                              className={
                                item.label === "AMBASSADOR"
                                  ? "point bbs_none"
                                  : undefined
                              }
                            >
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
                    <div className="swiper-button-next swiper-button-next-menu" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right icons + search */}
            <div className="topArea02">
              <div className="shoppinginfo">
                <ul className="xans-element- xans-layout xans-layout-statelogoff">
                  <li>
                    <a href="/account">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/upload/goodymall1/icon/user.svg"
                        alt="my page"
                      />
                    </a>
                  </li>
                  <li>
                    <a href="/cart">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/upload/goodymall1/icon/basket.svg"
                        alt="basket"
                      />
                    </a>
                  </li>
                  <li className="pc">
                    <button
                      type="button"
                      className="log"
                      onClick={() => setMobileOpen(true)}
                    >
                      Menu
                    </button>
                  </li>
                </ul>

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
                  <div className="searchWrap round open">
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
