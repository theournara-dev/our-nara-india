# Product Discounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins create product, brand, category, or site-wide discounts, show the best one to shoppers, charge it at checkout, and keep a per-order snapshot so later edits never rewrite old orders.

**Architecture:** A `Discount` table feeds one pure resolver used by cards, product pages, listings, cart, and checkout. The resolver picks the highest-value eligible discount per unit; cards show a small badge, the product page lists every eligible discount with only the applied one un-struck. Checkout recomputes from the database, returns a `CartQuote` when the cart's total is stale, and completes ₹0 orders without Razorpay. Order items store the charged price plus `listPriceCents` and `discountTitle`; there is no foreign key from orders to discounts.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 7 + PostgreSQL, Tailwind, node:test.

**Spec:** `docs/superpowers/specs/2026-10-20-product-discounts-design.md`

## Global Constraints

- All money is integer paise, INR. Never use floats for stored amounts.
- Percentage discounts are integers 1–100. Fixed discounts are at least 1 paisa. Percentage amount is `Math.round(listCents * value / 100)`; fixed amount is `Math.min(value, listCents)`; every amount below 1 is dropped; charged price is `Math.max(0, listCents - amount)`.
- One discount applies per unit: highest amount first, then most specific scope (`PRODUCT` > `CATEGORY` > `BRAND` > `ALL`), then newest `createdAt`, then `id`.
- No stacking, no multiple products per discount row, no usage caps, no shipping discounts.
- Discount windows are inclusive and optional. `startsAt === null` means no start; `endsAt === null` means no end.
- `siteVersion` is `all | local | global`, default `all`. A discount applies only to its store.
- `title` is customer-facing and required. `adminNote` is admin-only, optional, and must never be selected by storefront loaders or sent to the browser.
- Delete is soft (`deletedAt`). Only soft-deleted rows can be hard-deleted.
- `Order.subtotalCents` is the discounted subtotal. `Order.discountCents` remains coupon-only.
- Existing orders are never rewritten. `OrderItem` stores `priceCents` (charged), `listPriceCents` (pre-discount, nullable) and `discountTitle` (nullable). No `discountId` column.
- Free orders are `totalCents <= 0`; they skip Razorpay and still run `runPaidSideEffects`.
- Static catalog, Shorts Picks, recent-view, and static home keep raw prices; they have no discounts.
- Do not modify `/cafe24-original` or invent new CSS values.

## Review Focus

- **Cart total moves during checkout.** A discount starting, ending, or changing between add-to-cart and Place order must not create an order. The server returns the recalculated quote, the cart applies it, shows a notification, and the shopper can retry.
- **₹0 order.** A 100% discount plus free shipping must not call Razorpay (which rejects amounts under ₹1). The order completes through the free-order route and paid side effects run exactly once.
- **Store switch without reload.** Switching local/global in the popup or dev toggle must change both the price and the badge; neither may describe the other store.
- **Price filter/sort and facet counts.** The visible grid, the total, and the brand/availability counts must agree when a price filter is active, and price sorting must use discounted prices.
- **Snapshot after edits.** Changing or hard-deleting a discount must leave old order item prices, list prices, and discount titles unchanged.

---

### Preflight: clean base

- [ ] **Step 1: Verify the compare-at removal before starting**

Run: `npm test`, `npx prisma validate`, `npm run typecheck`

Expected: tests pass, Prisma validates, typecheck has only the two pre-existing `LayoutProps` errors in `src/app/layout.tsx` and `src/app/account/layout.tsx`.

- [ ] **Step 2: Commit or stash the existing removal**

The working tree currently contains the completed compare-at removal. Commit it (recommended) so discount work has a clean base:

```bash
git add PLAN.md prisma/schema.prisma prisma/migrations/20261020120000_remove_compare_at_price src/app/admin/products/actions.ts src/components/admin/product-form.tsx src/components/product/product-detail.tsx src/data/catalog.ts src/data/products.ts
git commit -m "refactor: remove unused compare-at pricing"
```

---

### Task 1: Discount schema and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261020130000_product_discounts/migration.sql`

**Interfaces:**
- Produces: Prisma models `Discount`, enums `DiscountType` (`PERCENT | FIXED`) and `DiscountScope` (`ALL | BRAND | CATEGORY | PRODUCT`), plus `OrderItem.listPriceCents` and `OrderItem.discountTitle`.
- Produces: `Brand.discounts`, `Category.discounts`, `Product.discounts` relations.

- [ ] **Step 1: Add the enums and model**

Add near the coupon enums:

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
  title       String
  adminNote   String?       @map("admin_note")
  type        DiscountType
  value       Int
  scope       DiscountScope @default(ALL)
  brandId     String?       @map("brand_id")
  categoryId  String?       @map("category_id")
  productId   String?       @map("product_id")
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

- [ ] **Step 2: Add the relations and order snapshot fields**

Add `discounts Discount[]` to `Brand`, `Category`, and `Product`. Add to `OrderItem`:

```prisma
listPriceCents Int?    @map("list_price_cents")
discountTitle  String? @map("discount_title")
```

- [ ] **Step 3: Create the migration SQL**

Create `prisma/migrations/20261020130000_product_discounts/migration.sql`:

```sql
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED');
CREATE TYPE "DiscountScope" AS ENUM ('ALL', 'BRAND', 'CATEGORY', 'PRODUCT');

CREATE TABLE "discounts" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "admin_note" TEXT,
  "type" "DiscountType" NOT NULL,
  "value" INTEGER NOT NULL,
  "scope" "DiscountScope" NOT NULL DEFAULT 'ALL',
  "brand_id" TEXT,
  "category_id" TEXT,
  "product_id" TEXT,
  "site_version" TEXT NOT NULL DEFAULT 'all',
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "discounts_site_version_deleted_at_idx" ON "discounts"("site_version", "deleted_at");
CREATE INDEX "discounts_product_id_idx" ON "discounts"("product_id");
CREATE INDEX "discounts_brand_id_idx" ON "discounts"("brand_id");
CREATE INDEX "discounts_category_id_idx" ON "discounts"("category_id");

ALTER TABLE "discounts" ADD CONSTRAINT "discounts_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_items"
  ADD COLUMN "list_price_cents" INTEGER,
  ADD COLUMN "discount_title" TEXT;
```

- [ ] **Step 4: Validate and generate**

Run: `npx prisma validate`
Expected: `The schema at prisma\schema.prisma is valid`.

Run: `npx prisma generate`
Expected: client generated successfully.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261020130000_product_discounts
git commit -m "feat: add discount schema and order price snapshots"
```

---

### Task 2: Pure discount resolver

**Files:**
- Create: `src/lib/discounts.ts`
- Test: `tests/discounts.test.ts`

**Interfaces:**
- Produces:

```ts
import type { SiteVersion } from "@/lib/site-version";

export type DiscountType = "PERCENT" | "FIXED";
export type DiscountScope = "ALL" | "BRAND" | "CATEGORY" | "PRODUCT";
export type DiscountStatus = "active" | "paused" | "scheduled" | "expired" | "deleted";

export interface DiscountRecord {
  id: string; title: string; type: DiscountType; value: number; scope: DiscountScope;
  brandId: string | null; categoryId: string | null; productId: string | null;
  siteVersion: "all" | "local" | "global"; startsAt: Date | null; endsAt: Date | null;
  isActive: boolean; deletedAt: Date | null; createdAt: Date;
}

export interface DiscountTarget { productId: string; brandId: string; categoryIds: string[] }
export interface DiscountOption { discount: DiscountRecord; amountCents: number }
export interface ResolvedPrice {
  listCents: number; chargedCents: number;
  applied: DiscountRecord | null; amountCents: number; options: DiscountOption[];
}

export function discountStatus(
  record: Pick<DiscountRecord, "deletedAt" | "isActive" | "startsAt" | "endsAt">,
  now?: Date
): DiscountStatus;
export function isDiscountLive(record: DiscountRecord, version: SiteVersion, now?: Date): boolean;
export function resolvePrice(
  listCents: number, target: DiscountTarget, discounts: DiscountRecord[], version: SiteVersion, now?: Date
): ResolvedPrice;
export function discountTargetFor(input: {
  productId: string; brandId: string; categoryId: string; categoryParentId?: string | null;
  subcategories?: { category: { id: string; parentId: string | null } }[];
}): DiscountTarget;
```

- [ ] **Step 1: Write the failing tests**

Cover these exact cases in `tests/discounts.test.ts`:

```ts
const now = new Date("2026-10-20T12:00:00Z");
const target = { productId: "p1", brandId: "b1", categoryIds: ["c1", "parent"] };
const base = { brandId: null, categoryId: null, productId: null, siteVersion: "all",
  startsAt: null, endsAt: null, isActive: true, deletedAt: null,
  createdAt: new Date("2026-10-01T00:00:00Z") } satisfies Omit<DiscountRecord, "id" | "title" | "type" | "value" | "scope">;

// 20% of 1000 -> charged 800, amount 200, applied title "Diwali"
// fixed 300 -> charged 700; fixed 1500 on 1000 -> charged 0, amount 1000
// 100% -> charged 0
// 10% of 999 -> amount 100, charged 899 (half-up rounding)
// brand 10% + product 20% -> product applied; options titles [product, brand]
// same amount product vs brand -> product first
// same amount, same scope -> newer createdAt first
// category c1 and parent both match; unrelated category does not
// scope BRAND with b2 does not match b1
// siteVersion local does not match global, all matches both
// startsAt === now and endsAt === now are live; one millisecond outside is not
// paused, deleted, expired, scheduled excluded from options
// no eligible discount -> charged === list, applied null, options []
// discountStatus maps deleted/paused/scheduled/expired/active
// discountTargetFor dedupes primary, parent, subcategory and subcategory parent ids
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/discounts.test.ts`
Expected: FAIL because `src/lib/discounts.ts` does not exist.

- [ ] **Step 3: Implement the resolver**

Implement in `src/lib/discounts.ts`:

- `discountStatus`: `deletedAt` -> `deleted`; `!isActive` -> `paused`; `startsAt > now` -> `scheduled`; `endsAt < now` -> `expired`; else `active`.
- `isDiscountLive`: status is `active` and `siteVersion` is `all` or equals `version`.
- `discountTargetFor`: start with primary category id, add parent if present, add every subcategory category id and its parent if present; return a deduped array in insertion order.
- `resolvePrice`: clamp `listCents` to at least 0; filter by live, version, and scope (`ALL`; `BRAND` matches `brandId`; `CATEGORY` matches `categoryIds`; `PRODUCT` matches `productId`); compute amount; drop amounts below 1; sort by amount desc, specificity desc, `createdAt` desc, `id` asc; `applied = options[0]?.discount ?? null`; `chargedCents = Math.max(0, listCents - amountCents)`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/discounts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/discounts.ts tests/discounts.test.ts
git commit -m "feat: add pure discount resolver"
```

---

### Task 3: Cart quote type and applier

**Files:**
- Create: `src/lib/cart-quote.ts`
- Test: `tests/cart-quote.test.ts`

**Interfaces:**
- Consumes: `CartItem` from `src/lib/cart.ts`.
- Produces:

```ts
export interface CartQuoteLine {
  productId: string; variantId: string | null;
  listPriceCents: number; chargedPriceCents: number;
  globalListPriceCents: number; globalChargedPriceCents: number;
  discountTitle: string | null;
}
export interface CartQuoteCoupon {
  code: string | null; valid: boolean; reason?: string;
  discountCents: number; freeShipping: boolean; title: string | null;
}
export interface CartQuote {
  lines: CartQuoteLine[]; subtotalCents: number;
  coupon: CartQuoteCoupon; shippingCents: number; totalCents: number;
}
export class CartChangedError extends Error {
  readonly quote: CartQuote;
  constructor(quote: CartQuote);
}
export function applyQuote(items: CartItem[], quote: CartQuote): CartItem[];
```

- [ ] **Step 1: Write the failing tests**

Cover:
- A quote line with `productId: "p1"`, `variantId: "v1"` updates the matching cart item's `priceCents` and `globalPriceCents` and leaves its `qty` and `optionLabel` intact.
- A cart item with `option: undefined` matches a line with `variantId: null`.
- Unmatched cart items come back unchanged.
- The input array and items are not mutated.
- A quote with a line for another variant does not touch the item.
- `new CartChangedError(quote).quote` is the same object.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/cart-quote.test.ts`
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement `applyQuote` and the error class**

Use `import type { CartItem } from "@/lib/cart"` so the client-only cart module is not pulled into the test runtime. Match on `item.productId === line.productId && (item.option ?? null) === line.variantId`. Return a new array; replace only matched items with `{...item, priceCents: line.chargedPriceCents, globalPriceCents: line.globalChargedPriceCents}`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/cart-quote.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cart-quote.ts tests/cart-quote.test.ts
git commit -m "feat: add cart quote applier"
```

---

### Task 4: Storefront data layer

**Files:**
- Create: `src/lib/discount-store.ts`
- Modify: `src/data/catalog.ts`
- Modify: `src/data/products.ts`

**Interfaces:**
- Consumes: `DiscountRecord`, `resolvePrice`, `discountTargetFor`, `ResolvedPrice` from Task 2.
- Produces:

```ts
// src/lib/discounts.ts also exports
export interface DiscountBadge {
  title: string; amountCents: number; percentOff: number | null;
}
export function discountBadge(resolved: ResolvedPrice): DiscountBadge | null;
export function discountBadgeLabel(badge: DiscountBadge, currency: string): string;

// src/lib/discount-store.ts
export const getLiveDiscounts: () => Promise<DiscountRecord[]>;

// src/data/catalog.ts
export interface ProductCardView {
  // existing fields...
  effectivePriceCents: number;
  effectiveGlobalPriceCents: number;
  discountsByStore: { local: DiscountBadge | null; global: DiscountBadge | null };
}

// src/data/products.ts
export interface ProductDetail extends ProductCardView {
  // existing fields...
  discounts: DiscountRecord[];
  discountTarget: DiscountTarget;
}
```

- [ ] **Step 1: Add the badge helpers**

In `src/lib/discounts.ts`:

```ts
export function discountBadge(resolved: ResolvedPrice): DiscountBadge | null {
  const applied = resolved.applied;
  return applied
    ? {
        title: applied.title,
        amountCents: resolved.amountCents,
        percentOff: applied.type === "PERCENT" ? applied.value : null,
      }
    : null;
}

export function discountBadgeLabel(badge: DiscountBadge, currency: string): string {
  return badge.percentOff != null
    ? `−${badge.percentOff}%`
    : `−${formatMoney(badge.amountCents, currency)}`;
}
```

`formatMoney` comes from `@/lib/money`.

- [ ] **Step 2: Add the public loader**

`src/lib/discount-store.ts`:

```ts
import { cache } from "react";
import { db } from "@/lib/db";
import type { DiscountRecord } from "@/lib/discounts";

export const getLiveDiscounts = cache(async (): Promise<DiscountRecord[]> => {
  const rows = await db.discount.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true, title: true, type: true, value: true, scope: true,
      brandId: true, categoryId: true, productId: true, siteVersion: true,
      startsAt: true, endsAt: true, isActive: true, deletedAt: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return rows as DiscountRecord[];
});
```

The cast is needed because Prisma types `siteVersion` as `string`; the resolver narrows it. Never select `adminNote` here.

- [ ] **Step 3: Extend types and mapping**

In `src/data/catalog.ts`, add the three fields to `ProductCardView`; `toCardView` sets `effectivePriceCents: p.priceCents`, `effectiveGlobalPriceCents: p.priceCents`, and both badges `null`.

In `src/data/products.ts`:
- Add `id` to the selected brand, and `category {id, parentId}` plus subcategory `category {id, slug, parentId}` to `ProductRow`, `cardInclude`, and `detailInclude`.
- Change `toCard(p, discounts: DiscountRecord[] = [])` to build the target with `discountTargetFor`, resolve local and global prices, and set the three effective/badge fields. Use `p.globalPriceCents ?? p.priceCents` for the global list.
- Change `toDetail(p, discounts = [])` to pass discounts to `toCard` and set `discounts` and `discountTarget`.
- Every function that maps rows (`getFeaturedProducts`, `getAvailableNow`, `getPreOrderProducts`, `getProductsByCategorySlug`, `getProductsByBrandSlug`, `getProductsBySlugs`, `getProductsByIds`, `getProductBySlug`) must `await getLiveDiscounts()` once and map with `rows.map((row) => toCard(row, discounts))`. Never `rows.map(toCard)`: the array index would arrive as `discounts`.
- `getProductBySlug` uses the discounts in `toDetail`.

- [ ] **Step 4: Add a mapping test**

In `tests/discounts.test.ts`, add a test for `discountTargetFor` with duplicate ids (primary and parent equal, subcategory parent equal to primary) asserting no duplicate strings. This is the only pure part of this task.

- [ ] **Step 5: Verify**

Run: `npm test -- tests/discounts.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: only the two pre-existing `LayoutProps` errors; no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/discounts.ts src/lib/discount-store.ts src/data/catalog.ts src/data/products.ts tests/discounts.test.ts
git commit -m "feat: load discounts into product cards and detail"
```

---

### Task 5: Listings use effective prices

**Files:**
- Modify: `src/data/products.ts`

**Interfaces:**
- Consumes: `getLiveDiscounts`, `toCard`, `priceForVersion`, `saleStateForVersion`.
- Produces: `getProductListing` filters, sorts, totals, and brand/availability facets on effective prices.

- [ ] **Step 1: Remove the SQL price predicate**

Delete `listingPriceWhere` and its call inside `listingWhere`. Keep `filters` in `ListingWhereOptions` for the other filters. The SQL path now handles category, brand, search, subcategory, brands, and availability only.

- [ ] **Step 2: Add effective price range helpers**

Inside `src/data/products.ts`:

```ts
function effectivePriceCents(card: ProductCardView, version: SiteVersion): number {
  return priceForVersion(card.effectivePriceCents, card.effectiveGlobalPriceCents, version);
}

function inPriceRange(card: ProductCardView, filters: CategoryFilters, version: SiteVersion): boolean {
  const rupees = Math.round(effectivePriceCents(card, version) / 100);
  return (filters.minRupees == null || rupees >= filters.minRupees)
    && (filters.maxRupees == null || rupees <= filters.maxRupees);
}
```

- [ ] **Step 3: Rewrite `getProductListing`**

- Load `const discounts = await getLiveDiscounts()` once.
- `hasPriceFilter = filters.minRupees != null || filters.maxRupees != null`.
- `pricePath = hasPriceFilter || sort === "lowest" || sort === "highest"`.
- `pricePath`: load all matching rows with `cardInclude` and `orderBy: { createdAt: "desc" }`; map with `toCard(row, discounts)`; filter with `inPriceRange` when `hasPriceFilter`; sort by effective price (asc/desc, tie by id); `total = cards.length`; slice for the page; `totalPages` and `page` from that total.
- Otherwise: keep the existing DB page path, but map with `toCard(row, discounts)`.
- Facets: when `hasPriceFilter`, load the `withoutBrand` and `withoutAvailability` rows with `cardInclude`, map them, filter with `inPriceRange`, then count brand and availability from those cards. Brand counts use `card.brand.slug` and `card.brand.name`; availability counts `saleStateForVersion(card, version) === "buynow"` as ready and `"preorder"` as preorder. When there is no price filter, keep the existing SQL facet functions.
- Add a `shortcut:` comment above the all-rows path: `shortcut: price filter/sort loads every matching product; move it into SQL if the catalog passes a few thousand rows.`
- Return the same `ProductListingPage` shape.

- [ ] **Step 4: Verify**

Run: `npm run typecheck`
Expected: only the two pre-existing `LayoutProps` errors.

Run: `npm test`
Expected: all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/data/products.ts
git commit -m "feat: filter and sort listings by discounted price"
```

---

### Task 6: Card and product page discounts

**Files:**
- Modify: `src/components/theme/product-card.tsx`
- Modify: `src/components/product/product-detail.tsx`
- Modify: `src/app/account/wishlist/page.tsx`
- Modify: `src/components/content/triple-banner.tsx`
- Modify: `src/app/products/[slug]/page.tsx`
- Modify: `src/lib/cart.ts`

**Interfaces:**
- Consumes: `discountBadgeLabel`, `resolvePrice`, `ProductDetail.discounts`, `ProductDetail.discountTarget`.
- Produces: card badge and effective price; PDP struck-through list price, applied badge, and eligible-options note; effective prices in wishlist, triple banner, and JSON-LD; `addProductToCart` accepts charged prices.

- [ ] **Step 1: Cart accepts charged prices**

In `src/lib/cart.ts`, extend the `addProductToCart` product type with optional `effectivePriceCents` and `effectiveGlobalPriceCents`. Store `product.effectivePriceCents ?? product.priceCents` and `product.effectiveGlobalPriceCents ?? product.globalPriceCents`. Do not add new `CartItem` fields.

- [ ] **Step 2: Product card**

In `src/components/theme/product-card.tsx`:
- Reuse the existing `const { version } = useSiteVersion()` at line 32.
- Price is `version === "global" ? product.effectiveGlobalPriceCents : product.effectivePriceCents`; `formatMoney` that value.
- Badge is `version === "global" ? product.discountsByStore.global : product.discountsByStore.local`.
- Render the price and, when a badge exists, a small adjacent label with `title={badge.title}`:

```tsx
<span className="mt-1 flex items-center justify-center gap-1.5">
  <span className="text-[14px] font-bold leading-[19.6px] text-black md:text-[18px] md:leading-[25.2px]">
    {formatMoney(displayPrice, product.currency)}
  </span>
  {badge ? (
    <span
      title={badge.title}
      className="rounded bg-point-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white"
    >
      {discountBadgeLabel(badge, product.currency)}
    </span>
  ) : null}
</span>
```

If `point-500` is not a project token, use the existing accent class used by the card's K-Drop badge; do not invent a color.

- [ ] **Step 3: Product detail price resolution**

In `src/components/product/product-detail.tsx`, replace the raw variant/local/global block with:

```ts
const variantOverride = selectedVariant?.priceCents != null ? selectedVariant : undefined;
const localListCents = variantOverride?.priceCents ?? product.priceCents;
const globalListCents = variantOverride
  ? (variantOverride.globalPriceCents ?? product.globalPriceCents ?? localListCents)
  : (product.globalPriceCents ?? product.priceCents);
const localResolved = resolvePrice(localListCents, product.discountTarget, product.discounts, "local");
const globalResolved = resolvePrice(globalListCents, product.discountTarget, product.discounts, "global");
const activeResolved = version === "global" ? globalResolved : localResolved;
const localPrice = localResolved.chargedCents;
const globalPrice = globalResolved.chargedCents;
const displayPrice = activeResolved.chargedCents;
const listPrice = activeResolved.listCents;
const appliedBadge = discountBadge(activeResolved);
```

`thisLineCents` stays `displayPrice * qty`.

- [ ] **Step 4: Product detail price row and note**

Replace the single price line with:
- struck-through `formatMoney(listPrice, product.currency)` when `listPrice > displayPrice`;
- charged price in the existing bold style;
- applied badge with `discountBadgeLabel(appliedBadge, product.currency)` and `title={appliedBadge.title}`;
- when `activeResolved.options.length > 1`, a note under the price listing every option in order. Applied option: normal text. Others: `line-through text-zinc-400`. Each row shows `option.discount.title` and `option.discount.type === "PERCENT" ? `${option.discount.value}% off` : `${formatMoney(option.amountCents, product.currency)} off``.
- Keep the existing coupon hint block unchanged.

- [ ] **Step 5: Pass charged prices to the cart**

In `handleBuyNow`, call:

```ts
addProductToCart(
  { ...product, effectivePriceCents: localPrice, effectiveGlobalPriceCents: globalPrice },
  qty,
  option || undefined,
  selectedVariant?.optionLabel || undefined,
);
```

- [ ] **Step 6: Other price surfaces**

- `src/app/account/wishlist/page.tsx`: use `priceForVersion(product.effectivePriceCents, product.effectiveGlobalPriceCents)`.
- `src/components/content/triple-banner.tsx`: same replacement.
- `src/app/products/[slug]/page.tsx`: JSON-LD `offers.price` uses `priceForVersion(product.effectivePriceCents, product.effectiveGlobalPriceCents, version)`.

- [ ] **Step 7: Verify**

Run: `npm run typecheck`
Expected: only the two pre-existing `LayoutProps` errors.

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/theme/product-card.tsx src/components/product/product-detail.tsx src/app/account/wishlist/page.tsx src/components/content/triple-banner.tsx 'src/app/products/[slug]/page.tsx' src/lib/cart.ts
git commit -m "feat: show discounts on cards and product pages"
```

---

### Task 7: Checkout quote, charged prices, and snapshots

**Files:**
- Modify: `src/lib/checkout-errors.ts`
- Modify: `src/lib/toast.ts`
- Modify: `src/lib/razorpay-client.ts`
- Modify: `src/app/actions/orders.ts`
- Modify: `src/app/cart/page.tsx`
- Modify: `src/components/cart/quick-purchase-sheet.tsx`

**Interfaces:**
- Consumes: `resolvePrice`, `discountTargetFor`, `getLiveDiscounts`, `CartQuote`, `applyQuote`, `CartChangedError`.
- Produces: `createOrder` accepts `expectedTotalCents`, returns `{ok:true, orderId, orderNumber, totalCents}` or `{ok:false, code, message, quote?}`; `checkoutWithRazorpay` returns `{orderId, orderNumber, free: boolean}`; both checkout surfaces add charged prices and recover from `CART_CHANGED`.

- [ ] **Step 1: Error plumbing**

- `src/lib/checkout-errors.ts`: `constructor(code: string, message: string, readonly details?: unknown)`.
- `src/lib/toast.ts`: add `info(id, message, description?)` using `toast.info`.
- `src/lib/razorpay-client.ts`: when `!result.ok`, throw `new CartChangedError(result.quote)` if `result.code === "CART_CHANGED" && result.quote`; otherwise keep `new Error(result.message)`.
- `src/app/actions/orders.ts`:
  - Rename zod field `expectedSubtotalCents` to `expectedTotalCents`.
  - Success type adds `totalCents`; failure adds `quote?: CartQuote`.
  - Wrapper passes `err.details` quote through for `CheckoutError`.

- [ ] **Step 2: Checkout computes charged prices**

- Load `const discounts = await getLiveDiscounts()` before the item loop.
- Product query adds `category: {select:{id:true,parentId:true}}` and `subcategories: {select:{category:{select:{id:true,parentId:true}}}}`.
- Build `discountTargetFor({productId: product.id, brandId: product.brandId, categoryId: product.category.id, categoryParentId: product.category.parentId, subcategories: product.subcategories})`.
- Keep the existing list price logic (`priceForVersion` plus variant override), then:

```ts
const localList = /* existing unitPriceCents */;
const resolved = resolvePrice(localList, target, discounts, requestVersion);
const unitPriceCents = resolved.chargedCents;
```

- Use `unitPriceCents` for the subtotal, coupon lines, order item `priceCents`, and GST extraction.
- For each order item set `listPriceCents: resolved.applied ? resolved.listCents : null` and `discountTitle: resolved.applied?.title ?? null`.
- Coupon evaluation receives the charged `couponLines`, so its minimum is measured on the discounted subtotal.
- Build a `CartQuote` from the same loop data. For the global values, rerun `resolvePrice` with the global list and `"global"` so the quote can update both stores. Store the resulting local/global list and charged values and the applied title.
- Coupon handling:
  - If the coupon is invalid and `expectedTotalCents == null`, keep the existing `COUPON_INVALID` throw.
  - If the coupon is invalid and `expectedTotalCents != null`, continue with `discountCents: 0`, `freeShipping: false`, and `quote.coupon = {code, valid:false, reason, discountCents:0, freeShipping:false, title:null}`. Treat it as no coupon for the order: `application = null`, do not write the code into billing, and do not record a redemption.
  - If valid, fill the quote coupon from `application.evaluation` and `application.coupon.title`.
- After computing `totalCents`, if `expectedTotalCents != null && expectedTotalCents !== totalCents`, throw:

```ts
new CheckoutError(
  "CART_CHANGED",
  "Prices have changed. Review your updated cart and place the order again.",
  { quote },
);
```

This happens before the order transaction; no row is written.

- [ ] **Step 3: Cart and quick-purchase sheet send and apply the total quote**

In `src/app/cart/page.tsx`:
- Import `applyQuote` and `CartChangedError` from `@/lib/cart-quote`, and `setCart` from `@/lib/cart` if not already imported.
- Send `expectedTotalCents: totalCents` instead of `expectedSubtotalCents`.
- Catch `CartChangedError` before `friendlyPaymentError`:

```ts
if (error instanceof CartChangedError) {
  setCart(applyQuote(items, error.quote));
  setAppliedCoupon(
    error.quote.coupon.valid && error.quote.coupon.code
      ? {
          code: error.quote.coupon.code,
          discountCents: error.quote.coupon.discountCents,
          freeShipping: error.quote.coupon.freeShipping,
          title: error.quote.coupon.title,
        }
      : null,
  );
  notify.info(
    toastId,
    "Cart prices changed",
    "We updated your cart with the current prices and offers. Review the total, then place your order again.",
  );
  return;
}
```

Use the existing loading-toast id. Do not auto-retry. `finally` still resets `placing`.

`src/components/cart/quick-purchase-sheet.tsx` has the same checkout call at line ~151 and its own `subtotalCents`/`totalCents`; make the same two changes: send `expectedTotalCents: totalCents` and catch `CartChangedError` with the same `setCart`/`setAppliedCoupon`/`notify.info` code before `friendlyPaymentError`.

- [ ] **Step 4: Idempotent reuse only for the same total**

In the order transaction, change the existing PENDING/FAILED order reuse check to require both `existing.subtotalCents === subtotalCents` and `existing.totalCents === totalCents`. If either differs, create a new order. The abandoned row stays for staff.

- [ ] **Step 5: Verify**

Run: `npm test -- tests/cart-quote.test.ts tests/discounts.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: only the two pre-existing `LayoutProps` errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/checkout-errors.ts src/lib/toast.ts src/lib/razorpay-client.ts src/app/actions/orders.ts src/app/cart/page.tsx src/components/cart/quick-purchase-sheet.tsx
git commit -m "feat: charge discounts at checkout and refresh stale carts"
```

---

### Task 8: Free orders

**Files:**
- Create: `src/app/api/orders/free/route.ts`
- Modify: `src/app/api/razorpay/order/route.ts`
- Modify: `src/lib/razorpay-client.ts`
- Modify: `src/app/cart/page.tsx`
- Modify: `src/components/cart/quick-purchase-sheet.tsx`

**Interfaces:**
- Consumes: `createOrder` success `totalCents`, `runPaidSideEffects`, order ownership rules from `/api/razorpay/order`.
- Produces: `POST /api/orders/free` with `{orderId}` returning `{ok:true, orderNumber}`; `checkoutWithRazorpay` returns `free: true` for that path and `free: false` otherwise.

- [ ] **Step 1: Add the free-order branch**

In `checkoutWithRazorpay`, after a successful `createOrder` and before the Razorpay POST:

```ts
if (result.totalCents <= 0) {
  const response = await fetch("/api/orders/free", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: result.orderId }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Could not complete the free order.");
  }
  return { orderId: result.orderId, orderNumber: result.orderNumber, free: true };
}
```

The normal Razorpay success return becomes `return { orderId, orderNumber, free: false }`. Update both callers to destructure `free` and use the title `free ? "Order confirmed — no payment was needed" : "Payment successful!"`; keep the existing descriptions.

- [ ] **Step 2: Create the route**

`src/app/api/orders/free/route.ts` mirrors the ownership checks in `/api/razorpay/order`:

- parse `{orderId}`; 404 on missing order;
- if `order.userId`, the signed-in user must match; guest orders stay open by cuid;
- require `order.totalCents <= 0` else 409 `{error:"Payment is required for this order."}`;
- if status is already `PAID` or `PRE_ORDER`, still call `runPaidSideEffects(order.id)` and return success;
- otherwise require `PENDING` or `FAILED`; conditional `updateMany` to `PAID` (or `PRE_ORDER` when `order.isPreOrder`) with `status in (PENDING, FAILED)` and `totalCents <= 0`; if the update count is zero, re-read and accept only `PAID`/`PRE_ORDER`, else 409;
- call `await runPaidSideEffects(order.id)` (no payment row);
- return `NextResponse.json({ ok:true, orderNumber: order.orderNumber })`.

- [ ] **Step 3: Refuse Razorpay for zero totals**

In `/api/razorpay/order/route.ts`, immediately after loading the order and ownership checks:

```ts
if (order.totalCents <= 0) {
  return NextResponse.json({ error: "This order requires no payment." }, { status: 409 });
}
```

Place it before `createRazorpayOrder`.

- [ ] **Step 4: Verify**

Run: `npm run typecheck`
Expected: only the two pre-existing `LayoutProps` errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/orders/free/route.ts src/app/api/razorpay/order/route.ts src/lib/razorpay-client.ts src/app/cart/page.tsx src/components/cart/quick-purchase-sheet.tsx
git commit -m "feat: complete free orders without Razorpay"
```

---

### Task 9: Order snapshots in account and admin

**Files:**
- Modify: `src/app/account/orders/page.tsx`
- Modify: `src/app/account/orders/order-card.tsx`
- Modify: `src/app/admin/orders/[id]/page.tsx`

**Interfaces:**
- Consumes: `OrderItem.listPriceCents`, `OrderItem.discountTitle`, `Order.totalCents`.
- Produces: struck-through list price and discount title on old orders; "Free order" marker.

- [ ] **Step 1: Account data**

Add `listPriceCents` and `discountTitle` to the account order item select/map and to `AccountOrderItem`.

- [ ] **Step 2: Account display**

In `order-card.tsx` item rows:
- when `listPriceCents != null && listPriceCents > priceCents`, show `formatMoney(listPriceCents)` struck through next to the charged price;
- when `discountTitle != null && listPriceCents != null && listPriceCents > priceCents`, show `Discount ({discountTitle}): −{formatMoney(listPriceCents - priceCents)} each` under the item name;
- when `order.totalCents === 0`, show `Free order` in the totals block.

- [ ] **Step 3: Admin display**

In `src/app/admin/orders/[id]/page.tsx` item table, show the same struck-through list price and `Discount ({discountTitle}): −{formatMoney(listPriceCents - priceCents)} each` under the item name (guard both fields with `!= null`). When `order.totalCents === 0`, add a `Free order` badge next to the status and, under the totals:

```tsx
<p className="text-sm text-muted-foreground">
  No payment required — total ₹0 after discounts.
</p>
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck`
Expected: only the two pre-existing `LayoutProps` errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/account/orders/page.tsx src/app/account/orders/order-card.tsx 'src/app/admin/orders/[id]/page.tsx'
git commit -m "feat: show discount snapshots on orders"
```

---

### Task 10: Admin discounts page

**Files:**
- Create: `src/app/admin/discounts/page.tsx`
- Create: `src/app/admin/discounts/actions.ts`
- Create: `src/components/admin/discounts-manager.tsx`
- Modify: `src/components/admin/admin-nav.tsx`

**Interfaces:**
- Consumes: `discountStatus`, `DiscountRecord`, `AdminCoupon` patterns, `requireAdmin`.
- Produces: `saveDiscount`, `setDiscountActive`, `softDeleteDiscount`, `hardDeleteDiscount`; `/admin/discounts` page.

```ts
export interface AdminDiscountRow {
  id: string; title: string; adminNote: string | null;
  type: DiscountType; value: number; scope: DiscountScope;
  brandId: string | null; categoryId: string | null; productId: string | null;
  siteVersion: "all" | "local" | "global";
  startsAt: string | null; endsAt: string | null;
  isActive: boolean; deletedAt: string | null; createdAt: string;
  status: DiscountStatus; targetName: string | null;
}
interface TargetOption { id: string; name: string }
interface DiscountsManagerProps {
  discounts: AdminDiscountRow[];
  brands: TargetOption[];
  categories: TargetOption[];
  products: TargetOption[];
}
```

- [ ] **Step 1: Page data**

`src/app/admin/discounts/page.tsx`:
- `export const dynamic = "force-dynamic"`.
- Load discounts (including `deletedAt` rows), brands, categories, and products in parallel.
- Map each discount to `AdminDiscountRow` with ISO `startsAt`/`endsAt`/`createdAt`, `status: discountStatus(row)`, and `targetName` from the matching brand/category/product name.
- Pass to `<DiscountsManager discounts={...} brands={...} categories={...} products={...} />`.

- [ ] **Step 2: Actions**

`src/app/admin/discounts/actions.ts`:
- `"use server"`; `DiscountActionResult = {ok:true,id:string} | {ok:false,message:string}`.
- Zod input: `id?`, `title` 1–120, `adminNote` max 500 optional, `type` enum, `value` int min 1, `scope` enum, `brandId?`, `categoryId?`, `productId?`, `siteVersion` enum default `all`, `startsAt?`, `endsAt?`, `isActive` boolean default true.
- `parseDiscountDate(raw, endOfDay)`: blank -> null; `YYYY-MM-DD` -> local start/end of day; otherwise parse an ISO string with `new Date(raw)`; invalid -> error. The manager sends `datetime-local` values as `new Date(value).toISOString()` so the admin's timezone is preserved; the action never parses a bare `datetime-local` string.
- `saveDiscount`: percent value max 100; fixed value at least 1; require the target matching scope and verify it exists; clear the other two target ids; require `startsAt < endsAt` when both exist; create or update.
- `setDiscountActive(id, isActive)`: update only `deletedAt: null` rows.
- `softDeleteDiscount(id)`: set `deletedAt` and `isActive: false`; error if already deleted.
- `hardDeleteDiscount(id)`: delete only when `deletedAt` is non-null.
- All actions call `requireAdmin()`.
- `revalidateDiscountPages`: `revalidatePath("/admin/discounts")` and `revalidatePath("/", "layout")`.

- [ ] **Step 3: Manager UI**

`src/components/admin/discounts-manager.tsx`:
- Client component; copy the input/label/button classes and `ConfirmDialog` usage from `coupons-manager.tsx`.
- List columns: title (admin note as a muted second line), value (`20%` or `₹200`), scope + target name, store, window (`Always` when both null, otherwise dates), status, actions.
- Deleted rows are muted and show only a Hard delete button. Non-deleted rows show Edit, Pause/Resume, and Soft delete.
- Editor fields: customer title (required), admin note (optional), type, value (rupees when fixed), scope, target select (brand/category/product), store (`All stores`, `India`, `International`), start and end `datetime-local` inputs (blank = infinite), active checkbox.
- Convert fixed rupees with `toRupees`/`toCents`; convert dates to `YYYY-MM-DDTHH:mm` with a local helper for the input, and send `new Date(value).toISOString()` to the action.
- On save, call `saveDiscount`; on success reset the form to empty and refresh; on error show `notify.error`.
- Soft delete and hard delete require confirmation.

- [ ] **Step 4: Navigation**

In `src/components/admin/admin-nav.tsx`, add next to Coupons:

```ts
{ label: "Discounts", href: "/admin/discounts" },
```

- [ ] **Step 5: Verify**

Run: `npm run typecheck`
Expected: only the two pre-existing `LayoutProps` errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/discounts src/components/admin/discounts-manager.tsx src/components/admin/admin-nav.tsx
git commit -m "feat: add admin discounts manager"
```

---

### Task 11: Whole-feature verification

**Files:** none.

- [ ] **Step 1: Static checks**

Run: `npx prisma validate`
Expected: valid.

Run: `npx prisma generate`
Expected: generated.

Run: `npm test`
Expected: all tests pass, no failures.

Run: `npm run typecheck`
Expected: only the two pre-existing `LayoutProps` errors.

- [ ] **Step 2: Database checks (requires `.env` and a migrated database)**

Run: `npx prisma migrate deploy`
Expected: both pending migrations apply.

Manual checks:
- Create a 20% product discount, a fixed brand discount, and a category discount with the same product. Card shows the highest; product page shows all with only the applied one un-struck.
- Switch local/global without reload: price and badge both switch.
- Filter and sort by price: grid, total, and facet counts agree.
- Add to cart, change the discount in admin, place order: notification appears, cart updates, no order row from the rejected attempt, retry succeeds.
- Set a 100% product discount and free shipping: checkout skips Razorpay, order completes, paid side effects run once, admin sees the ₹0 note and item snapshot.
- Change and then hard-delete the discount: old order still shows the original charged price, list price, and title.

- [ ] **Step 3: Commit any verification fixes**

```bash
git add -A
git commit -m "chore: verify product discounts"
```
