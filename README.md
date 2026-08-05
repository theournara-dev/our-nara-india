# OUR:NARA Storefront

A frontend replica of the [OUR:NARA](https://our-nara.com/) K-Beauty store.

> **Current scope:** a complete frontend — all pages, layouts and components —
> built to match the live store. It runs on **static content** (real product
> names/prices copied from the live site) so it needs **no database, cart or
> purchases** to work. The database, Razorpay checkout and accounts are scaffolded
> and can be wired in later.

## Stack

- **Framework:** Next.js 16 (App Router) · TypeScript · React 19
- **Styling:** Tailwind CSS v4
- **Data:** static catalog + content modules (`src/data/`)
- **Payments (scaffolded):** Razorpay server module + webhook handlers
- **Deployment:** Vercel

## Run it

```bash
npm install
npm run dev        # http://localhost:3000  (no database required)
```

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
| `/account` · `/orders` · `/wishlist` · `/mileage` · `/coupons` | My Page area                                                                                   |
| `/login` · `/join`                                             | Auth pages (static forms)                                                                      |
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
    api/razorpay/       # order creation + webhook handlers (scaffolded)
  components/
    layout/             # Header, Footer
    product/            # ProductCard, ProductGrid
    ui/                 # Button, Badge, Container, SectionHeading, PageHeader
  data/
    catalog.ts          # static products, brands, categories + lookups
    content.ts          # reviews, events, stores, community posts, shorts
    products.ts         # static product queries (swap for Prisma later)
    categories.ts       # static category queries
    brands.ts           # static brand queries
  lib/                  # utils, constants, money (DB/Payment scaffolding kept)
prisma/                 # DB schema + seed (reserved for the data milestone)
scripts/import-from-live.ts  # catalog importer from the live store
```

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
| `npm run import`                  | Import the catalog from the live store (optional, needs DB) |

## Next steps (deferred per current scope)

1. Wire the catalog to the database (Prisma + importer already scaffolded)
2. Cart + auth (accounts, guest cart)
3. Checkout using the existing Razorpay order/webhook handlers
4. Mileage (loyalty points) + coupons
5. Multi-currency pricing
