# OUR:NARA Storefront

A frontend replica of the [OUR:NARA](https://our-nara.com/) K-Beauty store.

> **Current scope:** a complete storefront (all pages, layouts, components)
> with a live PostgreSQL (Neon/Prisma) catalog, Better Auth accounts (email +
> Google OAuth), working **Razorpay checkout** (verified payments, webhook
> reconciliation, refunds) and a **Delhivery fulfillment** pipeline
> (shipment creation, pull-based tracking sync, admin dashboard). Feedback via
> the contact dialog is stored in the DB and triaged in the admin panel.

## Port status (from the original static site)

The original Cafe24 HTML/CSS/JS/images were copied into the project and are
being ported to the Next.js app.

Done

- All images copied into public/ (site graphics in /upload, product photos in
  /product) and referenced from the static catalog.
- Original brand palette + fonts converted to Tailwind design tokens
  (purple #6F2DBD accent, sale/ink/soft colors) in globals.css.
- Working interactive header (client component): auto-rotating top banner,
  mobile menu drawer, all-categories popup, search overlay - real logo.
- Swiper-powered product carousels and the Shorts Picks reels carousel.
- Homepage header + product/hero sliders matched closely to the original
  theme: nav arrows + progressbars extracted into a shared `SliderNav`
  component, category dropdown hover/typography, and no layout flash on load.
- Responsive header (desktop single row → mobile two-row: logo/icons on row 1,
  scrollable category nav on row 2) and a mobile slide-out drawer with an
  accordion category menu; header icons use the original SVG/PNG files.
- Product cards show a 2-image hover crossfade plus wishlist/add-to-cart quick
  actions; images serve any format (jpg/png/gif) via an unoptimized `Image`.
- Top Picks shows 4 items, each with an on-hover image (`hoverImage`).
- **All homepage sections reproduced from the original:** Hero, Top Picks,
  Shorts Picks (multi-platform embeds), Triple Banner, PRE-ORDER grid, Long
  Banner, 10 brand grids, Real Reviews (cards link to per-review pages),
  Instagram (CSS marquee), and the footer (CS center + address + socials).
- Home-only floating actions (recently viewed + smooth scroll-to-top) that fade
  in after scrolling, plus session-based recently-viewed tracking with a
  `/recent-view` page (most recent first).
- Scroll-reveal on first scroll (`Reveal` + IntersectionObserver); PNG images
  use `next/image`, internal links use `next/link`.

Still to do

- Replace the placeholder `hoverImage` values on the featured products with the
  real on-hover images.
- Match remaining pages/components to the original layout more closely
  (the site is Tailwind-native now, not a rule-by-rule port of the minified
  theme CSS).
- Reimplement remaining JS interactions (product image zoom, etc.).
- Wire the storefront's `src/data/*` queries to the live Prisma catalog
  (schema + Neon DB are ready; static queries still serve the UI).

## Stack

- **Framework:** Next.js 16 (App Router) · TypeScript · React 19
- **Styling:** Tailwind CSS v4
- **Data:** PostgreSQL on **Neon** + **Prisma** (schema + migrations); static
  content modules (`src/data/`) still serve the storefront UI
- **Auth:** **Better Auth** (email/password + username id-or-email login, Google
  OAuth, DB sessions via the Prisma adapter); admin dashboard at `/admin`
- **Email:** **Resend** (verification OTPs, transactional mail, support alerts)
- **Toasts:** **Sonner** (loading-first toasts via `src/lib/toast.ts`)
- **Payments:** **Razorpay** — server-side order creation, verified checkout
  signature, webhook source-of-truth (captured/failed/refund events), daily
  reconciliation cron
- **Fulfillment:** **Delhivery** — shipment creation from the admin, forward-only
  tracking sync (cron + on-demand), pickup scheduling/cancellation
- **Deployment:** Vercel

## Database (Neon + Prisma)

The app connects to a Neon PostgreSQL instance via Prisma. Env vars live in
`.env` (local) and must be mirrored in Vercel project settings for deploy:

- `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct)
- `PGHOST` / `PGUSER` / `PGPASSWORD` / `PGDATABASE` (as exported by Neon)
- `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` (the public site URL; `http://localhost:3000` in dev)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (Google OAuth — empty until configured)
- `RESEND_API_KEY` / `EMAIL_FROM` / `RESEND_TEST_TO` (transactional email)
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`
- `DELHIVERY_API_TOKEN` / `DELHIVERY_BASE_URL` / `DELHIVERY_PICKUP_LOCATION`
- `CRON_SECRET` (guards `/api/cron/daily-sync` via `Authorization: Bearer`)
- `NEXT_PUBLIC_SITE_URL`
- `BETTER_AUTH_PRODUCTION_URL` (production domain used for auth base URL +
  trusted origins when `BETTER_AUTH_URL` is unset — set it to the custom
  domain, e.g. `https://www.our-nara.com`)

Useful commands:

```bash
npm run db:generate    # generate the Prisma client (also runs on npm install)
npm run db:migrate     # prisma migrate dev (local, creates new migrations)
npx prisma migrate deploy   # apply migrations to the deployed DB (Neon)
npm run db:seed        # seed brands/categories/products (idempotent)
npm run db:studio      # browse/edit data in Prisma Studio
```

> The generated client lives in `src/generated/prisma` and is gitignored; a
> `postinstall` hook runs `prisma generate` so builds (and CI) regenerate it.
>
> **Email verification** is gated behind `EMAIL_VERIFICATION_ENABLED` in
> `src/lib/config.ts` and is currently **off** until the Resend sending domain
> (`our-nara.com`) is verified. When on, sign-up is a 3-step wizard
> (policies → profile → verify email).

## Run it

```bash
cp .env.example .env   # then fill in your real values (Neon DATABASE_URL, etc.)
npm install            # runs prisma generate automatically (postinstall)
npm run dev            # http://localhost:3000
```

> The storefront UI renders from static data, so `npm run dev` works without a
> database. The Neon DB is needed only once you wire up the catalog/checkout.

## Pages

| Route                                                          | Page                                                                                           |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `/`                                                            | Homepage (hero, categories, top picks, brand sections, pre-orders, shorts, reviews, Instagram) |
| `/products/[slug]`                                             | Product detail                                                                                 |
| `/category/[slug]`                                             | Category listing (Skin Care / Makeup / Hair Care / PRE-ORDER)                                  |
| `/brands`                                                      | Brand directory                                                                                |
| `/brand/[slug]`                                                | Brand listing                                                                                  |
| `/search?q=`                                                   | Search                                                                                         |
| `/review`                                                      | Reviews                                                                                        |
| `/event`                                                       | Events & promotions                                                                            |
| `/stores`                                                      | Store locations                                                                                |
| `/community`, `/community/[board]`                             | Community (Notice / Q&A / FAQ)                                                                 |
| `/ambassador`                                                  | Ambassador program                                                                             |
| `/account` · `/orders` · `/wishlist` · `/mileage` · `/coupons` | My Page area (requires login)                                                                  |
| `/login` · `/join`                                             | Auth: sign in (id-or-email), sign-up wizard                                                    |
| `/admin`                                                       | Admin dashboard (admin-only; users/permissions page)                                           |
| `/admin/orders`                                                | Order management: status, Delhivery shipments, delete                                          |
| `/admin/feedback`                                              | Contact-dialog feedback: triage status, filters, search, pagination                            |
| `/admin/products` � `/preorders` � `/banners` � `/popups` � `/pages` | Content/catalog management                                                               |
| `/cart` · `/coupons`                                           | Cart + Couponzone                                                                              |
| `/about` · `/help`                                             | Company + Help/FAQ                                                                             |
| `/policies/terms` · `/policies/refund` · `/policies/privacy`   | Legal pages                                                                                    |

## Project structure

```
src/
  app/                  # routes (App Router)
    layout.tsx          # shared shell: Header + Footer
    page.tsx            # homepage
    ...                 # one folder per route above
    api/razorpay/       # order creation, payment verification, webhook handlers
    api/cron/           # daily Razorpay + Delhivery reconciliation (CRON_SECRET)
    actions/            # server actions: createOrder (idempotent), submitFeedback
  components/
    layout/             # Header, Footer
    contact/            # ContactDialog + global host (openContactDialog)
    product/            # ProductCard, ProductGrid
    ui/                 # Button, Badge, Container, SectionHeading, PageHeader, SliderNav
  data/
    catalog.ts          # static products, brands, categories + lookups (incl. hoverImage)
    content.ts          # reviews, events, stores, community posts, shorts
    products.ts         # static product queries (swap for Prisma later)
    categories.ts       # static category queries
    brands.ts           # static brand queries
  lib/                  # utils, constants, money, auth, db, razorpay, delhivery,
                        # payment-errors (friendly checkout errors), toast
prisma/                 # DB schema + seed (reserved for the data milestone)
scripts/import-from-live.ts  # catalog importer from the live store
```

## Payments & fulfillment flow

**Checkout (Razorpay):**

1. `createOrder` (server action) recomputes totals from the DB, enforces
   per-variant stock limits, and is idempotent via a client `cartToken`
   (retries reuse the same PENDING order).
2. `POST /api/razorpay/order` creates the Razorpay order from the internal one.
3. The checkout modal opens; on success the handler posts to
   `POST /api/razorpay/verify`, which confirms the `order|payment` HMAC
   server-side before the UI shows "paid".
4. The **webhook** (`/api/razorpay/webhook`) is the source of truth:
   `payment.captured` marks the order PAID/PRE_ORDER, decrements stock
   (guarded; skips alert support for oversells), and emails the customer.
   `order.paid` is the missed-webhook fallback; `refund.created` flips
   full refunds to REFUNDED and restocks atomically. Amount mismatches and
   partial refunds notify support instead of guessing.

**Fulfillment (Delhivery):** admins create/import shipments from
`/admin/orders`, request pickups, and cancel pre-dispatch waybills. Statuses
arrive by **pull**: the daily cron (`/api/cron/daily-sync`, guarded by
`CRON_SECRET`) plus an on-demand row "Sync" button. Both order and shipment
statuses advance forward-only — backed-up or unmapped provider wordings can
never demote progress. Delhivery has no webhook; the cron is the only
automatic path.

**Feedback:** the storewide contact dialog (also reachable from error
boundaries and payment-failure toasts) stores messages + error traces in the
`feedback` table and they are triaged at `/admin/feedback`.

## Conventions

- **Data is decoupled:** pages talk to `src/data/*` query functions. Today they
  return static data; later they can query Prisma without touching the UI.
- **Money** is stored as integer minor units (paise) with a `currency` field,
  ready for multi-currency.
- **Design system:** reusable UI primitives in `src/components/ui`; content
  pages use a shared `Header`/`Footer` shell and `PageHeader`/`SectionHeading`.

## Scripts

| Command                           | Purpose                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `npm run dev` / `build` / `start` | Dev / build / serve                                         |
| `npm run lint` / `typecheck`      | Lint / type-check                                           |
| `npm run db:generate`             | Generate the Prisma client (also runs on `postinstall`)     |
| `npm run db:migrate`              | `prisma migrate dev` (create/apply migrations locally)      |
| `npm run db:seed`                 | Seed brands/categories/products (idempotent)                |
| `npm run db:studio`               | Open Prisma Studio                                          |
| `npm run import`                  | Import the catalog from the live store (optional, needs DB) |

## Next steps

1. Wire the storefront's `src/data/*` queries to the live Prisma catalog
   (schema + Neon DB ready)
2. Verify the Resend sending domain, then enable email verification
   (`EMAIL_VERIFICATION_ENABLED = true`)
3. Coupons + reviews admin sections (placeholders exist in the admin nav)
4. Mileage (loyalty points) redemption flow
5. Multi-currency pricing
6. Raise the Delhivery sync frequency when off the Vercel Hobby plan
   (currently 1×/day via `/api/cron/daily-sync`)
