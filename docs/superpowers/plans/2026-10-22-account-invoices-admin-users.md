# Account, Invoices & Admin Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give customers a profile page with editable contact details, invoice access on their orders, and wishlist buttons everywhere; give admins a browsable user list and a full per-user detail page.

**Architecture:** Server components read through Prisma per request; mutations are `"use server"` actions that re-check the session (`requireUser`) and validate with zod + `src/lib/validation.ts`. Pure rules (order ownership, name derivation, wishlist set) live in small testable modules under `src/lib` and are shared by server pages and client components. Wishlist state moves into one client provider seeded once in the root layout, replacing per-card local state.

**Tech Stack:** Next.js 16.3 App Router, React 19, Prisma 7 + PostgreSQL, Better Auth 1.6, Tailwind, `node:test` via `node --import tsx --test tests/*.test.ts`.

**Spec:** `docs/superpowers/specs/2026-10-22-account-invoices-admin-users-design.md`

## Global Constraints

- **No schema change and no migration.** Mileage is deferred in full: do not touch `MileageLedger`, `/account/mileage`, `SiteConfig`, or any points copy that promises earning/spending.
- Admin user views use the same rule as the customer account: `userId = user.id OR (userId IS NULL AND lower(email) = lower(user.email))`.
- Customer invoice access is checked server-side on every fetch; never pass an order id from the client without the ownership check.
- Keep the existing visual language: cards `rounded-2xl border border-zinc-100 bg-white`, zinc text, `point-*` accents, existing `h-14` button heights on product detail.
- All page-level data access in server components; client components only for interaction. Validate every action input with `safeText`/`safeMultiline` inside a zod schema and `parseInput`.
- No new dependencies. Tests use `node:test` + `node:assert/strict`; run `npm test`, `npm run typecheck`, `npm run lint`.

## Review Focus

Each line is pinned by a test or a verification step in the owning task.

1. **Wrong person sees an order.** A guest order attributed only by email must be readable by the matching account and by nobody else, and must stay invisible when it carries another user's `userId`. → Task 1 test, Task 3 step 3.
2. **Editing a profile wipes the display name or leaves stale values.** Optional fields cleared to empty must persist as null; a name the user set themselves must survive contact edits. → Task 1 test, Task 2 step 8.
3. **Heart state drifts from the server.** Toggling the same product twice, or opening a second card for the same product, must not duplicate ids or show a filled heart for an unsaved product. → Task 1 test, Task 4 steps.
4. **Unpaid orders offer an invoice.** Pending/guest orders without an `Invoice` row must show no invoice affordance and `fetchMyInvoiceView` must answer `ok:false` instead of throwing. → Task 3 step 8 verification.
5. **Admin cannot reach a user.** Search text with different casing, users with no orders, page numbers past the end, and a deleted id must all behave predictably (empty state, clamped page, 404) rather than crash. → Task 5/6 verification steps.

---

### Task 1: Pure rules for ownership, names and wishlist sets

**Files:**
- Create: `src/lib/order-ownership.ts`
- Create: `src/lib/profile.ts`
- Create: `src/lib/wishlist.ts`
- Test: `tests/account-ownership.test.ts`
- Test: `tests/profile.test.ts`
- Test: `tests/wishlist.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `orderBelongsToUser(order: { userId: string | null; email: string }, user: { id: string; email: string }): boolean`
  - `orderAccountWhere(user: { id: string; email: string }): { OR: [{ userId: string }, { email: string }] }`
  - `nextUserName(currentName: string, previousFirst: string | null, previousLast: string | null, nextFirst: string, nextLast: string): string`
  - `withSaved(ids: string[], productId: string, saved: boolean): string[]`

- [ ] **Step 1: Write the failing tests**

`tests/account-ownership.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { orderAccountWhere, orderBelongsToUser } from "../src/lib/order-ownership";

const user = { id: "u2", email: "a@example.com" };

test("an order belongs to its owner, or to the account matching a guest order's email", () => {
  assert.equal(orderBelongsToUser({ userId: "u2", email: "other@example.com" }, user), true);
  assert.equal(orderBelongsToUser({ userId: null, email: "A@Example.com" }, user), true);
  assert.equal(orderBelongsToUser({ userId: "u3", email: "a@example.com" }, user), false);
  assert.equal(orderBelongsToUser({ userId: null, email: "b@example.com" }, user), false);
});

test("the account where clause lowercases the email", () => {
  assert.deepEqual(orderAccountWhere({ id: "u2", email: "A@Example.com" }), {
    OR: [{ userId: "u2" }, { email: "a@example.com" }],
  });
});
```

`tests/profile.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { nextUserName } from "../src/lib/profile";

test("the display name follows the contact name until the user customises it", () => {
  assert.equal(nextUserName("Jane Doe", "Jane", "Doe", "Janet", "Doe"), "Janet Doe");
  assert.equal(nextUserName("", null, null, "Janet", "Doe"), "Janet Doe");
  assert.equal(nextUserName("JD", "Jane", "Doe", "Janet", "Doe"), "JD");
});
```

`tests/wishlist.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { withSaved } from "../src/lib/wishlist";

test("saving is idempotent and removing only drops the named product", () => {
  assert.deepEqual(withSaved([], "p1", true), ["p1"]);
  assert.deepEqual(withSaved(["p1", "p2"], "p1", true), ["p1", "p2"]);
  assert.deepEqual(withSaved(["p1", "p2"], "p1", false), ["p2"]);
  assert.deepEqual(withSaved(["p1"], "p9", false), ["p1"]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — module not found for `../src/lib/order-ownership` (and the other two).

- [ ] **Step 3: Implement the three modules**

`orderBelongsToUser`: return `order.userId === user.id || (order.userId === null && order.email.toLowerCase() === user.email.toLowerCase())`.

`orderAccountWhere`: return `{ OR: [{ userId: user.id }, { email: user.email.toLowerCase() }] }`.

`nextUserName`: build `const next = [nextFirst, nextLast].map(value => value.trim()).filter(Boolean).join(" ")`. Return `next` when `currentName.trim() === ""` or `currentName.trim() === [previousFirst, previousLast].map(v => (v ?? "").trim()).filter(Boolean).join(" ")`; otherwise return `currentName`.

`withSaved`: when `saved`, return `ids.includes(productId) ? ids : [...ids, productId]`; otherwise `ids.filter(id => id !== productId)`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, three new test files green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/order-ownership.ts src/lib/profile.ts src/lib/wishlist.ts tests/account-ownership.test.ts tests/profile.test.ts tests/wishlist.test.ts
git commit -m "feat: add account ownership, profile name and wishlist set rules"
```

---

### Task 2: Customer profile page and editable contact details

**Files:**
- Create: `src/app/account/profile/page.tsx`
- Create: `src/app/account/profile/profile-form.tsx`
- Create: `src/app/account/profile/actions.ts`
- Modify: `src/app/account/layout.tsx` (nav array)
- Modify: `src/app/account/page.tsx` (overview copy and Profile entry)
- Test: `tests/profile.test.ts` (from Task 1)

**Interfaces:**
- Consumes: `nextUserName` (Task 1), `requireUser`/`getCurrentUser` (`src/lib/auth.ts`), `safeText`/`parseInput` (`src/lib/validation.ts`), `CountrySelect` (`src/components/ui/country-select.tsx`).
- Produces:
  - `updateProfile(input: unknown): Promise<{ ok: true } | { ok: false; message: string }>` in `src/app/account/profile/actions.ts`.
  - `ProfileForm({ initial }: { initial: ProfileFields })` where `ProfileFields = { firstName: string; lastName: string; country: string; addressLine1: string; addressLine2: string; city: string; state: string; postal: string; telephoneCode: string; telephone: string; mobileCode: string; mobile: string }`.

- [ ] **Step 1: Write the action**

`actions.ts`: `"use server"`. Schema (zod) with `safeText` for each field: firstName/lastName 1–80 required, country 2–80 required, addressLine1 1–200 required, addressLine2 max 200 optional, city 1–100 required, state max 100 optional, postal max 20 required, telephoneCode/mobileCode max 8 optional, telephone/mobile max 30 optional. Load the current row with `db.user.findUnique({ where: { id }, select: { firstName: true, lastName: true, name: true } })`, then `db.user.update` with trimmed values (empty optional → `null`) and `name: nextUserName(...)`. Return `{ ok: true }`; catch and return `{ ok: false, message: "Could not save your details." }`. `revalidatePath("/account", "layout")`.

- [ ] **Step 2: Write the profile page**

Server component, `export const dynamic = "force-dynamic"`. Resolve the session with `auth.api.getSession({ headers: await headers() })` in try/catch, redirect to `/login?session=expired` when absent. Read the contact columns from `db.user.findUnique`, map nulls to `""`, render an `<h1>`/intro plus `ProfileForm`. Show email and member ID as read-only text above the form.

- [ ] **Step 3: Write the form**

Client component with controlled inputs for the `ProfileFields` keys, `CountrySelect` bound to `country` whose `onChange` sets `country` and both phone codes to `country.phone` (same as `src/app/join/page.tsx`). Submit with `useTransition`, call `updateProfile(fields)`, `notify.success("Profile", "Your details were saved.")` / `notify.error("Profile", res.message)` from `src/lib/toast.ts`, then `router.refresh()`. Buttons and inputs reuse the join page's classes.

- [ ] **Step 4: Add Profile to account navigation**

In `src/app/account/layout.tsx` insert `{ label: "Profile", href: "/account/profile" }` after Overview. In `src/app/account/page.tsx`, replace the closing "Wishlists will be available…" copy with a link to `/account/profile` reading "Update your contact and delivery details", and make the wishlist card link to `/account/wishlist` (count stays untouched here — Task 4 makes it real).

- [ ] **Step 5: Verify in the running app**

Run `npm run typecheck` then with `npm run dev` open `/account/profile`, save a change with `addressLine2` empty, and confirm the value clears and the header name is unchanged when it was customised. Expected: no error, values round-trip.

- [ ] **Step 6: Commit**

```bash
git add src/app/account/profile src/app/account/layout.tsx src/app/account/page.tsx
git commit -m "feat: add customer profile with editable contact details"
```

---

### Task 3: Invoices on customer orders

**Files:**
- Create: `src/app/account/orders/invoice-actions.ts`
- Modify: `src/app/account/orders/page.tsx` (include invoice, pass to card)
- Modify: `src/app/account/orders/order-card.tsx` (invoice number + button)
- Modify: `src/components/admin/invoice-preview.tsx` (variant prop)
- Test: `tests/account-ownership.test.ts` (from Task 1)

**Interfaces:**
- Consumes: `orderBelongsToUser` (Task 1), `buildInvoiceView`/`InvoiceView` (`src/lib/invoices.ts`), `InvoicePreviewButton` (`src/components/admin/invoice-preview.tsx`), `requireUser`.
- Produces:
  - `fetchMyInvoiceView(orderId: string): Promise<{ ok: true; view: InvoiceView } | { ok: false; message: string }>`
  - `InvoicePreviewButton` accepts `variant?: "admin" | "customer"` (default `"admin"`); customer variant hides HSN editing and uses `fetchMyInvoiceView`.
  - `AccountOrder` gains `invoice: { number: string; issuedAt: string } | null`.

- [ ] **Step 1: Write the customer invoice action**

`invoice-actions.ts`: `"use server"`. `requireUser()`, load `db.order.findUnique({ where: { id: orderId }, select: { userId: true, email: true } })`, return `{ ok: false, message: "Order not found." }` when missing or `!orderBelongsToUser(...)`. Then `buildInvoiceView(orderId)`; when null return `{ ok: false, message: "No invoice has been issued for this order." }`. Catch errors into `{ ok: false, message: "Could not load the invoice." }`.

- [ ] **Step 2: Include the invoice in the orders query**

In `src/app/account/orders/page.tsx` add `invoice: { select: { number: true, issuedAt: true } }` to the include block, map to `invoice: order.invoice ? { number, issuedAt: toISOString() } : null` and pass it into `AccountOrder`.

- [ ] **Step 3: Show the invoice on the card**

Add the `invoice` field to `AccountOrder` in `src/app/account/orders/order-card.tsx`. In the collapsed summary (inside the existing `<button>`, no nested button) show the invoice number as text next to the order number when present. In the expanded body add a final "Invoice" section: when `invoice` exists render `<InvoicePreviewButton orderId={order.id} orderNumber={order.orderNumber} variant="customer" />` plus the issue date; when null render nothing.

- [ ] **Step 4: Add the customer variant to the preview dialog**

In `src/components/admin/invoice-preview.tsx` add the `variant` prop. Pick the fetcher: `variant === "customer" ? fetchMyInvoiceView : fetchInvoiceView`; import both actions. Pass `onHsnChange` only for `variant === "admin"` so the customer view is read-only, and keep the trigger label "Invoice" for the customer variant ("Preview" for admin). Keep Print/Download available.

- [ ] **Step 5: Run checks**

Run: `npm test && npm run typecheck`.
Expected: PASS; no type errors from the widened `AccountOrder`.

- [ ] **Step 6: Verify ownership and the no-invoice case**

With `npm run dev`: as a signed-in customer whose order was placed as a guest with the same email, confirm the invoice opens and the PDF downloads. Open the same order id as a different customer (or signed out) and confirm `fetchMyInvoiceView` reports `Order not found.` Confirm a pending order without an invoice shows no Invoice section. Expected: no crash, no data leak.

- [ ] **Step 7: Commit**

```bash
git add src/app/account/orders src/components/admin/invoice-preview.tsx
git commit -m "feat: show issued invoices on customer orders"
```

---

### Task 4: Wishlist button everywhere with shared state

**Files:**
- Create: `src/components/wishlist-provider.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/theme/product-card.tsx`
- Modify: `src/components/product/product-detail.tsx` (action row at line ~550)
- Modify: `src/app/account/wishlist/wishlist-button.tsx`
- Modify: `src/app/account/page.tsx` (real wishlist count)
- Test: `tests/wishlist.test.ts` (from Task 1)

**Interfaces:**
- Consumes: `withSaved` (Task 1), `getCurrentUser`/`auth` (`src/lib/auth.ts`), `toggleWishlist` (`src/app/actions/wishlist.ts`).
- Produces:
  - `WishlistProvider({ saved, children }: { saved: string[]; children: React.ReactNode })` and `useWishlist(): { saved: string[]; isSaved(productId: string): boolean; setSaved(productId: string, saved: boolean): void }`; `useWishlist` throws outside the provider (same precedent as `useSiteVersion`).

- [ ] **Step 1: Create the provider**

Client component holding `useState<string[]>(saved)`. `setSaved` uses `withSaved`; `isSaved` uses `saved.includes(productId)`. Expose via context; throw `new Error("useWishlist must be used inside WishlistProvider")` when missing.

- [ ] **Step 2: Seed it in the root layout**

In `src/app/layout.tsx`, `const user = await getCurrentUser()`, then when present `const saved = await db.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } })`. Wrap the existing provider tree (`SiteVersionProvider > CartProvider > …`) with `<WishlistProvider saved={ids}>` inside `SiteVersionProvider`. Pass `[]` for signed-out visitors.

- [ ] **Step 3: Fix the product card heart**

In `src/components/theme/product-card.tsx` remove the local `saved` state and use `const { isSaved, setSaved } = useWishlist()`; on toggle success call `setSaved(product.id, res.saved)` (keep the login redirect on `reason === "auth"` and the existing success/error toasts). Make the quick-actions container always visible: replace `"absolute bottom-2 -right-50 z-10 flex flex-col gap-1 opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100 group-hover:right-2 max-md:hidden"` with `"absolute bottom-2 right-2 z-10 flex flex-col gap-1"`. Keep the existing icons, sizes, `aria-label` and `aria-pressed`.

- [ ] **Step 4: Add the wishlist button to the product detail page**

Find the action row in `src/components/product/product-detail.tsx` (`<div className="mt-4 flex gap-2">`, line ~550) and insert before ADD TO CART an outlined button with the heart icon, text `SAVE` / `SAVED`, `border border-point-500 text-point-600 h-14 px-4`, `aria-pressed`, driven by `useWishlist()` and the same `toggleWishlist` handler/toasts. Keep Add to Cart / Buy Now widths intact by letting it size to content.

- [ ] **Step 5: Keep the account wishlist page in sync**

In `src/app/account/wishlist/wishlist-button.tsx` call `useWishlist().setSaved(productId, false)` on success in addition to `router.refresh()`. In `src/app/account/page.tsx` replace the hardcoded wishlist `0` with `db.wishlistItem.count({ where: { userId: session.user.id } })`.

- [ ] **Step 6: Run checks**

Run: `npm test && npm run typecheck && npm run lint`.
Expected: PASS.

- [ ] **Step 7: Verify in the app**

Signed in: hearts show correctly on first paint, on mobile width, on the detail page; saving twice leaves one row; removing on `/account/wishlist` leaves the card heart empty after refresh; signed out, tapping a heart goes to `/login`.
Expected: no duplicate rows, no stale filled hearts.

- [ ] **Step 8: Commit**

```bash
git add src/components/wishlist-provider.tsx src/app/layout.tsx src/components/theme/product-card.tsx src/components/product/product-detail.tsx src/app/account/wishlist/wishlist-button.tsx src/app/account/page.tsx
git commit -m "feat: share wishlist state and show wishlist buttons everywhere"
```

---

### Task 5: Admin users list

**Files:**
- Create: `src/app/admin/users/user-access.tsx`
- Rewrite: `src/app/admin/users/page.tsx`
- Test: none (server list; verified in step 6)

**Interfaces:**
- Consumes: `requireAdmin` indirectly via `src/app/admin/layout.tsx`, `db`, `statement`/`getEffectivePermissions` (`src/lib/permissions.ts`).
- Produces:
  - `UserAccess({ user }: { user: AdminUser })` — the existing role select, block/unblock and permission editor moved verbatim.
  - `AdminUserRow = { id: string; name: string; email: string; username: string | null; role: string; banned: boolean; createdAt: Date; orderCount: number; wishlistCount: number }`.

- [ ] **Step 1: Extract the access editor**

Create `user-access.tsx` (`"use client"`) and move `UserRow`, `RoleBadge`, `ROLES`, `ROLE_BADGE` and the permission save logic out of `page.tsx` unchanged, renaming `UserRow` to `UserAccess` and keeping every `authClient.admin.*` call and toast exactly as-is.

- [ ] **Step 2: Rewrite the page as a server component**

`page.tsx`: no `"use client"`. `searchParams: Promise<{ q?: string; page?: string }>`; `const q = (await searchParams).q?.trim() ?? ""`. `PAGE_SIZE = 25`; page clamped to `>= 1`. Query `db.user.findMany` where `q` matches `OR: [{ name: { contains: q, mode: "insensitive" } }, { email: … }, { username: … }]`, `orderBy: { createdAt: "desc" }`, `skip`/`take`, plus `db.user.count` for the same where. For the page's ids, `db.order.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _count: true })` and `db.wishlistItem.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _count: true })`; add guest orders with `db.order.groupBy({ by: ["email"], where: { userId: null, email: { in: emails } }, _count: true })` and match by lowercased email. Render a search `<form method="get">` (input name `q`), a table with Name/Email/Joined/Role/Orders/Wishlist/Status columns, each row linking to `/admin/users/[id]`, and Prev/Next pagination copied from `src/app/admin/orders/page.tsx` with `href(overrides)` preserving `q`. Empty state: "No users match this search."

- [ ] **Step 3: Preserve the page heading and admin shell**

Keep the existing heading ("Users & Permissions") and description at the top, plus a note that selecting a user opens their full details. Nothing in `src/app/admin/layout.tsx` or `admin-nav.tsx` changes.

- [ ] **Step 4: Run checks**

Run: `npm run typecheck && npm run lint`.
Expected: PASS.

- [ ] **Step 5: Verify in the app**

`/admin/users` lists users with no search; search `Q` finds uppercase/lowercase matches; page 2 works; a user with no orders shows `0`; clicking a row goes to the detail page. Expected: no redirect loop, no crash on empty results or page past the end.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/users
git commit -m "feat: add browsable, searchable admin users list"
```

---

### Task 6: Admin user detail

**Files:**
- Create: `src/app/admin/users/[id]/page.tsx`
- Modify: `src/app/admin/users/user-access.tsx` (export a small `AdminUser` type if not already exported)
- Test: none (server page; verified in step 5)

**Interfaces:**
- Consumes: `UserAccess` (Task 5), `orderAccountWhere` (Task 1), `formatMoney`/`formatDate` helpers already used in `src/app/admin/orders/page.tsx`.
- Produces: route `/admin/users/[id]`.

- [ ] **Step 1: Write the page shell and access editor**

`params: Promise<{ id: string }>`; `export const dynamic = "force-dynamic"`. `db.user.findUnique({ where: { id } })`, `notFound()` when null. Render the name, email, role badge and a "Back to users" link, then `<UserAccess user={…} />` in a `rounded-2xl border border-zinc-100 bg-white` card.

- [ ] **Step 2: Add the details card**

Show member since (`createdAt`), username, and contact fields (name, phone with code, full address, country) as a definition list, showing "Not provided" for nulls. Include sign-in identifiers: email verified state and any `banReason`/`banExpires`.

- [ ] **Step 3: Add purchases**

`const accountWhere = orderAccountWhere(user)`. Latest 25: `db.order.findMany({ where: accountWhere, orderBy: { createdAt: "desc" }, take: 25, select: { id, orderNumber, createdAt, status, totalCents, currency } })`, and lifetime `db.order.aggregate({ where: accountWhere, _count: true, _sum: { totalCents: true } })`. Table links each row to `/admin/orders/[id]`; footer shows "Showing latest 25 of N" and lifetime value, plus an empty state.

- [ ] **Step 4: Add the wishlist**

`db.wishlistItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { productId: true, createdAt: true } })`, then `db.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, slug: true, priceCents: true, currency: true, images: true } })` (`images` is `String[]`). List name/price/link to the storefront product and the saved date; "No saved products." when empty. Do not use `getProductsByIds`, which filters by store version.

- [ ] **Step 5: Run checks and verify**

Run: `npm run typecheck && npm run lint`. Then in the app open a user with orders, one without, and a non-existent id. Expected: details/orders/wishlist render, empty states show, unknown id renders the 404 page.

- [ ] **Step 6: Commit**

```bash
git add "src/app/admin/users/[id]" src/app/admin/users/user-access.tsx
git commit -m "feat: add admin user detail with orders and wishlist"
```

---

## Self-Review Notes

- Spec coverage: profile (Task 2), customer invoices (Task 3), admin list (Task 5), admin detail (Task 6), wishlist everywhere (Task 4), deferred mileage untouched (Global Constraints). Overview wishlist counter real (Task 4 step 5). Nav links (Task 2).
- No schema change, no migration, no new dependency.
- Name consistency: `orderBelongsToUser`/`orderAccountWhere` used by Tasks 3 and 6; `withSaved` by Task 4; `InvoicePreviewButton` variant consumed only by Task 3.
