# Client feedback — 2026-10-12 · analysis + plan (v2)

Sources: the full client message (below) + the `ournaraweb_261012.pptx` deck,
with the client's answers to our first-round questions folded in.
Nothing here is implemented yet — this is the approval artifact.

## 0. The client's message (verbatim requirements)

They have 42 Daiso products live, hundreds more coming, assigned to a
top-level category only. Complaints:

- Skin Care tabs read `Masks & Patches (0), Facial Care (2), Cleansing (1),
Sun Care (1), Set (0)`; Makeup reads `Base Makeup (1), Eye Makeup (0),
Lip Makeup (1)` — the only products in tabs are old samples, none of their
  real products.
- The same subcategory list shows on pages it doesn't belong to ("Hair Care"
  under Makeup).
- They cannot self-serve: the product form has one flat "Category" field; "+ New"
  creates only top-level categories; `/admin/categories` is a 404.

**What they need**

1. A subcategory field on the product form, showing only the chosen category's
   subcategories.
2. Full category-tree management in the admin: create / rename / reorder /
   delete, choose a parent.
3. Only a category's **own** subcategory tabs, and **hide tabs with no products**.
4. A bulk way to assign subcategories (CSV: product slug, category, subcategory
   — or multi-select in the product list).
5. **Their question:** can a product belong to more than one subcategory?
   (e.g. a cleansing tissue fits both Cleansing and Masks & Patches.)

## 1. Answers we have from the client review

| Slide              | Answer                                                                                                                                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9 (reviews)        | Only the "REAL REVIEWS" eyebrow text goes; keep the section and "What Our Customers Say".                                                                                                                                                       |
| 2 (store picker)   | Rebuild the popup to the mock: a flag/logo per store, distinct highlight for the selected store, **unselected store's button grayed out (#E2E2E2** — it is purple today), checkbox‑style "Don't show again today", and fix the suppression bug. |
| 12 (ambassador)    | Remove the eyebrow and the subtitle; keep only "OUR:NARA Ambassador" (current font).                                                                                                                                                            |
| 8 (brands)         | 3 brand groups; admins assign each brand to one. Show the **brand image** (fallback: name). Layout: title → 2 banners in one row → tabs → brand grid → A–Z index. Fonts/text style per the site's existing (original) pages.                    |
| 6 (brand sections) | Change only NOWATER / SKIN APPLE / HYGEE; admin must support up to **3 banners** per section, each either a full image or a "custom" styled banner, all created from uploaded images in the dashboard.                                          |
| assets             | Everything must be uploaded/managed in the admin dashboard.                                                                                                                                                                                     |

## 2. Root cause (confirmed)

`src/data/subcategories.ts` is code: the per-category tab lists **and** a
hardcoded `productSlug → subcategory` map (~22 legacy products). The DB
`Category` supports `parentId`, but only 5 roots exist and every product points
at a root; there is no admin UI to create children or assign them. Dev DB:
**126 of 148 products unassigned**; the tab counts only count the legacy map.

## 3. Design decisions to approve

### D1 — Subcategories = the existing Category tree (DB), not a new concept

- `Category` gains `image` (tile art) and `isActive`; `parentId`/`sortOrder`
  already exist.
- Category pages list a root's products **including its children**; `?sub=`
  filters by child slug (URLs stay shareable).
- Header submenu + category tabs read the DB (cached); the static extra nav
  items (BRAND, REVIEW, …) stay.
- Tabs rule (client #3): only the category's own subcategories, and only those
  with ≥1 product. For pseudo-category PRE-ORDER, tabs derive from the
  subcategories its products actually carry (no manual list to maintain).

### D2 — A product can be in **multiple** subcategories — CONFIRMED

The cleansing-tissue case (Cleansing **and** Masks & Patches) is exactly how the
original Cafe24 catalog behaved, and hundreds of products make "pick one" a
constant source of wrong guesses. Confirmed by the client.

- New join table `ProductSubcategory` (`productId`, `categoryId`, unique pair).
- `Product.categoryId` stays the primary/top-level (breadcrumb, admin list);
  subcategory assignment is the new 0..n list, editable in the product form.
- A category page shows a product once, whichever of its subcategories matched.
- The product form, bulk assign and CSV all accept several subcategories.

### D3 — Everything content-side becomes admin-managed

Per the client's asset requirement, every new visual is uploaded in the
dashboard: category/subcategory tile images, brand images, category-page
banners, brand-section banners, event cards, the ambassador long image,
store-picker flags/logos.

### D4 — Ambassador page: sticky form beside scrolling long images — CONFIRMED

Reference pattern (client's `charcoalkorea.store` example, inverted for us):

- Section = two columns. **Left**: the long-form detail images, stacked
  (reuses the gapless image renderer — "like on the detail page"). **Right**:
  the application form, `position: sticky` inside the section, pinned below the
  header while the left column scrolls, and released exactly when the visitor
  reaches the end of the section (pure CSS sticky inside the section wrapper).
- Phones/tablets: single column — images, then the form (no sticky), so the
  form is never cramped beside the images.
- The left-column images are an ordered, admin-uploadable list
  (`/admin/site` → Ambassador page), each with an optional link, using the
  existing upload field.
- The form keeps every field we have today (name, email, phone + code, country,
  city, Instagram, TikTok, YouTube, blog, followers) **plus** the mock's
  additions — Gender, Product (the one they want to apply for), Address — i.e.
  the full superset the client asked for.

## 4. Workstreams

### W1 — Category tree + subcategories (headline; client needs 1–4)

- **Schema/migration**: `Category.image`, `Category.isActive`,
  `ProductSubcategory`; migration script seeding the children from today's
  static lists and assigning the legacy products (dry-run report first), plus
  name-based suggestions for the rest (Daiso etc.) to review.
- **Storefront**: category page + header read the tree; child-aware queries
  (`getProductsByCategorySlug`, page-builder "by category" source, coupon
  scope by category); tabs = own children with products.
- **Admin (self-serve)**:
  - New `/admin/categories` page + sidebar item: tree CRUD (create, rename,
    reorder, delete, choose parent, image upload, active toggle).
  - Product form: two-step category picker — pick the top-level, then its
    children (multi-select per D2); inline "+ New subcategory" for the chosen
    parent.
  - Products list: subcategory filter + multi-select with an **"Assign
    subcategory"** bulk action.
  - **CSV import** for bulk mapping (`product slug, category, subcategory`,
    repeatable sub-column) with a dry-run diff before writing — this is what
    they'll use for the hundreds coming.
- **Import script** (`scripts/import-from-live.ts`): map the source category
  path to a subcategory instead of name-guessing only.
- **Tests**: tree/resolution logic, tab hiding, dedupe across multiple
  subcategories, CSV parsing.

### W2 — Category page design (slide 7, "applies to all category pages")

- Mid-level row = **image tiles** (image + name, "All" first; missing image →
  name only), horizontally scrollable on phones, replacing the text chips.
- Below: **2 banners side by side**, then a **long banner carousel**
  (multi-image), then the count/sort toolbar + grid. Filters sidebar stays.
- Admin: `Banner.categoryId` scope + placements `category-top` (pair) and
  `category-long`; existing CRUD/schedule reused.

### W3 — Homepage

- **Slide 5** — triple banner becomes a **tabbed showcase** (page-builder
  section): tab row → animated panel with the banner (linked to brand/category)
  - curated product row; site margins kept.
- **Slide 6** — NOWATER / SKIN APPLE / HYGEE get **up to 3 banners** above the
  section, admin-created: "image" style (upload only) or "custom" style
  (image/background + title/subtitle + link + accent), so they can rebuild the
  mock banners from uploads.
- **Slide 9** — remove only the "REAL REVIEWS" eyebrow from the home reviews
  section (keep heading, cards, Write a Review).

### W4 — Product detail (slides 3–4)

- Title block: smaller name, brand above, K-Drop mark moved under the name next
  to the PRE-ORDER badge (mock).
- DETAIL tab: consecutive image blocks render **gapless/full-bleed**; per-block
  admin toggle "join to previous" for mixed layouts (same renderer reused for
  the ambassador long image).

### W5 — Store picker (slide 2)

- **Fix**: "Don't show again today" must suppress the popup for 24 h on every
  frequency (today only `day` popups honour it) + regression tests.
- **Rebuild UI to the mock**: per-store flag/logo (`icon` field, uploaded in
  `/admin/site`), selected card = accent border + tinted background, unselected
  = plain card with **gray #E2E2E2 action button**, selected = "You are here"
  tinted; footer checkbox + Close; keep the X.

### W6 — Page polish

- **Brands (8)**: heading font/margins matched to the category pages; 2 banners
  in one row; 3 group tabs (All / Only At Ournara / New Launch — `Brand.group`
  field, admin-assigned); brand image grid (`Brand.logoUrl`, fallback to name);
  A–Z index below. Brands admin gets the group select + image upload.
- **Stores (11)**: heading font/margins only.
- **Events (10)**: drop eyebrow + subtitle; image cards with text bottom-left;
  events become admin-managed (image, title, text, link, schedule) so the
  client can run campaigns themselves.
- **Ambassador (12)**: drop eyebrow + subtitle, keep title; **sticky layout per
  D4** — long image column left, form pinned right until the section ends;
  form fields per D4; images uploaded in the admin dashboard.
- **Site-wide link audit (1)**: images/buttons that should navigate, do
  (known gaps: triple-banner banner images, assorted decorative blocks).

## 5. Status

All first-round questions are resolved: multi-subcategory allowed (D2),
ambassador texts + sticky layout + full form (D4), brands page grouping with
images, three banner slots for the three brand sections, gray #E2E2E2 button on
the non-current store card, and everything content-side admin-uploadable.

### Shipped (review slide by slide)

| Slide                | What to look at                                                                                                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 (links)            | Banners, tiles, reviews, shorts, Instagram posts, cart thumbnails and the triple-banner panels all navigate. Header targets all resolve.                                                                                               |
| 2 (store picker)     | Non-current store button is `#E2E2E2`; the popup matches the mock; "Don't show again today" suppresses the popup in every frequency, including a new session.                                                                          |
| 3–4 (product detail) | Title block + K-Drop placement; consecutive DETAIL images run gapless, with a per-image "join above" toggle.                                                                                                                           |
| 5 (home tabs)        | Triple banner became the tabbed showcase (Brightening / Firm & Glow / Lifting); the banner links to its brand; the panel fades in.                                                                                                     |
| 6 (brand banners)    | Up to three admin-built banners above NOWATER / SKIN APPLE / HYGEE (and any other section).                                                                                                                                            |
| 7 (category pages)   | Mid-level image tiles, then the top banner pair, then the long carousel, over the listing.                                                                                                                                             |
| 8 (brands)           | Title → banners → All / Only At Ournara / New Launch tabs → brand image grid → A–Z index. Groups and images are set per brand in the admin.                                                                                            |
| 9 (reviews)          | "REAL REVIEWS" eyebrow removed; heading and cards untouched.                                                                                                                                                                           |
| 10 (events)          | Title + image cards with the text bottom-left; events are admin-managed (`/admin/events`). No artwork yet, so cards render as brand panels until images are uploaded.                                                                  |
| 11 (stores)          | Heading font/margins match the other listing pages; the map/cards are untouched.                                                                                                                                                       |
| 12 (ambassador)      | Eyebrow and subtitle gone; long images left, the form pinned right until the section ends (one column on phones); form is the full superset (gender, product, address included). Upload artwork under Site settings → Ambassador page. |

### Deliberate choices worth knowing

- The old `triple-banner` section type still exists in the page builder (it is
  just no longer used by the home page) so any page that already used it keeps
  working; its panels now take an optional link.
- `Brand.group` stores `ONLY_AT_OURNARA` / `NEW_LAUNCH` (null = All only).
  NOWATER and DR.PEPTI are seeded into Only At Ournara as the house brands;
  the rest are unassigned until the client sorts them.
- Event card images are optional: cards without one render on the brand
  gradient so the page never looks broken.
- The ambassador page is a page-builder page (round three): its images and
  form copy are edited under Pages → Ambassador, not Site settings.
- What remains is content, not code: uploaded artwork (banners, brand
  images, event images, ambassador images, category tiles) through the
  dashboard.

## 6. Round two (review feedback)

| Item              | What changed                                                                                                                                                                                                                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Store popup    | India card leads with the India flag; the international card shows the KDrop wordmark instead of the name. Both are editable under Site settings → Store picker (flag/logo + "Title image").                                                                                                                           |
| 2. Showcase admin | The tab editor collapses to summary rows and no longer overflows; links everywhere are pickers (with a new "Store page" kind) instead of raw URLs; the section has a Banner height setting in pixels, 400 by default.                                                                                                  |
| 3. Long banner    | Superseded in round three (§7): the section now has **two cells, one banner each**, at the original strip's proportions.                                                                                                                                                                                               |
| 4. Category page  | Subcategory artwork renders as-is (only the letter fallback stays circular); the page's banners are reachable from /admin/categories (banners icon) and /admin/banners now filters by category and shows which category a banner belongs to.                                                                           |
| 5. Brands page    | Superseded in round three (§7): the tabs and list stay, the preview grid gained a size control and no longer fills the whole page.                                                                                                                                                                                     |
| 6. Events         | Live preview beside the edit form; every card has the same fixed height (image or not); a colour picker for cards without artwork; order set by arrows on the list (no sort field in the form); links use the shared picker.                                                                                           |
| 7. Stores         | The card's phone/email fall back to the storefront's contact details when a store row is empty; the admin list shows each store's phone and email; failed saves are surfaced. The two storefronts keep separate store records — the missing phone was the International row; saves were verified against the database. |
| 8. Ambassador     | Superseded in round three (§7): the page is now built from a page-builder section and pins while its images advance one by one.                                                                                                                                                                                        |

## 7. Round three (review feedback)

| Item             | What changed                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Store popup   | Both cards are the same height and their rows line up: the title sits in a fixed-height row and the call to action is pinned to the bottom. The unselected store's button is grey; the current store's is the light purple "You are here". The India card leads with the flag, the other with the KDrop wordmark.                                                                                                                                    |
| 2. Long banner   | The component is **two cells side by side** (stacked on phones), each showing exactly one banner — "Automatic" picks the next active long banner no other cell uses, or the admin picks one per cell under Pages → Home → Long banner. Height is back to the original strip's proportions inside the usual 92% / 1560px container.                                                                                                                   |
| 3. Category page | A tile with artwork is a plain rectangle — no rounding, no border, nothing cropped; only the letter fallback is a circle. The mid-level image row is no longer clipped by the title block.                                                                                                                                                                                                                                                           |
| 4. Brands page   | Preview tiles are 100px tall by default, and Site settings → Brands page controls tile height (px), columns and rows. Tiles beyond that count stay in the list under the A–Z circles.                                                                                                                                                                                                                                                                |
| 5. Ambassador    | Editing moved from Site settings into the page builder (Pages → Ambassador → Ambassador stage): any number of images with alt text and links, plus the form's heading and introduction. The stage is full-bleed, pins to the viewport while the visitor scrolls, and changes one image per screen of scroll; once the last image is reached the page scrolls on. The form is the whole right half and scrolls inside its column. No sliders or dots. |

## 8. Round four (review feedback)

| Item                | What changed                                                                                                                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Long banner      | Every cell now has a **"None (hide this cell)"** option next to "Automatic" and the banner list. One cell on None leaves the other banner full-width (the strip's original size); both on None hide the whole section.                       |
| 2. Scroll-to-top    | The floating actions (recent views + scroll to top) moved from the home page into the site layout, so they appear on every storefront page exactly as on the home page. The admin dashboard is excluded.                                     |
| 3. Ambassador admin | Pasting an image URL into any image field now applies it on the spot — a success toast ("Image URL set") confirms it, and anything unusable raises a clear error instead of silently waiting for "Set URL". Enter still applies a typed URL. |
| 4. Ambassador page  | Superseded in round five (§9): the segment bar was removed again, and the form now fills its column.                                                                                                                                         |

## 9. Round five (review feedback)

| Item               | What changed                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Ambassador page | The segment indicators are gone entirely — only the images advance, nothing is drawn over them. The form no longer has a fixed width: it fills the whole right column (only the column's own 32px inset remains), so every field stretches edge to edge.                                                                                                                            |
| 2. Image upload    | The "Set URL" (and "Add URL") buttons are gone: pasting applies the URL immediately, typing one and pressing Enter still works, and Upload / Clear stay. Nothing to click after a paste.                                                                                                                                                                                            |
| 3. Header menu     | The category menu now scrolls properly at every width. Below 1200px it was already a native scroller; from 1200px up the strip is clipped (so the hover submenus can still open) and round left/right arrows shift it, appearing only while there is more to reach in that direction — tablets can finally reach B2B and AMBASSADOR. A clear trackpad sideways swipe nudges it too. |
