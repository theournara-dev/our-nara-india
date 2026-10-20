# Product discounts — design

Date: 2026-10-20
Status: approved 2026-10-20
Scope: one feature — automatic discounts on products, brands, categories or the whole catalog, with an admin page.

This is the design, not the implementation plan. It fixes the behaviour and the
data so the build cannot drift between the product card, the product page, the
cart and checkout.

## Intent

The client wants to run sales without editing each product's price. Admins create
a discount, point it at one product, a brand, a category or everything, and set
either a percentage or a flat amount. The storefront shows the reduced price and
which offers apply. The order keeps the discount it was charged, even if the
discount is edited or deleted later.

This replaces the removed `compareAtCents` fields. The old "was" price is now
derived from the regular product price whenever a discount applies.

## Decisions (from the client)

1. When several discounts cover one product, the one worth the most to the
   shopper applies. The product page lists every eligible discount; the applied
   one is normal, the others are struck through.
2. Start and end are optional. No start = already started; no end = never ends.
3. A discount belongs to one storefront or both: `all` (default), `local`,
   `global`.
4. Money order: product discount → discounted subtotal → coupon → shipping.
   Coupon minimums are measured on the discounted subtotal.
5. Percentages apply to the resolved unit price (variant override included),
   rounded to the nearest paise; flat amounts are per unit and clamp at zero.
6. The discount is not linked to the order. The order line stores the values it
   was charged, so old orders keep their numbers after edits or deletion.
7. Deleting a discount is a soft delete. The admin list keeps deleted rows and
   offers a hard delete button.
8. Two titles: a customer-facing title (required) and an internal admin note
   (optional).
9. Checkout compares the cart's expected total — goods after product discounts,
   coupon and shipping — with the server's current total. When they differ,
   checkout returns the current values instead of creating the order. The cart
   applies the new line prices and coupon state, shows a notification, and the
   shopper places the order again. Nothing is charged on the mismatch.
10. Free orders are supported. When the server total is ₹0, checkout skips
    Razorpay and completes the PENDING order through a guarded action that runs
    the existing paid side effects. Admins see a "Free order" marker plus the
    line and coupon values that explain it.

Calls made in this design, open to challenge:

- The full list of eligible discounts appears on the product page only. Product
  cards, wishlist and banner cards show a single badge for the applied discount
  to avoid turning every card into an offer list.
- One product per discount row. To discount several products, create several
  rows. (The brand/category/all scopes cover the bulk cases.)
- A discount on a category also covers products in its direct child categories,
  mirroring how category listing pages resolve products.
- Hard delete is only offered for rows that are already soft-deleted. A live
  discount must be soft-deleted first, so a permanent delete is never one
  accidental click away.
- No restore action. A deleted discount can be recreated if needed.
- The price-change update is never applied silently and never followed by an
  automatic retry. The shopper sees the new total and presses "Place order"
  again, so the amount charged is always the amount on screen.
- A coupon that stops qualifying is part of the same update: the quote carries
  the undiscounted total and the reason, and the cart clears the code rather
  than failing with a separate error.
- Free orders need no schema column: `totalCents === 0` is the marker, and the
  line snapshots plus the coupon discount explain the amount.

## Data model

### `Discount`

```prisma
enum DiscountType {
  PERCENT
  FIXED
}

enum DiscountScope {
  ALL
  BRAND
  CATEGORY
  PRODUCT
}

model Discount {
  id          String        @id @default(cuid())
  /// Customer-facing label, e.g. "Monsoon Sale". Required.
  title       String
  /// Internal hint for admins. Never shown to shoppers.
  adminNote   String?       @map("admin_note")
  type        DiscountType
  /// PERCENT: 1..100. FIXED: minor units (paise), > 0.
  value       Int
  scope       DiscountScope @default(ALL)
  brandId     String?       @map("brand_id")
  categoryId  String?       @map("category_id")
  productId   String?       @map("product_id")
  /// "all" | "local" | "global", same convention as Coupon.
  siteVersion String        @default("all") @map("site_version")
  startsAt    DateTime?     @map("starts_at")
  endsAt      DateTime?     @map("ends_at")
  isActive    Boolean       @default(true) @map("is_active")
  deletedAt   DateTime?     @map("deleted_at")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  brand    Brand?    @relation(fields: [brandId], references: [id], onDelete: Cascade)
  category Category? @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  product  Product?  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([siteVersion, deletedAt])
  @@index([productId])
  @@index([brandId])
  @@index([categoryId])
  @@map("discounts")
}
```

Add `discounts Discount[]` to `Brand`, `Category` and `Product`.

Status is derived, not stored:

- `deletedAt != null` → Deleted
- `!isActive` → Paused
- now before `startsAt` → Scheduled
- now after `endsAt` → Expired
- otherwise → Active

Boundaries are inclusive: a discount starting exactly now applies; one ending
exactly now still applies for that instant. The same `Date` comparison as
coupons.

### `OrderItem` snapshot

```prisma
  /// Unit price before the product discount, as charged at checkout. Null when
  /// no product discount applied. Not a relation: editing/deleting the
  /// discount must never change an old order.
  listPriceCents Int?    @map("list_price_cents")
  /// Customer-facing discount title at checkout. Null when none applied.
  discountTitle  String? @map("discount_title")
```

No `discountId` column and no foreign key, deliberately.

## Pricing rules

One pure module, `src/lib/discounts.ts`, used by the storefront and checkout.
No Prisma import, so the product page can recompute when the variant changes.

```ts
type SiteVersion = "local" | "global";

interface DiscountRecord {
  id: string;
  title: string;
  type: "PERCENT" | "FIXED";
  value: number;
  scope: "ALL" | "BRAND" | "CATEGORY" | "PRODUCT";
  brandId: string | null;
  categoryId: string | null;
  productId: string | null;
  siteVersion: "all" | "local" | "global";
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}

interface DiscountTarget {
  productId: string;
  brandId: string;
  /** Primary category, its parent, every subcategory and every subcategory's parent. */
  categoryIds: string[];
}

interface DiscountOption {
  discount: DiscountRecord;
  amountCents: number;
}

interface ResolvedPrice {
  listCents: number;
  chargedCents: number;
  applied: DiscountRecord | null;
  amountCents: number;
  /** Every eligible discount, best first. Includes the applied one. */
  options: DiscountOption[];
}

function resolvePrice(
  listCents: number,
  target: DiscountTarget,
  discounts: DiscountRecord[],
  version: SiteVersion,
  now?: Date,
): ResolvedPrice;
```

Algorithm:

1. Keep a discount only when `deletedAt == null`, `isActive`, the window contains
   `now`, and `siteVersion` is `"all"` or equals `version`.
2. Scope match: `ALL`; `PRODUCT` with `productId === target.productId`;
   `BRAND` with `brandId === target.brandId`; `CATEGORY` with
   `target.categoryIds.includes(categoryId)`.
3. Amount per unit: `PERCENT` → `Math.round(listCents * value / 100)`;
   `FIXED` → `min(value, listCents)`. Drop amounts `<= 0`.
4. Sort by amount descending, then scope specificity (PRODUCT 3, CATEGORY 2,
   BRAND 1, ALL 0) descending, then `createdAt` descending, then `id`. This
   makes ties deterministic: the more specific, newer discount is the one shown
   as applied.
5. `applied = options[0] ?? null`; `chargedCents = max(0, listCents - amount)`.

Flat amounts are per unit, not per line. A percentage never exceeds 100.

The category target list is built from the product query: primary `categoryId`,
the primary category's `parentId`, every `ProductSubcategory.categoryId`, and
each of those categories' `parentId`. Dedupe. This mirrors category pages, which
match a top-level slug against `category.slug` or `subcategory.category.parent.slug`.

### Server loader

`src/lib/discount-store.ts` (server-only):

```ts
const getLiveDiscounts = cache(async (): Promise<DiscountRecord[]> =>
  db.discount.findMany({
    where: { deletedAt: null, isActive: true },
    // Public fields only: this list reaches the product page's client code.
    // adminNote must never leave the admin.
    select: {
      id: true, title: true, type: true, value: true, scope: true,
      brandId: true, categoryId: true, productId: true, siteVersion: true,
      startsAt: true, endsAt: true, isActive: true, deletedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  }).then((rows) => rows.filter(isDiscountLive)),
);
```

`cache()` (React) dedupes within one request. Filters by store/scope happen in
`resolvePrice`. The set is admin-sized; loading it once per request is cheaper
than joining it into every product query. `adminNote` is read only by the admin
page/actions, which query the table directly.

### Checkout quote

The mismatch response needs the new values in a typed shape shared by the server
action, the checkout client and the cart. `src/lib/cart-quote.ts` (types plus
one pure apply function):

```ts
interface CartQuoteLine {
  productId: string;
  variantId: string | null;
  listPriceCents: number;          // regular unit price, active store
  chargedPriceCents: number;       // after the applied discount
  globalListPriceCents: number;
  globalChargedPriceCents: number;
  discountTitle: string | null;
}

interface CartQuote {
  lines: CartQuoteLine[];
  subtotalCents: number;           // discounted goods
  coupon: {
    code: string | null;
    valid: boolean;
    reason?: string;
    discountCents: number;
    freeShipping: boolean;
    title: string | null;
  };
  shippingCents: number;
  totalCents: number;
}

/** Replace matching cart lines' stored prices; returns a new array. */
function applyQuote(items: CartItem[], quote: CartQuote): CartItem[];
```

The quote carries both stores' prices, like a card, so applying it cannot leave
the other store stale. Lines match by `productId` + `variantId` (`CartItem.option`);
a cart line the quote does not contain is left untouched (it was not part of the
order the server priced).

## Storefront

### Product card and other listings

Add to `ProductCard` (and `ProductCardView` for the static fallback):

```ts
/** Local price after the best local/all discount. */
effectivePriceCents: number;
/** Global price after the best global/all discount (falls back to the local list price). */
effectiveGlobalPriceCents: number;
/** Applied discount per store, for the card badge. */
discountsByStore: {
  local: DiscountBadge | null;
  global: DiscountBadge | null;
};
// DiscountBadge = { title: string; amountCents: number; percentOff: number | null }
```

Keep `priceCents` and `globalPriceCents` as the regular prices, so the product
page can show the crossed-out original. `toCard` resolves both stores with
`resolvePrice` (local target/price and global target/price) and fills both
badges. The card reads `useSiteVersion().version` and picks the matching badge,
so the in-place store switch (popup / dev toggle, no navigation) updates price
and badge together.

Every display that currently calls
`priceForVersion(product.priceCents, product.globalPriceCents)` switches to
`priceForVersion(product.effectivePriceCents, product.effectiveGlobalPriceCents)`:

- `src/components/theme/product-card.tsx`
- `src/components/content/triple-banner.tsx`
- `src/app/account/wishlist/page.tsx`
- `src/app/products/[slug]/page.tsx` (JSON-LD `offers.price`)
- `src/app/cart/page.tsx`, `src/components/cart/quick-purchase-sheet.tsx` read
  cart lines, which already hold charged prices, so no change there.

Card UI: when the active store's badge exists, show the charged price and a
small pill next to it — `−20%` for percent, `−₹200` for flat — with the customer
title as the element's `title` attribute. No list of other discounts on cards.

`src/data/catalog.ts` stays discount-free (it is a static offline fallback):
`effectivePriceCents = priceCents`, `effectiveGlobalPriceCents =
globalPriceCents ?? priceCents`, no `discount`.

### Product page

`ProductDetail` gets:

- `effectivePriceCents`, `effectiveGlobalPriceCents` (default price, for the
  server-rendered price and JSON-LD)
- `discounts: DiscountRecord[]` — live and covering this product, **both
  stores**; `resolvePrice` filters by the selected `version`
- `discountTarget: DiscountTarget` (or the raw ids needed to build it)
- variants keep their raw prices; the page recomputes with `resolvePrice` on
  every variant change. The same records serve an in-place store switch, so the
  badge and note always describe the price on screen.

Price block:

- No discount: current price only (today's markup).
- Discount: regular price struck through, charged price prominent, plus a
  badge carrying the customer title and the saving (`−20%` / `−₹200`).
- If `options.length > 1`, a small note under the price lists every eligible
  title. The applied one is normal weight; the others are `line-through` and
  muted. One line, wraps on mobile. This is the "badge note" the client asked
  for. It is visible without interaction.
- The discount list and amounts recompute when a variant is selected, because a
  flat discount or a different variant price can change the winner.

`thisLineCents` (shipping estimate) uses the charged price.

`handleBuyNow` passes the charged local and global prices for the selected
variant, so the cart line holds what the shopper saw. `addProductToCart` accepts
`effectivePriceCents` / `effectiveGlobalPriceCents` and prefers them; the card's
quick-purchase path must pass them too, or a discounted item added by hover
stores the regular price and fails checkout's guard.

Coupons hint: unchanged. Product discounts and coupons can combine per decision
4; the hint never claims the final price.

### Cart

No new `CartItem` fields. The line stores the charged prices in `priceCents` /
`globalPriceCents` at add time, so totals and formatting stay as they are.

The cart computes the total it shows exactly as the server does: discounted
subtotal from the stored charged prices, coupon discount from `AppliedCoupon`,
then `computeShippingCents` / free shipping. That total is sent to checkout as
`expectedTotalCents`.

When the server's current total differs, `createOrder` returns `CART_CHANGED`
with a `CartQuote` and does not create an order. The cart then:

1. `setCart(applyQuote(items, quote))` — every line takes the server's charged
   prices for both stores.
2. Replaces `appliedCoupon` with the quote's coupon when `valid`, or clears it
   when not.
3. Shows an informational toast: "Prices changed — we updated your cart with the
   current prices and offers. Review the total, then place your order again."
4. Stops. It does not re-open Razorpay or retry on its own; the shopper presses
   "Place order" again and the now-matching guard lets it through.

The cart still shows the charged price only: no crossed-out price and no offer
list. The notification is the one place the shopper learns why the total moved.

### Listings, filters and price sort

`src/data/products.ts`:

- Load `getLiveDiscounts()` once per request and pass it to `toCard`/`toDetail`.
- Delete `listingPriceWhere` from the SQL `where`; discounted prices cannot be
  filtered in SQL without duplicating the rules.
- In `getProductListing`, when a price filter (`minRupees`/`maxRupees`) or a
  price sort (`lowest`/`highest`) is present, load all matching rows, map to
  cards (which resolves discounts), filter/sort on the effective price for the
  version, then paginate. Compute `total` from the filtered set. Reuse the
  existing rupee rounding: compare `Math.round(cents / 100)` against the
  inclusive min/max.
- For other sorts, keep the current DB count + page query and map afterwards.
- Price facets and bounds use the effective prices, so the toolbar cannot
  contradict the cards.
- When a price filter is active, recompute `brandFacets` and
  `availabilityFacets` from the filtered, mapped cards. Today the price
  predicate feeds those counts through `listingWhere`; deleting it from SQL
  without this would leave brand chips counting products the grid no longer
  shows.

This trades a query for correctness. The catalog is small; add a
`shortcut:` comment saying to move price filtering into SQL if the catalog grows
past a few thousand products.

### Known surfaces without discounts

- `src/data/shorts.ts` / `shorts-carousel.tsx`: prices are hardcoded static
  content, not product records. Left alone; a pick can show a price that differs
  from a discounted product. Follow-up if the client cares.
- `/recent-view`: renders the static catalog by slug, so it shows regular prices.
- Static home fallback and `/llms.txt`: static catalog, no discounts.
- Admin product table and product form: regular prices, unchanged.

## Admin

Route `/admin/discounts`, nav entry next to Coupons.

Page loads: all discounts including soft-deleted (`orderBy createdAt desc`),
brands, categories (with parent for labels), products (id, name).

List columns: customer title (internal note as a muted second line), value
(`20%` or `₹200`), scope + target, store, window (`Always` / dates), status badge,
actions. Deleted rows are muted, carry a "Deleted" badge, and show only the hard
delete action (plus view). Live rows show Edit, Pause/Resume, Soft delete.

Editor fields:

- Customer title — required, trimmed, max 120.
- Admin note — optional, max 500.
- Type — Percent / Flat.
- Value — percent integer 1..100, or rupees converted to paise (> 0).
- Scope — All products / Brand / Category / Product; switching scope clears the
  other target ids. The target select appears only for the chosen scope.
- Store — All / India / International (`all` / `local` / `global`).
- Starts at, Ends at — optional `datetime-local`, stored as `Date`; if both set,
  end must be after start.
- Active — toggle.

Server actions in `src/app/admin/discounts/actions.ts`, all guarded by
`requireAdmin()`:

- create, update — zod validation; target must exist and match the scope; other
  target ids forced null.
- setActive — pause/resume.
- softDelete — set `deletedAt = new Date()`. Confirmation explains it stops
  applying immediately and old orders keep their snapshot.
- hardDelete — allowed only when `deletedAt != null`; `db.discount.delete`.
  Confirmation is permanent. No order rows reference the discount, so nothing
  else needs cleaning.

Revalidate the admin list and the storefront paths, following the coupons
actions. Editing a discount changes live prices only; it never touches orders.

Admin UX note: the list should make the difference between "Expired" (window
over), "Paused" (manually off) and "Deleted" obvious; those are three different
reasons a discount is not applying.

## Checkout

`src/app/actions/orders.ts`:

1. Load `getLiveDiscounts()` once.
2. For each cart line, after the existing product/variant resolution, compute
   `listUnitCents` with `priceForVersion(...)` (unchanged), then
   `resolvePrice(listUnitCents, target, discounts, requestVersion)`. Also
   resolve the global list/charged pair for the quote, with the same variant
   fallback.
3. Use `chargedCents` for `subtotalCents`, the coupon lines, and the GST
   extraction. Stock logic is untouched.
4. Evaluate the coupon against the discounted subtotal. If it no longer
   qualifies and the client sent an expected total, do **not** throw
   `COUPON_INVALID`; continue with zero discount and let the quote below carry
   `coupon.valid: false` and the reason. Without an expected total, keep the
   existing `COUPON_INVALID` refusal.
5. Compute shipping and `totalCents` as today.
6. Guard, before the order transaction: when `expectedTotalCents` is present and
   differs from `totalCents`, build the `CartQuote` from the values already in
   scope and return `CART_CHANGED`. No order row exists at this point.
7. Otherwise write the order item with `priceCents: chargedCents`, and when a
   discount applied, `listPriceCents: listUnitCents` and
   `discountTitle: applied.title`.
8. `Order.subtotalCents` is therefore the discounted subtotal. `Order.discountCents`
   remains coupon-only. Coupon eligibility and minimums see the discounted
   subtotal automatically because they already receive `subtotalCents`.
9. Return `{ ok: true, orderId, orderNumber, totalCents }`.

The product query in `createOrder` must include the brand id, primary category
parent, and subcategory ids/parents needed to build `DiscountTarget`.

Plumbing for the mismatch:

- Rename the input field `expectedSubtotalCents` to `expectedTotalCents`
  (optional integer; the cart always sends it). The server compares the whole
  total, so a coupon expiry or a free-shipping threshold change is caught too.
- `CheckoutError` gains an optional `details?: unknown`. The `createOrder`
  wrapper copies it onto the failure result as `quote?: CartQuote`.
- `checkoutWithRazorpay` throws a `CartChangedError` carrying the quote when
  `code === "CART_CHANGED"`; it must not reduce that case to a plain `Error`.
  The cart catches it before `friendlyPaymentError` and applies the quote.
- `notify` gains `info(message, description)` (`toast.info`) for the "Prices
  changed" notice; the existing `error`/`success` pairs don't fit a non-failure.

Idempotency interaction: the cart token is unchanged by a quote, so the retry
takes the existing `cartToken` path. Reuse an existing PENDING/FAILED order only
when its `subtotalCents` and `totalCents` equal the current computed values.
Otherwise create a new order; reusing one priced before the change would charge
a total the shopper no longer sees. The abandoned order stays visible to staff.

### Free orders

A total of ₹0 (100% discount, a flat that covers the line, or a coupon) skips
Razorpay entirely.

- `checkoutWithRazorpay`, after `createOrder`, checks the returned
  `totalCents`. When `<= 0`, it POSTs `/api/orders/free` instead of
  `/api/razorpay/order` and never loads the checkout script.
- New `src/app/api/orders/free/route.ts`, body `{ orderId }`:
  1. Load the order; 404 when missing.
  2. Ownership: if `order.userId` is set, the session must match; guest orders
     stay open on their cuid, exactly like `/api/razorpay/order`.
  3. Require `order.totalCents <= 0` (409 otherwise) — the client cannot use
     this route to complete a payable order.
  4. If already `PAID`/`PRE_ORDER`, still call `runPaidSideEffects(order.id)`
     (a retry after a crash between the status update and the side effects must
     heal), then return `{ ok: true, orderNumber }`. Otherwise require
     `PENDING`/`FAILED`.
  5. Conditional update to `PAID` (or `PRE_ORDER` when `order.isPreOrder`) with
     `status in (PENDING, FAILED)` and `totalCents <= 0` in the `where`, so two
     callers cannot both complete it.
  6. Call `runPaidSideEffects(order.id)` — stock, invoice, coupon redemption,
     emails and the admin alert, all already idempotent via
     `paidSideEffectsAt`.
  7. Return `{ ok: true, orderNumber }`.
- `/api/razorpay/order` gains an explicit `totalCents <= 0` refusal (409, "This
  order requires no payment"), so a client bug can never send ₹0 to Razorpay.
- No Payment row is created. The order's zero total, line snapshots and coupon
  discount are the audit trail; no `isFree` column is added.
- The existing `paymentsEnabled` check at the top of `checkoutWithRazorpay`
  still runs first; free orders are a checkout path, not a way around a closed
  store.

## Order display

- `src/app/account/orders/page.tsx` — include `listPriceCents` and
  `discountTitle` in the item select.
- `src/app/account/orders/order-card.tsx` — when `listPriceCents != null`, show
  the regular price struck through and/or a line "Discount (title): −₹X"; the
  line total still uses the charged `priceCents`.
- `src/app/admin/orders/[id]/page.tsx` — same fields, same presentation, so
  staff can explain an old total. When `totalCents === 0`, show a "Free order"
  badge next to the status and a line "No payment required — total ₹0 after
  discounts"; the item snapshots and coupon row already explain why.
- `src/app/account/orders/order-card.tsx` — the same "Free order" label for the
  shopper.
- `src/lib/invoices.ts` — unchanged. The invoice bills the net charged price and
  its totals are already consistent; adding a discount line on top of a net
  subtotal would double-count. The order screens show the saving.

## Edge cases

- Percentage of a free/zero price: no amount, no discount.
- Flat larger than the unit price: charged 0, not negative.
- Discount on a variant product: applies to the resolved variant price, not the
  base product price, for both percent and flat.
- Variant with no own price: falls back to the discounted product price, as
  today; do not discount twice.
- Product in a child category: a discount on the parent category covers it.
- Product in several subcategories: covered if any matching category discount
  exists; the best amount wins.
- Discount starts/ends mid-session: the cart keeps the add-time price; checkout
  re-prices, returns the quote, the cart applies it and shows the notice, and the
  shopper retries. No order is created on the mismatch.
- Coupon expires/invalidates mid-session: same quote path, with the coupon
  cleared and `coupon.reason` shown.
- A 100% discount (or a coupon) can make the order total ₹0: checkout skips
  Razorpay and completes the order through `/api/orders/free`.
- Free-order retry: the endpoint is idempotent; an already-paid zero-total order
  returns success and `runPaidSideEffects` refuses a second claim.
- A new discount makes two identical-looking cart lines price differently (for
  example, only one product in the cart qualifies): the quote is per line, so
  each line keeps its own charged price.
- Discount edited while in the admin list: update is by id; no optimistic UI
  needed.
- Two equal discounts: more specific wins; if equally specific, newer wins.
- Deleted/expired discount: never applies, but old order snapshots remain.
- Coupon + product discount: both apply; coupon minimum sees the discounted
  subtotal; coupon product/brand/category scope still matches the product.
- Pre-order: discounted like any other sale; no exclusion.
- Store switch: each price uses only its store's discounts (`all` counts for
  both); the cart stores both charged prices at add time.

## Tests

`tests/discounts.test.ts` (node:test + assert, pure):

- window: no start, no end, before start, after end, exact boundaries
- store: local, global, all
- scope: product, brand, category (primary, subcategory, parent), all
- percent rounding and 100% cap; flat clamp at the unit price
- best discount by amount; tie-break by specificity then recency
- `options` includes every eligible discount and marks the applied one first
- deleted, paused, expired discounts excluded
- cart/checkout-style snapshot: list price, charged price, title
- `applyQuote`: matches by product + variant, updates both stores' stored
  prices, leaves an unmatched line untouched, and never mutates the input

Run `npm test`, `npm run typecheck`, `npx prisma validate`. No DB-backed order
test exists in this checkout; the pure resolver is the shared code checkout
uses, so the test covers the decision logic.

## Migration and deploy

- New migration folder with: the two enums, `discounts` table, indexes and FKs;
  `ALTER TABLE order_items ADD COLUMN list_price_cents INTEGER` and
  `ADD COLUMN discount_title TEXT`.
- Hand-write the SQL in the style of the existing migrations. No local database
  is available in this checkout, so it is validated with `prisma validate` and
  applied on deploy.
- Rolling back means dropping the table/enums and the two order columns; old
  orders lose only the snapshot display, not their charged amounts.

## What is left to the builder

- Exact Tailwind for the badge/note, following the existing price row and
  `ProductCard` styles; the site is a Cafe24 replica, so no invented fonts,
  colours or spacing.
- Component decomposition of the admin manager; mirror `CouponsManager`.
- The loading state/empty state wording in the admin.
- Whether the note is one line with wrapping or a short list; keep it compact.
- The exact toast copy for a re-priced cart and the success copy for a free
  order ("Order confirmed — no payment was needed").
- Whether the free-order badge sits next to the status or in the totals block;
  follow the existing order-detail layout.
