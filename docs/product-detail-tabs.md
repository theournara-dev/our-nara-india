# Product Detail Tabs — Audit & Implementation Plan (v3)

Scope: make the four product-detail tabs (`DETAIL · INFO · REVIEW · Q&A`) show
real, product-specific information, and make each one editable from the admin
dashboard.

**v3 changes** (per review feedback):

- **DETAIL** = free-form **block editor**; **rich-text editor approved** (Tiptap + `sanitize-html`).
- **INFO** now grounded in the **real original source** (see §2): it is the
  "MORE INFORMATION" block — PAYMENT / SHIPPING / RETURNS & EXCHANGES / PRODUCT INQUIRY.
- **Q&A**: admin-authored list per product; **user submissions can be promoted**
  into the list; **copy Q&A from other products** (search + multi-select);
  **drag-and-drop sorting**.
- **REVIEW**: start fresh (no import).
- Original reference: `https://thefirstteam11.cafe24.com/shop2/skin-skin8/product/return-collagen-cream-50g/193/category/1/display/2/`

> Status: **plan only** — no code changed yet.
> Status: **implemented** (all phases). Verified end-to-end in a real browser
> (see §11). Rich-text deps added: `@tiptap/*`, `sanitize-html`.

---

## 1. Where the tabs live today

- Route: `src/app/products/[slug]/page.tsx` → `<ProductDetail>`.
- Component: `src/components/product/product-detail.tsx` (tab state, tab bar ~L248, panel ~L267).

| Tab        | Renders now                                        | Data source                             | Editable now?      |
| ---------- | -------------------------------------------------- | --------------------------------------- | ------------------ |
| **DETAIL** | `product.description` raw text; else "coming soon" | `Product.description`                   | only `description` |
| **INFO**   | hardcoded Name / Brand / Shipping Fee              | mostly hardcoded                        | no                 |
| **REVIEW** | hardcoded "No reviews yet." + `REVIEW(0)`          | none (`Review` model exists but unused) | no                 |
| **Q&A**    | a link to `/community/product-qa`                  | none (static `qaPosts`)                 | no                 |

**Tab order:** match the original — **`REVIEW(n) · DETAIL · INFO · Q&A`**
(REVIEW first, default tab = REVIEW). Ours currently starts with DETAIL and must
be reordered. The label shows a live count: `REVIEW(n)`.

Reusable building blocks:

- **Page builder** (pattern to mirror for DETAIL): `src/lib/page-builder/{types,registry,data}.ts`, `src/components/admin/page-builder/*` (dnd-kit reorder, add/edit dialogs, `admin-registry.ts`, `fields.tsx`).
- Dialog pattern: `src/components/product/preorder-dialog.tsx`.
- Admin image upload: `src/components/admin/image-field.tsx` → `/api/admin/upload`.
- `Review` model (`prisma/schema.prisma` L505).
- Compare tooling: `scripts/compare-page.mjs`.

**No HTML sanitizer exists today** (only `escapeHtml` for emails) → added as a dep (§3).

---

## 2. What the original actually shows (grounded in the source)

From the reference product page, the tab set and their real content:

| Ours   | Original label | Content                                                                                                                                                               |
| ------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REVIEW | `REVIEW(0)`    | Review list; empty state "There are no posts to show", **Write a Review** + **See All**.                                                                              |
| DETAIL | `DETAIL`       | 상품상세정보 — long-form detail (images + copy). Empty on the reference product.                                                                                      |
| INFO   | `INFO`         | **"MORE INFORMATION"**: **PAYMENT**, **SHIPPING** (method / area / cost / time / customs note), **RETURNS & EXCHANGES** (address + eligibility), **PRODUCT INQUIRY**. |
| Q&A    | `Q&A`          | Question list; empty state "There are no posts to show", **Product Questions** + **See All**.                                                                         |

Key consequence: **INFO is storewide policy content** (payment/shipping/returns/inquiry),
not per-product specs. It is effectively the same block on every product page.

---

## 3. DETAIL — free-form block editor

### Approach: ordered content blocks (mirror the page builder)

`type` + `config` JSON + `sortOrder` + `isActive`:

```prisma
model ProductBlock {
  id        String   @id @default(cuid())
  productId String   @map("product_id")
  type      String              // registry key, e.g. "rich-text"
  title     String?             // admin label
  config    Json                // type-specific settings (incl. style)
  sortOrder Int      @default(0) @map("sort_order")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId, sortOrder])
  @@map("product_blocks")
}
```

### Block types / freedom

| Type                | Config                                                               |
| ------------------- | -------------------------------------------------------------------- |
| `rich-text`         | HTML + `fontSize`, `fontWeight`, `color`, `align`, `maxWidth`        |
| `image`             | `src`, `widthPct`, `maxWidth`, `align`, `rounded`, `href`, `caption` |
| `image-text`        | image + text, `imageSide`, `imageWidthPct`                           |
| `gallery`           | `images[]`, `columns`, `gap`                                         |
| `heading`           | text, `level` (h2–h4), `align`                                       |
| `video`             | embed URL / file, `widthPct`, `align`                                |
| `button`            | label, href, `align`, `variant`                                      |
| `divider`, `spacer` | `height`, `style`                                                    |
| `accordion`         | items `{ q, a }` (how-to-use, ingredients, FAQ)                      |

Shared style schema: `align`, `widthPct`, `maxWidth`, `paddingY`, `textSize`, `textColor`.

### Implementation

- New `src/lib/product-blocks/{types,registry}.ts` (server renderer + zod schemas) mirrored by `src/components/admin/product-blocks/admin-registry.ts`. **Reuse the page-builder primitives** (sortable list, dialogs, `ImageField`).
- **Deps (approved):** Tiptap for the editor; `sanitize-html` for HTML, applied **on write and on render**, with a tag/attribute allow-list (no `<script>`, no event handlers, no `javascript:` URLs).
- Fallback: products with no blocks still render `Product.description` as text.

---

## 4. INFO — storewide information block

Per the original, INFO = PAYMENT / SHIPPING / RETURNS & EXCHANGES / PRODUCT INQUIRY.

### Model: global default + per-product override (confirmed)

```prisma
model ProductInfoTemplate {   // global default
  id        String   @id @default(cuid())
  key       String   @unique  @default("default")
  blocks    Json              // free repeater: ordered [{ heading, body }]
  updatedAt DateTime @updatedAt @map("updated_at")
  @@map("product_info_templates")
}
```

Plus `Product.infoRows Json?` for the **optional per-product override** of the default.

- **Free repeater (confirmed):** `{ heading, body }` rows — nothing hardcoded. A
  **new template is seeded with the four original headings** (PAYMENT, SHIPPING,
  RETURNS & EXCHANGES, PRODUCT INQUIRY) as a starting point.
- **Admin:** one editor for the global INFO content, plus an optional per-product
  override in the product form.
- **Storefront:** render the product override if present, else the global default.
- Content is admin-authored HTML/sections → sanitized the same way as DETAIL.

---

## 5. REVIEW — auth-gated, default-visible, admin hide/show

- **Only signed-in users** can submit (`requireUser()`).
- Visible **by default** once it passes server validation.
- **Admins hide/show** and delete. `isVerified` = verified-purchase badge.
- **Start fresh** — no Cafe24 import, no seeding.

```prisma
model Review {
  ...existing fields...
  isVisible Boolean @default(true) @map("is_visible")  // admin hide/show; default shown
}
```

Admin: enable the disabled "Reviews" nav item → `/admin/reviews`
(filters: product / visibility / rating; hide-show toggle; delete).
Storefront: tab lists visible reviews for the product (+ average, count);
"Write a Review" only when signed in.

---

## 6. Q&A — curated list + submissions + copy + sorting

### Behaviour

1. **Admins add Q&A per product** (question + answer).
2. **User submissions** (signed-in only, via an **"Ask a question"** popup) arrive
   as **PENDING** and are **hidden from the storefront until promoted**; admins
   **promote a good one into the list** (or discard). Only `PUBLISHED` entries
   ever render in the tab.
3. **Copy from other products:** a dialog lets an admin **search for a product**,
   select **one or multiple Q&A entries**, and copy them into the current
   product (appended).
4. **Sorting:** drag-and-drop to re-arrange the list (dnd-kit, already a dep).

### Schema

```prisma
model ProductQA {
  id            String   @id @default(cuid())
  productId     String   @map("product_id")
  question      String
  answer        String?
  sortOrder     Int      @default(0) @map("sort_order")
  isVisible     Boolean  @default(true) @map("is_visible")
  source        String   @default("ADMIN")      // ADMIN | USER
  status        String   @default("PUBLISHED")  // PUBLISHED | PENDING | DISCARDED
  submittedById String?  @map("submitted_by_id") // set when source = USER
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId, sortOrder])
  @@map("product_qa")
}
```

### UI

- **Storefront tab:** published, visible Q&A for the product in `sortOrder`
  (list / accordion). **"Ask a question"** button → popup (modelled on
  `PreorderDialog`); if not signed in → routes to `/login`.
- **Admin** (in the product edit page's **Q&A tab**):
  - Add / edit / delete / hide-show.
  - Drag to re-sort (persist `sortOrder`).
  - **Pending submissions** panel → _Add to list_ (sets PUBLISHED, appends) or discard.
  - **"Copy from product…"** button → search dialog → multi-select → copy.

### Server actions

`createQA`, `updateQA`, `deleteQA`, `toggleQAVisible`, `reorderQA(orderedIds)`,
`publishSubmission`, `discardSubmission`, `copyQA(fromProductId, ids[], toProductId)`
— all admin-guarded; submissions guarded by `requireUser()`.

---

## 7. Input validation & SQL-injection hardening (all input fields)

### Baseline

Prisma issues **parameterized** queries, so normal Prisma calls are not
injectable. Real risks:

1. `$queryRawUnsafe` / `$executeRawUnsafe` / string-built SQL → **forbid**
   (lint/review). The only raw usage today (`pg_advisory_xact_lock` in
   `src/app/actions/orders.ts`) is a parameterized template — safe.
2. **XSS** from rendering user/admin HTML → sanitizer (§3).
3. Weak validation.

### Add a shared layer

- `src/lib/validation.ts` — one zod module applied to **every** server action /
  route-handler input (reviews, Q&A, preorder, checkout, feedback, admin forms):
  strict types + max lengths.
- `src/lib/sanitize.ts`:
  - `sanitizeText()` — trim, strip NUL/control chars, collapse whitespace,
    strip/escape HTML for plain-text fields, enforce max length.
  - `looksLikeSqlInjection()` — reject/log obvious payloads
    (`'`, `--`, `;`, `/* */`, `UNION SELECT`, `OR 1=1`, …) as
    **defense-in-depth + audit logging**, not the primary control.
- Length caps + basic rate-limiting on public endpoints (reviews, questions).
- Tests for both helpers + action-level tests that malicious input is rejected
  and cannot alter rows.

---

## 8. Resolved decisions

1. **Tab order** → match the original: `REVIEW(n) · DETAIL · INFO · Q&A`.
2. **INFO scope** → global default + per-product override.
3. **INFO fields** → free repeater of `{ heading, body }`, seeded with the four
   original headings (PAYMENT / SHIPPING / RETURNS & EXCHANGES / PRODUCT INQUIRY).
4. **Q&A submissions** → hidden until promoted (only `PUBLISHED` renders).
5. **Rich-text deps** → approved (Tiptap + `sanitize-html`).
6. **Q&A** → admin-curated list + submissions + copy-from-product + sorting.
7. **Reviews** → start fresh (no import/seed).

No open questions remaining — ready to implement. (All implemented; see §11.)

---

## 9. Phased plan

| Phase                                 | Deliverable                                       | Key files                                                                               | Done when                                                                                                           |
| ------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **0. Input hardening**                | Shared validation + sanitize layer; audit raw SQL | new `src/lib/{validation,sanitize}.ts`; all server actions                              | All actions validate/sanitize; no unsafe raw SQL; tests pass                                                        |
| **1. Data model**                     | Migration + zod + data fns                        | `prisma/schema.prisma`, `prisma/migrations/*`, `src/data/products.ts`                   | `ProductBlock`, `ProductInfoTemplate`, `Review.isVisible`, `ProductQA` exist                                        |
| **2. DETAIL editor (admin)**          | Block registry + tabbed product form              | `src/lib/product-blocks/*`, `src/components/admin/product-blocks/*`, `product-form.tsx` | Admin adds/reorders/styles blocks; sizes + text styles round-trip                                                   |
| **3. Storefront DETAIL + INFO**       | Block renderer + INFO block + tab reorder         | `src/components/product/product-detail.tsx`, `src/lib/product-blocks/registry.ts`       | Tabs ordered `REVIEW · DETAIL · INFO · Q&A`; blocks render as authored; INFO shows payment/shipping/returns/inquiry |
| **4. Reviews**                        | Auth-gated submit + admin hide/show               | `src/app/admin/reviews/*`, `admin-nav.tsx`, review form, product tab                    | Signed-in user posts → visible; admin hides → gone from tab                                                         |
| **5a. Q&A list (admin + storefront)** | Curated list, add/edit/reorder, Ask popup         | `ProductQA` UI, `product-detail.tsx`, `src/app/admin/questions/*`                       | Admin curates; signed-in user asks via popup                                                                        |
| **5b. Q&A submissions + copy**        | Promote submissions; copy-from-product dialog     | admin Q&A actions + search/copy dialog                                                  | Pending → published; multi-select copy works                                                                        |
| **6. Verification**                   | Screenshot diff + tests                           | `scripts/compare-page.mjs`                                                              | No unintended diffs; validation tests pass                                                                          |

Recommended order: **0 → 1 → 2/3 → 4 → 5a → 5b → 6**.
Phase 0 first (reviews + Q&A depend on it). Phases 2–5 touch mostly disjoint
files and can be parallelized after phase 1.

---

## 10. Acceptance criteria

- **DETAIL:** admins compose a product page from blocks, freely sizing images
  and styling text (rich editor); storefront renders exactly that, sanitized.
- **INFO:** every product shows real PAYMENT / SHIPPING / RETURNS & EXCHANGES /
  PRODUCT INQUIRY content, editable from admin.
- **REVIEW:** signed-in users only; visible by default; admin hide/show/delete;
  all inputs validated & sanitized; no SQLi/XSS vector.
- **Q&A:** admin-curated sorted list per product; signed-in users ask via a
  popup and admins can promote submissions; admins can copy Q&A from other
  products via search + multi-select.
- **Tab order:** `REVIEW(n) · DETAIL · INFO · Q&A` with REVIEW as the default tab.
- No regressions at the reference viewport (`scripts/compare-page.mjs`).

---

## 11. Implementation status

All phases are implemented and verified against a running dev server.

| Phase                       | Status | What shipped                                                                                                                                                                                      |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Input hardening          | ✅     | `src/lib/sanitize.ts`, `validation.ts`, `rate-limit.ts`, `client-ip.ts`; wired into feedback/preorders/orders/products/banners/popups actions; ESLint bans `$queryRawUnsafe`/`$executeRawUnsafe`. |
| 1. Data model               | ✅     | Migration `20260930015432_product_detail_tabs` (`ProductBlock`, `ProductInfoTemplate`, `ProductQA`, `Product.infoRows`, `Review.isVisible`).                                                      |
| 2. DETAIL editor            | ✅     | `src/lib/product-blocks/*`, `src/components/admin/product-blocks/*` (10 block types + Tiptap rich text), tabbed product form.                                                                     |
| 3. Storefront DETAIL + INFO | ✅     | `src/components/product/blocks/block-renderer.tsx`; tab reorder; INFO from product override or global template.                                                                                   |
| 4. Reviews                  | ✅     | `src/data/reviews.ts`, `src/app/actions/reviews.ts`, `ReviewForm`, `/admin/reviews` with hide/show.                                                                                               |
| 5. Q&A                      | ✅     | `src/data/qa.ts`, submit action + `AskQuestionDialog`, `/admin/products/[id]/qa` (add/edit/reorder/promote/copy).                                                                                 |
| 6. Verification             | ✅     | `npm test` (29 tests), typecheck, lint, and browser E2E.                                                                                                                                          |

**Verification performed (Firefox, live DB):**

- Tabs render `REVIEW(n) · DETAIL · INFO · Q&A`, REVIEW default.
- Admin added a Heading + saved; DETAIL rendered it. Rich-text (headings/list/centered
  text) and Accordion renderers verified.
- INFO showed the four storewide sections; editing/saving the global template
  updated the storefront.
- Signed-in review submission appeared (`REVIEW(1)`, average shown); admin
  hide → `REVIEW(0)`.
- Q&A: user question stored `PENDING` (hidden); admin promoted it, added another,
  reordered, and **copied 2 entries from another product**; all published entries
  render.
- `sanitizeHtml` unit tests confirm `<script>`, inline handlers and
  `javascript:` URLs are stripped.

**Note on data:** the storewide INFO template is seeded with PAYMENT / SHIPPING /
RETURNS & EXCHANGES / PRODUCT INQUIRY, and demo DETAIL blocks + Q&A were added to
`return-collagen-cream` during verification — all editable/removable from admin.
The temporary browser-test admin account was deleted.
