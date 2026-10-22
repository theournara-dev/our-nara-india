# Account, Invoices & Admin Users — Design

Date: 2026-10-22 (mileage deferred 2026-10-22)
Source: client message (verbatim below), translated into scope with the project
owner.

## Client request

> in user profile show user detials like address phone number and other details
> if they purchase right now it shows only order also show invoices and each
> purchase we need to give millege add in admin each purchase many millege we
> can give users and in admin i cant able view users list enable it if i click
> user i can view all details of user and there purchase wishlists
> wishlist button missing

## Intent

The storefront already takes orders, but the customer account is a shell: it
shows name, email, role and three hardcoded zeroes. The admin can only find a
user by typing a search term, and cannot see what that user bought or saved.

This batch turns the account into a real "my page" (details, purchases,
invoices) and the admin users area into a real customer browser.

**Mileage is deferred.** The client's sentence about points is too thin to build
against (no rule, no timing, no redemption) and the client will send a full
description. Nothing mileage-related is built in this batch.

## Confirmed decisions (owner)

1. **Profile page:** contact details are **editable** by the customer.
2. **Wishlist button:** visible **everywhere, always** (not hover-only).
3. **Invoices:** the customer can view, print and download them from their own
   order history.
4. **Mileage:** out of scope until the client supplies the full rules.

## Calls settled during review

1. **Guest orders in the admin views:** the admin list counts and the detail
   page use the same rule as the customer's own orders page
   (`userId = id` **or** `email = lower(user.email)`), so admin and customer see
   the same purchases and lifetime total.
2. **Editing the name:** `User.name` is set to `firstName + " " + lastName` on
   save **only when** the stored name is empty or still equals the previous
   concatenation. A name that was customised elsewhere is left alone, so the
   profile never silently overwrites it.

## Goals

1. A `/account/profile` page showing and editing the customer's contact
   details, with a nav entry.
2. Invoices visible to the customer inside their order history (view, print,
   download PDF), not admin-only.
3. `/admin/users` shows a paginated, searchable list of **all** users.
4. `/admin/users/[id]` shows one user's details, orders and wishlist, plus the
   existing role/permission/block controls.
5. A wishlist button on product detail pages and on every product card, always
   visible, and correct saved state after reload.
6. The account overview stops showing a fake wishlist zero and the "not enabled"
   sentence.

## Non-goals

- **All mileage work**: earning rule, admin rate setting, ledger writes,
  balances, history, checkout redemption, refunds, backfill, and the three
  pages that promise spending points. See *Deferred* below.
- Address book CRUD (`Address` table stays unused). The profile uses the address
  fields the signup already stores on `User`.
- Changing a customer's email from the profile (needs the verification flow).
- Renaming "Mileage" to "Points".
- Replacing the account's Mileage page or its nav entry; it keeps its current
  behaviour until the mileage spec lands.

## Deferred: mileage

Captured so the next pass starts from here, not from zero.

Client said: points per purchase, and the admin sets how many points a purchase
gives. Open questions for the client:

- flat points per order, points per amount spent, or both (admin picks)?
- does the amount include shipping and tax?
- credited when paid, or when delivered (and what about refunds/cancels)?
- do points expire, and can they be spent at checkout?
- one rule for both stores, or per store?
- should orders already paid get points retroactively?

Earlier owner leanings, not decisions: admin-selectable flat or per-amount;
earn-only for now; no backfill. Do not build any of this until the client
confirms.

Existing state that must not be broken meanwhile: `MileageLedger` stays empty,
`/account/mileage` keeps its empty state, and the account copy is left as it is.

## Current state (verified)

| Area | File | Fact |
|---|---|---|
| Account overview | `src/app/account/page.tsx` | Shows name/email/role; Orders count is real; **Mileage and Wishlist are hardcoded `0`**; copy says wishlisting is not enabled. |
| Account nav | `src/app/account/layout.tsx` | Overview · Orders · Wishlist · Mileage · Coupons. No Profile. |
| Account orders | `src/app/account/orders/page.tsx`, `order-card.tsx` | Items, totals, delivery address, payments, tracking. **No invoice.** Query does not include `invoice`. |
| Invoices | `src/lib/invoices.ts`, `src/lib/paid-side-effects.ts` | Issued on payment (`issueInvoiceForOrder`), idempotent via `paidSideEffectsAt`. Admin-only surfaces. `buildInvoiceView(orderId)` renders live. `InvoiceDocument` + `downloadInvoicePdf` are reusable. `fetchInvoiceView` is admin-guarded. |
| Mileage | `prisma/schema.prisma` `MileageLedger` | Model exists; **nothing writes to it**. `/account/mileage` is a hardcoded `0P`. Untouched in this batch. |
| Site settings | `SiteConfig`, `src/lib/site-content.ts`, `src/app/admin/site/actions.ts`, `src/components/admin/site/site-settings-form.tsx` | Per-store settings with a validated zod save and a sectioned form. Pattern to copy: Delivery section. |
| Admin users | `src/app/admin/users/page.tsx` | Client-only, **search required** (`authClient.admin.listUsers`), shows one selected user's role/permissions/block. No list, no pagination, no orders/wishlist. |
| Wishlist | `src/app/actions/wishlist.ts`, `src/components/theme/product-card.tsx`, `src/components/product/product-detail.tsx` | Toggle action exists (auth-aware). Heart exists **only on cards**, desktop-hover, `max-md:hidden`, local `saved` state starting `false` every load. Product detail has **no** wishlist button. |
| Profile data | `User` model, `src/lib/auth.ts` | Signup stores `firstName`, `lastName`, `country`, `addressLine1/2`, `city`, `state`, `postal`, `telephoneCode/telephone`, `mobileCode/mobile`. Nothing displays or edits them after signup. |
| Admin guard | `src/app/admin/layout.tsx` | Session + `role === "admin"` redirect already enforced. |

## Design

### 1. Customer profile

**Route:** `/account/profile` (server component, `force-dynamic`).
**Nav:** add "Profile" to `accountLinks` in `src/app/account/layout.tsx` and to
the three dropdown lists in `src/components/layout/header.tsx`.

**Shows:** name, email (read-only), username/member ID (read-only), phone,
alternate phone, address, country, and "Member since" (`createdAt`).

**Edit:** a client form over the `User` contact fields:
`firstName`, `lastName`, `mobileCode`, `mobile`, `telephoneCode`, `telephone`,
`country`, `addressLine1`, `addressLine2`, `city`, `state`, `postal`.

- Server action `updateProfile` in `src/app/account/profile/actions.ts`:
  `requireUser()`, zod-validate with `safeText`/`safeMultiline` from
  `src/lib/validation.ts`, then `db.user.update({ where: { id } })`.
- Only the signed-in user's own row; the id comes from the session, never the
  form.
- `User.name` is rewritten to `firstName + " " + lastName` only when the current
  name is empty or still equals the previous concatenation; a name customised
  elsewhere is preserved (see calls settled).
- Return a structured result (`{ ok } | { ok: false, message }`) like the
  existing actions; the form shows a toast and stays on the page.
- Empty optional fields save as `null`.
- The cart already prefills from these `User` fields
  (`src/app/cart/page.tsx`), so editing here immediately improves checkout.

**Overview counters:** real wishlist count instead of `0`; remove the
"wishlisting is not enabled" sentence. The mileage card is left exactly as it is
until the mileage spec exists.

### 2. Invoices in the account

- Include `invoice: { select: { number: true, issuedAt: true } }` in the
  account orders query and pass `invoiceNumber`/`invoiceIssuedAt` to the card.
- The card shows the invoice number beside the order number and an **Invoice**
  button when an invoice exists (confirmed orders only).
- New server action `fetchMyInvoiceView(orderId)` in
  `src/app/account/orders/actions.ts`:
  - resolve the session; reject when absent;
  - load the order and accept it only when
    `order.userId === session.user.id` **or**
    `order.email === session.user.email.toLowerCase()` (matches how the account
    already attributes guest orders);
  - then `buildInvoiceView(orderId)`.
- Reuse the existing dialog in `src/components/admin/invoice-preview.tsx` by
  adding a `variant?: "admin" | "customer"` prop:
  - admin (default): current behaviour, HSN editing, `fetchInvoiceView`;
  - customer: `fetchMyInvoiceView`, document rendered read-only, no HSN
    handlers, button label "Invoice".
  - Print and Download PDF work unchanged.

### 3. Admin users list

Replace the search-only page with a server-rendered list at `/admin/users`:

- `searchParams`: `q` (optional), `page` (default 1, 25 per page).
- `db.user.findMany` with `select` of `id, name, email, username, role, banned,
  createdAt` plus `_count: { wishlist }`; `where` on
  `name/email/username contains q, mode: insensitive` when `q` is set;
  `orderBy: createdAt desc`.
- Order counts use the customer rule (`userId = id` **or** `email = lower(email)`),
  so the list agrees with what the customer sees. Two `groupBy` queries over the
  page's 25 ids and emails (the email one restricted to `userId: null`) are
  summed per row; no order rows are loaded.
- Table columns: member, email, member ID, role badge, orders, wishlist,
  joined, blocked. Row links to `/admin/users/[id]`.
- Search box (GET form) and Previous/Next pagination with the count.
- Empty state when the store has no users yet.
- No `authClient.admin.listUsers` on this page; the list is a direct read and
  does not depend on better-auth search semantics.

### 4. Admin user detail

`/admin/users/[id]` (server component):

- `requireAdmin()` (layout already guards; the action layer must not rely on it).
- Load the user row (contact fields, role, banned, ban reason, `createdAt`,
  permissions) and `notFound()` when missing.
- Sections:
  1. **Details** — name, email, username, phone, address, joined, role.
  2. **Access & permissions** — reuse the existing `UserRow` editor
     (`src/app/admin/users/page.tsx` content moves into a client component),
     including block/unblock. Admin accounts stay read-only as today.
  3. **Orders** — latest 25: number, date, status, total, link to
     `/admin/orders/[id]`; plus lifetime count and total spent. Filtered by the
     same `userId` **or** `lower(email)` rule as `/account/orders`, so the figures
     match the customer's view.
  4. **Wishlist** — saved products with image, name, saved date, using
     `getProductsByIds` (same approach as `/account/wishlist`); empty state.
- The page is read-only apart from the existing role/permission/block controls.
- No mileage section until the mileage spec lands.

### 5. Wishlist button everywhere

**Saved state.** Add `src/components/wishlist/wishlist-provider.tsx`:
a client context holding `Set<string>` of saved product ids plus
`saved(productId)` and `toggle(productId, name)`.

- Seeded in `src/app/layout.tsx` from the session: one
  `db.wishlistItem.findMany({ where: { userId }, select: { productId: true } })`
  for signed-in users, empty for guests. Root layout is already dynamic.
- `toggle` calls the existing `toggleWishlist` action, updates the set, toasts,
  and redirects to `/login` on `reason: "auth"` — the logic currently duplicated
  in the product card.
- Wrap the app inside `SiteVersionProvider` so both header and product pages
  can read it.

**Product card** (`src/components/theme/product-card.tsx`):
- Use the provider for `saved` instead of local state (fixes the heart resetting
  to unsaved on every load).
- Remove `opacity-0 … group-hover:opacity-100` and `max-md:hidden`: the heart
  is always visible at every breakpoint.
- Keep the existing artwork (`/upload/icon_202508271427425900.png`) so the
  storefront's look does not change beyond visibility.

**Product detail** (`src/components/product/product-detail.tsx`):
- Add a wishlist button to the action row: heart icon + "WISHLIST", same height
  as Add to Cart / Buy Now, outlined style so it does not compete with the
  primary action; visible at every breakpoint.
- It sits before Add to Cart, uses the product id/name, and toggles through the
  provider. Works for pre-order and coming-soon products too (saving a product
  does not require it to be purchasable).

**Wishlist page** (`src/app/account/wishlist/wishlist-button.tsx`):
- Use the provider so hearts elsewhere update when an item is removed here.

## Edge cases

- Unpaid/failed orders: no invoice, so the card shows neither a number nor a
  button.
- Free order (`totalCents === 0`): invoice exists if confirmed and opens
  normally.
- Guest order claimed by email: visible in orders and its invoice opens; nothing
  mileage-related is involved.
- Admin list with 0 users, 1 page, or a page past the end (clamp to last page).
- Profile with no address yet: show the form with empty fields, not a broken
  block.
- Profile with a name not built from first/last: saving contact details leaves
  `User.name` as it is.
- Customer invoice action must not leak another customer's invoice; ownership
  is checked server-side, not by hiding the button.
- Wishlist toggle while signed out: no optimistic fill, redirect to login.
- Product card rendered outside the provider (if any marketing tile bypasses
  it): falls back to the existing local behaviour rather than crashing.

## Verification

- `npm run typecheck`, `npm run lint`, `npm test`.
- No migration in this batch; `prisma/schema.prisma` is unchanged.
- Manual: edit profile → reload → values persist; cart prefills the new phone
  and address.
- Manual: a confirmed order shows its invoice number and opens the document;
  print and PDF work; an unpaid order shows no invoice button.
- Manual: another customer's order id passed to the invoice action is rejected.
- Manual admin: `/admin/users` lists and paginates; detail shows only that
  user's orders and wishlist, and counts match the customer's own pages.
- Manual wishlist: heart visible on desktop and mobile, filled after reload,
  removable from the wishlist page and reflected on cards.
- Manual: Mileage pages and copy are unchanged from before the branch.

## Left to the builder

Layout/class names for the new table and detail sections, dialog markup reuse,
exact copy, and whether the profile form saves all fields in one action (assumed
yes).
