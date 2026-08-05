# OUR:NARA — Platform Rebuild Plan

## 1. Context & Goal

The client's store lives at **https://our-nara.com/** and currently runs on **Cafe24** (a Korean site-builder/SaaS). It's a K-Beauty e-commerce store targeting **India** (INR pricing, India + Korea company offices), shipping worldwide. The client wants to move off the site-builder onto a **custom, owned** stack so they can add **custom payment tools** and features the builder can't support.

**Target stack (per client):** Next.js (App Router) + TypeScript · PostgreSQL · Vercel deployment.

### What the current site has (feature inventory from homepage + site audit)
- **Catalog:** Skin Care, Makeup, Hair Care, PRE-ORDER categories
- **Brands:** NOWATER, DR.PEPTI, HEVVY MAKEUP, SKIN APPLE, HE:ARIM, LA THEORIE, HYGGEE, LINGCELL, TENZERO, MOOLDA, FABYOU, and more
- **Product model:** variants/options ("Choose 1 of 6", "Choose 1 of 10"), pre-order flag, summary/short tags, price in INR (incl. `.33/.67` values → original KRW converted), multiple images
- **Storefront sections:** hero, category carousels, Top Picks / Best Product, TikTok "Shorts Picks" embeds, curated skincare routines, AVAILABLE NOW / PRE-ORDER tabs, per-brand product grids, customer reviews, Instagram feed (#our__nara), CS Center + world-shipping selector
- **Commerce:** cart, checkout/order, wishlist, "recent viewed", user accounts (Login/Join), loyalty **Mileage** points, **Coupons**, Order history, My Page
- **Community:** Notice, Product Q&A, FAQ, plus Brand/Review/Event/Stores/Ambassador pages
- **Internationalization:** shipping-destination selector + English/Korean language switch

## 2. Open Questions (confirm with client before/while building)
1. **Payment providers:** India needs Razorpay/PayU/Cashfree (UPI, cards, netbanking, wallets). International orders likely need Stripe. Which providers and which countries must accept payments? (This is the core "custom payment tools" requirement.)
2. **Data migration:** Do we get a product/order/user data export from Cafe24, or do we start from scratch and re-key products? This hugely affects effort.
3. **Inventory & pre-orders:** Is inventory managed in real time, or are all items effectively "order now, ship later"? Any stock level tracking needed?
4. **Mileage & Coupons:** Keep the loyalty points + coupon system with current rules (accrual %, expiry, redemption limits)?
5. **Multi-currency / multi-language scope:** Ship-only selector vs. full multi-currency pricing (INR/KRW/global)? Keep Korean + English?
6. **Brands:** 11+ brands — is each brand a full sub-catalog page, or just a product grouping?
7. **SEO/CMS:** Do product descriptions/lifestyle content need a CMS (Sanity/Contentful), or is it DB-only managed by staff?
8. **Order fulfillment:** Any ERP/3PL integration (e.g., inventory, tracking numbers, email via a provider)? Or email-only for now?

## 3. Proposed Stack
| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | SSR/ISR for SEO, server actions, route handlers |
| UI | Tailwind CSS + shadcn/ui | Fast, consistent, easy theming to match current brand |
| DB | PostgreSQL via **Neon** (Vercel integration) | Serverless-friendly; Vercel Postgres is Neon under the hood |
| ORM | Prisma | Schema + migrations + client |
| Auth | NextAuth.js (Auth.js) v5 | Credentials + OAuth (Google), sessions in DB |
| Payments | **Razorpay** (India) + **Stripe** (international) — *confirm* | Custom server-side order + webhook flow |
| File storage | Vercel Blob (or Cloudinary) | Product images, review photos |
| Media embeds | TikTok player + Instagram embed | Mirrors current "Shorts Picks" & IG feed |
| Email | Resend / Postmark | Order confirmations, shipping updates |
| Deployment | Vercel (+ Neon DB, Blob, envs) | Preview + prod, CI via Git |
| Monorepo | Single Next.js app (apps/web) | Keep simple; add admin as separate app only if needed |

## 4. Data Model (Prisma — first draft)
```
User          id, email, passwordHash, name, phone, country, isAdmin, createdAt
Address       id, userId, label, line1/2, city, state, postal, country, isDefault
Brand         id, slug, name, logoUrl, description, coverImage, active
Category      id, slug, name, parentId?, sortOrder
Product       id, brandId, categoryId, slug, name, summary, shortTags,
              descriptionHtml, priceCents, compareAtCents, currency, isPreOrder,
              isAvailableNow, images[], active, seoTitle/Desc
ProductOption id, productId, name ("Choose 1 of 6"), values[]  (e.g. shade)
Stock         productId, optionValue?, quantity, sku, allocated
Order         id, userId?, email, status(PENDING/PAID/PRE_ORDER/SHIPPED/CANCELLED/REFUNDED),
              currency, subtotalCents, shippingCents, discountCents, totalCents,
              billing/shipping snapshot, preOrderFlag
OrderItem     id, orderId, productId, optionValue, name, priceCents, qty, sku
Payment       id, orderId, provider(razorpay/stripe), providerRef, amountCents,
              status, rawPayload
Coupon        id, code, type(PERCENT/FIXED/SHIPPING), value, minOrder, maxUses,
              perUser, startsAt, expiresAt
CouponRedemption id, couponId, userId, orderId
MileageLedger id, userId, delta, reason, orderId?, balanceAfter, createdAt
Review        id, productId, userId, rating, title, body, images[], verified, status
WishlistItem  id, userId, productId, createdAt
RecentView    id, userId(guest cookie?), productId, viewedAt
Notice/QA/Faq (community) — generic Post/Comment tables
CountryRate   countryCode, name, enabled, shippingCents, currency, lang
```

## 5. Architecture & Key Flows
- **Rendering:** Storefront pages static/ISR with revalidation; cart/account pages client-side; admin protected.
- **Cart:** Server-managed cart (DB for logged-in, cookie/guest cart) → single source of truth at checkout.
- **Checkout (custom):**
  1. Server creates `Order` (PENDING) + payment intent.
  2. Client opens Razorpay/Stripe checkout with amounts from server.
  3. **Webhook** verifies signature, marks `Order` PAID, decrements stock, creates mileage + coupon redemption, emails receipt.
  4. Order confirmation + status updates in My Page.
  - Pre-orders flow into same pipeline but flag `PRE_ORDER` status and no stock decrement until stock arrives.
- **Payments security:** Never trust client amounts; recompute totals server-side. Store only payment references + webhook payloads; keep secrets in env vars, never in client.
- **Mileage:** Ledger-based (append-only), accrued on paid orders, spent at checkout, verified server-side.
- **i18n / shipping:** `CountryRate` drives ship-to selector; language toggle for en/ko (next-intl).

## 6. Milestones
**Phase 0 — Scaffold & foundations (0.5–1 wk)**
- `create-next-app` (TS, App Router, Tailwind), Prisma + Neon DB, Auth.js, deploy shell to Vercel, CI.

**Phase 1 — Data & admin (1–2 wks)**
- Finalize schema, migrate, Prisma Studio for data entry.
- Admin CRUD: brands, categories, products (+ options, images, pre-order flag), coupons, inventory, community posts, reviews moderation.
- Seed script from Cafe24 export (if provided) or manual entry.

**Phase 2 — Storefront catalog (1–2 wks)**
- Layout/design system matching current site (fonts: Noto Sans KR, Poppins, Playfair Display, Potta One).
- Homepage sections, category/brand/product listing, product detail (options, pre-order badge, gallery), search, TikTok Shorts + Instagram embeds.

**Phase 3 — Customer account & community (1 wk)**
- Register/login, My Page (orders, mileage, coupons, wishlist, recent), address book, community (notice/QA/FAQ), reviews submission, ambassador/store pages.

**Phase 4 — Cart & checkout + custom payments (1–2 wks)** ⭐
- Cart (guest + logged-in), world-shipping selector, coupon + mileage application, custom checkout, **Razorpay + Stripe integration**, webhooks, order confirmation emails.

**Phase 5 — Polish, SEO, go-live (1 wk)**
- SEO metadata/OG, sitemap, robots, performance/analytics, test payment sandbox → live keys, migrate data, cutover DNS.

## 7. Risks & Notes
- **Prices with `.33/.67`:** These are KRW→INR conversions. Decide whether to keep generated prices or set clean INR prices during data entry.
- **Cafe24 migration:** Check if the client can export products/orders. If not, plan a content entry effort.
- **Payment provider availability in India** (Razorpay vs PayU/Cashfree/Instamojo) and **international** (Stripe) must be confirmed — affects Phase 4 significantly.
- **KYC/legal:** Accepting payments requires the merchant to have the right PG accounts/KYC; we just integrate.
- Keep secrets out of repo; use Vercel env vars per environment.

## 8. Immediate Next Step
Confirm **open questions (Section 2)**, especially the payment providers, then scaffold **Phase 0**. I can start scaffolding the Next.js + Prisma + Neon project now if you want.
