# Local vs Global Shop Versions

One codebase, two shops:

|            | Local (India)   | Global (international)                 |
| ---------- | --------------- | -------------------------------------- |
| Domain     | our-nara.com    | our-nara.co.kr                         |
| Currency   | INR (₹)         | INR (₹)                                |
| Payment    | Razorpay (live) | Razorpay (live, own account)           |
| Pre-orders | Enabled         | Disabled — everything buyable directly |

Both stores price in **INR** because Razorpay only settles INR. The global store
uses its own Razorpay account but the same currency.

The site detects which shop to show from the **domain name** the visitor opened.
In development (localhost) the header switch just flips a preview variable;
in production it navigates to the other domain.

## For everyone (non-technical)

Think of it as **one settings table with two columns** — "local" and "global".
Every difference between the shops is one row in that table
(currency, payment on/off, pre-orders on/off, Indian address on/off, …).

- To make something different per shop, you **add a row** to the table —
  you never copy pages or maintain two websites.
- To change a difference, you **edit that one row** — both shops update.
- The live table is in `src/lib/site-version.ts`, in the `SITE_VERSIONS` block.
  Each row has a plain-English name (e.g. `paymentsEnabled`, `showIndianAddress`).

## For developers (technical)

Single source of truth: `src/lib/site-version.ts`.

```ts
export const SITE_VERSIONS: Record<SiteVersion, SiteVersionConfig> = {
  local:  { currency: "INR", paymentsEnabled: true, preOrderEnabled: true,  showIndianAddress: true,  ... },
  global: { currency: "INR", paymentsEnabled: true, preOrderEnabled: false, showIndianAddress: false, ... },
};
```

**Adding a new per-version difference:**

1. Add a field to `SiteVersionConfig` (or reuse the generic
   `flags: Record<string, boolean>` map for one-off show/hide toggles —
   no interface change needed).
2. Set its value for `local` and `global` in `SITE_VERSIONS`.
3. Read it at the usage site:
   - Client component: `const { config } = useSiteVersion()` (from
     `@/components/site-version-provider`), then `config.myFlag` or
     `versionFlag("myFlag")`.
   - Server component / server action: resolve the request host first —
     `(await headers()).get("x-forwarded-host") ?? get("host")` →
     `resolveRequestSiteVersion(host)` → `getVersionConfig(version)`.
     Never branch on a hardcoded domain string.

**Related mechanics:**

- Prices: both stores price in INR, so `priceForVersion()` in
  `src/lib/money.ts` returns the stored product price for every version (the
  legacy global USD price is ignored); `formatMoney()` formats it with the
  version's locale.
- Checkout: `createOrder` prices and guards by request-host version; global
  orders are created in INR and charged through the global Razorpay account.
  Legacy orders stored in USD are refused at the Razorpay-order route (and the
  client never opens the modal for them) — customers are asked to re-order.
- Razorpay accounts: each version charges through its own account. The global
  live account requires `customer_details` (name and address) on order
  creation, so `createRazorpayOrder` forwards the checkout's contact and
  shipping details and converts the country to ISO alpha-3.
- Emails: sender domain follows the store version
  (`EMAIL_FROM_LOCAL` / `EMAIL_FROM_GLOBAL` in `src/lib/email.ts`).
- Header switch: dev flips the local preview variable; production navigates
  to `SITE_DOMAINS[other]`. Per-browser override lives in localStorage +
  the `site_version` cookie (cookie wins on the server, storage wins on
  the client after hydration).
