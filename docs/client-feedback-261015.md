# Client feedback — 2026-10-15 · round eight (implementation notes)

Sources: the written task list for `WEBSITE261015.pptx` (15 items) and the
client's **latest deck available in the project**, `ournaraweb_261013..pptx`
(slides 1–15, with the annotated screenshots and the ①/② markers). The
referenced `WEBSITE261015.pptx` file itself was **not** in the repository or on
this machine, so where the written list and the 261013 deck disagreed the
written list won; anything that only the missing deck could settle is flagged at
the bottom.

## What shipped, task by task

| #   | Task                                                                                     | What changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | All images and buttons have links                                                        | Audited every storefront page (home, product, category, brand, brands, event, review, stores, cart, about) by walking the live DOM for images outside links/buttons and buttons without handlers. Fixed the two real gaps: the product card's **wishlist heart** now toggles a DB-backed wishlist (and sends guests to sign in), and the **K-Drop mark** is part of the product-name link instead of sitting beside it. The Shorts pick that had no product link (`T1 Prestige73 Collagen Mask 70g`) now points at its product page.                                      |
| 2   | Product card + product information layout; Pretendard names; smaller names; option moved | Product detail (the client's slide 1) now reads top to bottom exactly as asked: **brand → product name → K-Drop icon + PRE-ORDER label → description → price → variants → the rest**. The name is Pretendard (`font-category`) one step smaller (24px → 20/22px); the **price row is right-aligned** (the compare-at price sits to its left); the **variant selector sits directly under the price**, ahead of the shipping-fee line, the buy/pre-order button and the delivery progress bar. Card and page keep names, prices, options, images and links wired together. |
| 3   | Category navigation layout + margins + no rounded edges + click animation                | The home showcase (the category tabs ① over the banner ②) keeps the site's 92% / 1560px margins and its banner is **square** (the filters were squared for this round and rounded again on the client's slide-2 review, below). The banner keeps the admin-set height; switching a filter slides the banner track while the product row fades in (`showcase-products`, both respecting reduced motion), so switching never shifts the page.                                                                                                                               |
| 4   | Click ① → ② shows that content; banner ② opens the brand                                 | Verified end to end: picking a tab swaps the banner, its brand link and its curated product row; the banner is one link to that brand (`/brand/…`); previous/next arrows step the same row with wrap-around and proper labels; `role="tab"`/`tabpanel`, `aria-selected`, `aria-controls` and keyboard activation all work.                                                                                                                                                                                                                                                |
| 5   | One layout → two                                                                         | The home strip between the PRE-ORDER grid and the first brand section is now the **two-cell layout** (two banners side by side, stacked on phones) exactly like the page builder's version, instead of a one-at-a-time carousel. One banner still spans the strip when only one is active.                                                                                                                                                                                                                                                                                |
| 6   | SKIN APPLE and HYGEE get the same layout above their sections                            | Brand sections now render their own **banner row above the product grid** from a new `brand-section` banner placement (per brand, up to three, two share the row). SKIN APPLE and HYGEE use the same shared `ProductGridSection` + `ShowcaseBanners` as NOWATER, so all three are identical by construction. Banners are uploaded in `/admin/banners` (placement "Brand section", pick the brand).                                                                                                                                                                        |
| 7   | Main category typography on every product page                                           | Every "main category" heading — category pages, brand pages, the brands page, review pages, stores, B2B, events, ambassador and the other interior pages that share `PageHeader` — now renders in **Pretendard** through the new `font-category` token instead of the Playfair display serif. The category page keeps its centred title, image-tile row, banner pair and long banner.                                                                                                                                                                                     |
| 8   | Layout of the section with items ① ② ③                                                   | The brand directory's three group tabs (**All / Only At Ournara / New Launch**) now sit directly under the "BRAND" title as one full-width row, and the promo banners moved below them — the order the slide-8 reference shows (title + tabs → banners → brand tiles → A–Z index → list). The three items keep their labels, their content and their filtering behaviour.                                                                                                                                                                                                 |
| 9   | Remove the indicated element + main category font                                        | The **"REAL REVIEWS" eyebrow is gone from `/review`** as well (the home section lost it in an earlier round); the heading "What Our Customers Say" stays and is Pretendard on both. The removed element is the only thing that changed — cards, counts and the Write-a-Review button are untouched.                                                                                                                                                                                                                                                                       |
| 10  | Image section + text position + remove element                                           | Event cards are now a **square (1:1) image box** with `object-cover`, so an upload fills the box without distortion, and the text stays in the bottom-left corner as the reference shows. The element the slide marks for removal (the old card's "See coupons" button) does not exist in the current card, so nothing else was taken away.                                                                                                                                                                                                                               |
| 11  | Events main category typography                                                          | The Events heading is Pretendard (the shared `PageHeader`), applied everywhere that header is reused. Content, grid and links are unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 12  | Banner images on individual brand pages                                                  | New `BrandBanner` component + `Brand.coverUrl` wired end to end: each brand page renders **its own** banner, and admins upload it per brand in **Brands → Edit → "Brand page banner"**. A brand without artwork renders no frame at all, so the page never shows an empty box. The banner is the page's own artwork, so it carries no link. **Superseded by slide 7** (below): the banner is now a full-bleed raw image at an admin-set height, 300px by default, with a preview in the same dialog.                                                                      |
| 13  | Verify and update the brand list                                                         | Verified against the live catalogue: **all ten brands the client listed exist, are active and have products**, with the exact display names they used (Prelude Dinto, TAG, ZOOM by JUNGSAEMMOOL, JMsolution, IPKN, BONCEPT, VOV, MIMO by MAMONDE, MEDIPEEL, VT). `tests/client-brands.test.ts` guards this from now on, so a future import can't quietly drop one. No duplicates were created and no names were changed.                                                                                                                                                  |
| 14  | Add the missing brand to the specified section                                           | **Not completed — needs the deck.** See below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 15  | Final validation                                                                         | `npm run build`, `npx tsc --noEmit`, `npx eslint`, `npm test` (163 tests) all pass; the affected pages were checked in a real browser at 1440px, 834px and 390px wide.                                                                                                                                                                                                                                                                                                                                                                                                    |

## Round eight, slide by slide (the client's own numbering)

The client walked the deck one slide at a time, which renumbered a few items.

### Slide 1 — product view page

Confirmed in place: product name in Pretendard, one size smaller, and the
panel reads brand → name → K-Drop icon + PRE-ORDER label → description →
**right-aligned price** → **variant selector** → the rest. The variant block sits
directly under the price, ahead of the shipping-fee line and the delivery
progress bar.

### Slide 2 — home tabbed showcase (section 4)

| Item                                                    | What changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Title above the filters, hidden while empty          | New optional section **Title** (page builder). Empty by default, so nothing renders until the client fills it in.                                                                                                                                                                                                                                                                                                                                                                                  |
| 2. Rounded, scrollable, dynamic filters; brand attached | The filter buttons are rounded pills again and the row scrolls sideways when there are more than fit. Each filter now carries a **brand** (`brandSlug`): the product picker in the builder lists that brand's products, filters can be added/removed/reordered, and the label falls back to the brand name when left empty.                                                                                                                                                                        |
| 3. Square banner inside the page margins, admin height  | The banner keeps the storefront's left/right margins (92% / 1560px, the same box the filters and the product row use — it is **not** full bleed, after the client's correction), square corners, and the section's **Banner height (px)** setting. Its ‹ › arrows are small round buttons (36px, white with a shadow, dark chevron) centred vertically on the banner, one inset at each side, wrapping at both ends — they replace the full-height translucent bars that used to sit on the edges. |
| 4. Columns and rows per brand                           | Every filter has its own **Columns** and **Rows**; the row shows at most `columns × rows` products (the editor prints the cap as you type). The section keeps a default columns value for filters that don't set one.                                                                                                                                                                                                                                                                              |
| 5. Clicking the brand opens the brand page              | The whole banner slide is one link. It defaults to the attached brand's page (`/brand/<slug>`); the old “Banner link” field remains as an optional override.                                                                                                                                                                                                                                                                                                                                       |
| 6. Transitions when switching                           | Every filter's banner lives on one horizontal track, so a filter click or an arrow **slides** the strip to that slide (500 ms ease-out, direction follows the movement, `motion-reduce` disables it). Off-screen slides are `aria-hidden` and out of the tab order. The product row below takes no part in the slide — it **fades** in on each change (350 ms opacity only).                                                                                                                       |

Because the client had already built four filters (ZOOOM, VT, NOWATER, Dinto)
before these fields existed, a one-off script
(`scripts/backfill-showcase-filters.ts`) attached each of them to the brand its
own products belong to — derived from the data, never guessed — and recorded a
row count that keeps every product the filter already showed:

- `ZOOOM ` → `zoom-by-jungsaemmool`, rows 2 (its 6 products: 4 ZOOM + 2 NOWATER)
- `VT` → `vt`, rows 1 · `NOWATER` → `nowater`, rows 1
- `Dinto` → `prelude-dinto`, rows 1 — this filter's banner had **no link at
  all**; it now opens `/brand/prelude-dinto`

The script is a dry run unless `--apply` is passed, and only adds the new
fields — labels, images, headlines, links and product lists are untouched.

### Slide 3 — the home long banner and the banner editor

| Item                                           | What changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. No more placement / sort order on a banner  | Both fields are gone from the banner form. A banner is standalone media: the component showing it owns _where_ it goes. The banner list now says **“Used in”** (informational, and “Not placed yet” when nothing points at it) and shows the **content type** instead of the old order column.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2. Columns, max 3, with “None” per column      | The long banner section has a **Columns** setting (1–3). It always keeps that many slots, each with Automatic / **None** / a banner; a column on “None” hands its width to the others, and every column on “None” hides the section. Raising and lowering the count keeps the banners already picked for the hidden slots.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 3. Height controller                           | New **Height (px)** setting. `0` (the default) keeps each banner's own proportions — exactly what the strip did before, so nothing moved on the live page — and any pixel value pins the strip's height.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 4. Long-banner preview                         | The section editor renders a live preview of the strip: the real banners, at the configured column count and height, updating as the pickers change. It draws from the same pool the storefront does (active banners inside their schedule) and resolves the columns through the same shared helpers as the loader (`normalizeLongBannerSlots`, `resolveLongBannerCells`), so the preview cannot drift from the page — with height `0` it uses the storefront cell's own classes, and a pinned height uses the same quoted box the banner editor shows.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 5. Full control of the content inside a banner | The banner form gained a **Content inside the banner** panel: type of content (image only / image with text), heading, subheading, text placement across (left / centre / right) and down (top / middle / bottom), text colour and the scrim behind it. The storefront renders all of it, and the long banner, brand-section rows and previews all draw a banner through one shared renderer so it looks the same everywhere.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 6. Previews at the sizes a banner is used      | The banner editor ends with a **Preview** panel: the artwork in every box the storefront uses it in — long banner at 1, 2 and 3 columns, the phone strip, the hero's portrait slide, and one of a brand-section/category pair. The long-banner frames read that section's own settings and quote the widest the page goes (the 1560px container's 1544px content column, minus the 10px gaps): with height `0` each cell keeps the strip's 2172 × 260 proportions (1 column ≈ 1544 × 185, 2 ≈ 767 × 92, 3 ≈ 508 × 61), and a pinned height renders as the column's width × that height (2 columns at 100px ≈ 767 × 100). Both admin previews get their boxes from one shared `longBannerCellBox`, so they always agree with each other and with the page. The cells also quote the storefront's 16px corner as a share of the strip (`LONG_BANNER_PREVIEW_RADIUS`, 1.04cqw ≈ 16px per 1544px) — a fixed 16px on a preview cell a third of the size read about twice as round as the page (the client's note). |

The category page's banners and the brands page's banners used to be assigned by the banner's own placement. Since that field is gone, each page now picks its own:

- **Category pages**: `/admin/categories` → edit a top-level category → **Page banners** (a top pair + a searchable list for the long banner and a pick for the ad block). Picking a banner that sits on another category moves it, and unpicking detaches it (never deletes it) — `setCategoryPageBanners` writes the same `placement`/`categoryId` the storefront already reads. **Moved:** after the client's follow-up, page configuration lives under **Pages** (see Slide 4 below), so this block now sits at `/admin/pages/category/<slug>`.
- **Brands page**: Site settings → Brands page → **Top banner 1/2**, stored with the rest of that page's settings. **Moved:** now at `/admin/pages/brands` (Slide 4).

### Slide 4 — page titles, and the category page's long banner and ad block

**Titles.** Every start-of-page title renders in Pretendard. The category pages,
brand pages and the brands page already did; the last serif holdouts are fixed
too: `/search` (“Search products”), `/community` and its boards, `/help`,
`/login`, `/join`, the 404/error pages, the product page's “More from <brand>”
heading, and the brand-name fallback tiles on `/brands`. Everything without an
explicit font class already used Pretendard (the body font), so the audit was
“every remaining `font-display` heading on a storefront page”.

**Category pages: a long banner and a promo block, set once for all of them.**
Both are admin-controlled, both render under the mid-level filter tiles (the
block position the slide-8 reference showed) inside the page container, so they
line up with the filter sidebar and the product grid, and both have a live
preview in the editor:

- **All category pages** (the screen's first tab) is the default: the long
  banner (one banner per column — one runs full width, two or three share the
  row, phones stack — up to three picks, plus a **Height (px)** setting where `0`
  keeps each banner's own proportions) and the promo block (one image + its own
  height). Every listing renders these blocks.
- **A single listing** either follows that default or is **customised**: the
  customise button opens the same editor for that page, and while it follows the
  default it can **hide** either block on its own — so an all-pages promo can be
  switched off on one listing without touching the rest.
- The strip is the shared `LongBannerCells` + `BannerArtwork`, so the banner
  content the client asked to “copy here” — heading, subheading, text placement,
  colour and scrim — shows on the category pages exactly as on the home page.
  The old auto-rotating carousel (arrows, bullets) went with it: it was the one
  place that ignored those controls. `LongBannerCells` takes a `framed` prop so
  the home page keeps its own 92% container while the listings render it bare.
- **One banner block, not two.** The old “top pair” (two side-by-side images in
  a section of its own) is gone: two columns of the long banner are exactly that,
  and the editor no longer offers the same thing twice. Banners that sat in a
  top pair were returned to the standalone pool by the migration.
- **“Ad block” is now the promo block**, and it is a _reference_ to a banner
  rather than a claim on it: the picker offers **every** banner — including the
  ones the long banner uses — and picking one never pulls it out of the strip
  (client's follow-up). The labels in the admin and the component
  (`PromoBanner`) follow the rename, and the heights column is `promo_height`.

**Storage, per store.** Each store keeps its own blocks (client's follow-up: the
category screen gets the same India / International tabs as the brands page).
The **all-pages** configuration is four columns on that store's `SiteConfig` —
`categoryLongBannerIds`, `categoryLongBannerHeight`, `categoryPromoBannerId`,
`categoryPromoHeight` — and a page that does _not_ follow it keeps its own copy
in `Category.pageBanners`, one JSON slice per store
(`{ local: {...}, global: {...} }`: `mode`, `hidden`, `long`, `longHeight`,
`promoId`, `promoHeight`). Both are **references** (banner ids), so the same
banner can sit in a block here and in another block elsewhere — nothing is
claimed, moved or detached. The storefront resolves a page with
`getCategoryPageBlocks(category, version)` against
`getCategoryAllPagesBlocks(version)`; the saves are `setCategoryPageBanners`
(one page) and `setCategoryPageDefaults` (all pages) in
`src/app/admin/pages/actions.ts`, and both refuse an id no banner has.

Migration `20261017001500_category_blocks_per_store` carries the old flat columns
(`Category.pageBannersMode` / `hiddenBlocks` / `promoBannerId` / `promoHeight`,
`SiteConfig.categoryLongBannerHeight` / `categoryPromoBannerId` /
`categoryPromoHeight`) into both stores' slices, then clears the retired
`category-long` placements and any `categoryId` they carried — the strip's picks
are ids now, so a banner no longer sits “on” a category.

**Follow-up — page configuration lives under Pages.** The Pages screen is now
the single home for per-page settings, and one list of every configurable page
— home, ambassador, the brands directory and the category listings — since they
all do the same thing (update what their page shows) and differ only in the
options they offer. The category listings share one screen, so they are one row
(“Category pages · 4 pages · none set up yet” until something is picked); the
other rows name their configuration (“18 sections”, “Banners · preview grid”)
and carry a **Hidden** chip when the page is off. Each row opens its screen:

- `/admin/pages/brands` — the directory's preview grid and the banners above it
  (moved out of Site settings, which keeps the store-wide content: contact
  details, top banner, store picker, delivery, tax, invoice). This is where the
  slide-4 follow-up landed for it, and it now lives with the banner pickers it
  belongs to.
- `/admin/pages/category` — **one** screen for every category listing, with the
  same India / International tabs as the brands page: the first tab is that
  store's all-pages default, each listing tab follows it, hides a block or is
  customised (a `?category=<slug>` opens it on that one). They all do the same
  thing and differ only in which banners they hold, so one screen serves them
  all, and edits for the other pages are kept while you switch.

`/admin/categories` is back to the tree alone — name, slug, tile, order,
visibility and subcategories — with a gear shortcut on each top-level row that
opens its page settings.

### Slide 6 — the brands page's long banner and promo block

`/brands` gets the same two blocks as the category pages, in the same order:
**title → long banner → promo block → group tabs → preview grid → A–Z → list**.
The long banner is the shared strip (one banner per column, up to three, plus a
**Height (px)** setting) and the promo is one image with its own height — **empty
by default**, so nothing renders between the title and the tabs until a banner is
picked. Both are configured on the existing **Pages → Brands page** screen, whose
“Top banners” pair was folded into the strip (two columns are exactly a pair),
and both are _references_: a banner can sit here and on a category page at once.
The picker fields, heights and previews are literally the same component the
category screen uses (`src/components/admin/banner-blocks-fields.tsx`), so the
two screens cannot drift apart — and both now have the same India /
International tabs, each store with its own blocks and its own previews.

Migration `20261016235500_brands_page_blocks`: renames `brands_banner_ids` →
`brands_long_banner_ids`, adds `brands_long_banner_height`,
`brands_promo_banner_id` and `brands_promo_height`, and returns any banner that
used the old `brand-top` placement (now removed from the placement list) to the
standalone pool.

**The same slide: the event card's background image.** `/admin/events` → new/
edit now lets an admin upload artwork that covers the whole card and _frame_ it:
the card in the right-hand column is the storefront's own component rendered at
the 600px box `/event`'s grid gives it and scaled to fit the panel, so its
corner, type and crop are the page's (that is what the “too round” note was
about — a preview drawn at the panel's own width reads rounder and larger than
the page). Dragging it moves the artwork, and three sliders (horizontal,
vertical, zoom) do the same from the keyboard, with **Reset framing** back to
plain cover. The image always covers the card (`object-cover`), the focus is the
`object-position` the storefront uses, and the zoom magnifies around that same
focus point, so zooming never walks away from what was picked.

- `src/lib/event-background.ts` holds the rules — defaults (50% / 50% / 100%,
  giving exactly the cover the cards already rendered), clamps, the style the
  card carries, the reference box and the preview scale — and both the card and
  the editor's preview read it, so they cannot drift.
- Migration `20261017020000_event_background_framing`: `events.image_focus_x`,
  `image_focus_y` (percentages) and `image_zoom` (100–250), all defaulted, so
  existing rows render unchanged.
- The old bug where a picked-but-unsaved file never reached the card preview is
  gone (`ImageField`'s `onPreviewChange` is wired up), and the hover zoom now
  sits on a frame _around_ the image so the admin's framing cannot overwrite it.

### Slide 7 — the brand page's banner

A brand page now reads **banner → breadcrumb → logo and name → product grid**.
The banner is one raw image, **full width**: it sits outside the page container,
so it runs edge to edge with no margins, no rounding and no text over it, and it
is drawn at the height the admin sets — **300px by default** — with
`object-cover`, so any upload fills the strip without distortion. A brand without
artwork renders nothing and the rest of the page is exactly what it was (same
container, same spacing), so banners can be added brand by brand.

It is edited where the rest of a brand is: **Brands → Edit**, the single brand
editing dialog, which now carries the banner image, a **Banner height (px)**
field and a **preview** that draws the storefront's own `BrandBanner` at 1440px
wide — the width a full-bleed strip has on a desktop screen, which matters
because a fixed-height `object-cover` crop depends on it — then scales the whole
picture down to the dialog. `src/components/admin/scaled-preview.tsx` is that
wrapper; `src/lib/brand-banner.ts` holds the default, the limits (60–900) and the
reference width, read by the renderer, the action and the preview alike, so the
three cannot disagree. Migration `20261017030000_brand_banner_height` adds
`brands.banner_height`.

### Slide 8 — the review pages

The eyebrow is gone from the reviews. The listing page (`/review`) had already
lost its “REAL REVIEWS” line in an earlier round; the one still on the site was
the **review detail page** (`/review/<id>`), whose `PageHeader` carried
`eyebrow="Real Reviews"` — that is the element the client is pointing at, and it
is removed. Both headers now go straight to the heading:

- `/review` — “What Our Customers Say”.
- `/review/<id>` — “Review by <author>” over “On <product>”.

**Typography.** Both are “main category” headings and render in **Pretendard**
through `font-category`, which is what `PageHeader` has used since slide 10/11 of
the earlier round; the detail page was already covered by it, and switching the
eyebrow off changes nothing there. Confirmed in the browser from the computed
style (`Pretendard, Poppins, "Noto Sans KR", …`) and `document.fonts.check("1em
Pretendard")`, not just from the class name, so the font is genuinely loaded and
not falling back. The review card titles, body and star ratings are untouched.

Nothing else on either page carried the wording: the home reviews section's
heading was already “What Our Customers Say”, and the only other mention left in
the codebase is the page builder's internal section description (“Real reviews
carousel.”), which is an admin-facing label for the section, not storefront copy.

## New / changed infrastructure

- **Slide 3 migrations** (both additive, run `npx prisma migrate deploy` when
  releasing): `20261016080550_banner_content_controls` adds the
  content-inside-a-banner fields to `Banner` (style, heading, subheading,
  textAlign, textVAlign, textColor, scrim), and
  `20261016085049_brands_page_banners` adds `SiteConfig.brandsBannerIds` for the
  two banners above the brands directory.
- **`Banner.brandId` + `brand-section` placement** (migration
  `20261015133738_brand_section_banners`): banners can now be scoped to a brand
  as well as a category. Nullable column, so an older deployment keeps working;
  run `npx prisma migrate deploy` when releasing.
- `font-category` design token in `globals.css` — the one place the
  "main category = Pretendard" rule lives.
- Wishlist: `toggleWishlist` server action, a card heart that uses it, and a
  DB-backed `/account/wishlist` (the old page was a placeholder).
- `getProductsByIds` in the product data layer, `getBrandSectionBanners` in the
  banner data layer, `BrandBanner` component, `test` coverage for the client's
  brand list and the banner placements.

## Content the client still needs to upload (no code left to write)

- **Banner artwork.** Every block that shows a banner — the home long banner,
  the category pages' long banner and promo, the brands page's long banner and
  promo, the brand sections — picks from the banners in **Banners**
  (`/admin/banners` → **New banner**: image, link, optional text over it,
  schedule). To add another promo option, create the banner there and pick it in
  **Pages → Category pages** (or **Pages → Brands page**); both screens link
  straight to the new banner form, and every pick is a reference, so the same
  banner can be used in several blocks at once (in any store).
- Two (or one) **brand banners** per brand section in `/admin/banners` — the
  section renders them the moment they exist; until then the sections simply
  show their product rows.
- A **banner image per brand page** in `/admin/brands` — same for category
  tiles, brand images and event artwork. (The **brands directory's** own banners
  are picked under Pages → Brands page — the long banner and the promo block —
  and stay empty until something is chosen.)
- Event artwork: any ratio works — the card is a 1:1 box and the admin's
  background tools frame the crop (or it just covers, as before).

## Flagged / needs the missing deck

1. **Task 14 — "add a brand to this section"** could not be completed. The
   section and the brand are only identifiable from the annotated slide in
   `WEBSITE261015.pptx`, which was not available, and the written list gives no
   section. All ten brands from Task 13 are already present in the brand
   directory (verified), so nothing is obviously missing there; if the intended
   section is one of the curated tabs (Only At Ournara / New Launch), that is an
   assignment in `/admin/brands`, not a code change.
2. **Task 12 sizing** — the deck's "referenced sizing guidance" for the brand
   banner was not available either. The implementation uses a wide strip
   (≈1560×440, 16:9 on phones) to match the site's other banners; if the slide
   asks for different proportions, it is a one-line change in
   `src/components/brands/brand-banner.tsx`.
3. Slides in the 261013 deck that are **not** part of this written list were
   left alone except where they share a component: the stores heading font and
   margins (slide 11) and the review-page eyebrow (slide 13) were included
   because the same shared components serve them and the client asked for
   exactly that; the ambassador slide (12) and the "remove spacing between
   detail images" slide (4) were not touched.
4. **Slide 4 items that need the deck's screenshots (implemented, but worth a
   glance):**
   - **“All products page”** — no page by that name exists in this project. The
     rule was applied to _every_ storefront title instead, so whatever page it
     is, it is covered if it exists; if the client means a page we do not have
     at all (a shop-all listing), it is a new page, not a styling fix.
   - **“Long banner below filters”** — the block sits under the mid-level
     category tiles (the filters in the listing), where the original site's
     long carousel was. If the deck means _below the filter sidebar / sort row_,
     that is a one-line move in `CategoryProductList`.
   - **Order of the two blocks** — the long banner renders first, the ad block
     under it, following the order of the client's sentence. Swapping them is a
     two-line change in the same file.
   - **Carousel** — the category page's arrows/bullets carousel was replaced by
     the home-style strip (it was the only renderer ignoring the banner's own
     content controls). If the client wants it back for days with more than
     three banners, it is in git (`src/components/content/long-banner.tsx`).

## Checked in a browser

- Product page with variants
  (`/products/zoom-by-jungsaemmool-dewy-fit-spatula-foundation-25ml`): the panel
  renders brand → name → K-Drop (+ badge) → description → right-aligned price →
  "Please Select Variants" swatches → shipping fee → button → shipment box →
  delivery bar, i.e. the client's slide-1 order, confirmed from the DOM and a
  screenshot. The catalogue carries 245 variants across 72 products.
- Category tab ① → panel ② swap, arrows, and the banner layout at
  1440 / 834 / 390px: the banner keeps the page margins (66px → 1375px at
  1440, level with the filters and the product grid), the filters are rounded
  and scroll sideways, and each filter slides the track to its own slide
  (`translateX(0% / -100% / -200% / -300%)`) with the product row fading in.
  The two-cell banner strip, the square event cards, the brand page banner path
  and the brand directory's tab-first layout were checked too.
- After the per-store refactor: `/category/skin-care` still renders its two strip
  cells (2 × 692.6 × 82.9 at 1440px, level with the page container) and the
  1395 × 100 promo under them, from the per-store config — the same geometry as
  before the JSON move. `/brands` and the category listings both answer 200.
- Review pages: `/review` renders “What Our Customers Say” with nothing above it
  and the detail page (`/review/r1`) renders “Review by Ananya” over “On NOWATER
  set” — no “Real Reviews” anywhere (a body-text search for it returns false on
  both), and both headings resolve to the **Pretendard** family with the font
  loaded.
- Brand banner: with a temporary image on Prelude Dinto, `/brand/prelude-dinto`
  measured the banner at **1440 × 300 at x=0** on a 1440px screen (full bleed,
  `object-cover`, no rounding) and **390 × 300 at x=0** on a 390px phone with no
  horizontal overflow; `/brand/tag` (no artwork) rendered no banner at all. The
  dialog's preview was mounted at its real ~430px column and measured 430 × 89.6
  with a `matrix(0.2986…)` scale (430 ÷ 1440) and a 0px radius, i.e. the page's
  own picture, scaled. Data restored, throwaway route deleted.
- Event card framing: with a temporary image on both events, `/event` rendered
  `object-position: 20% 80%` with `transform: scale(1.6)` and
  `transform-origin: 20% 80%` on every card, and the cards measured 600 × 600 at
  1440px — the preview's reference box. The editor's panel was then rendered at
  its real 360px width: the stage measured 360 × 360 with a 9.6px corner (= the
  card's own 16px at the 0.6 scale, so the clip cannot round it off), and a real
  mouse drag moved the focus 20% → 0% / 80% → 63% exactly as the maths says
  (`delta / scale / 600 × 100`). The sliders moved the zoom and the vertical
  focus the same way. The temporary image and framing were then restored and the
  throwaway script deleted.

# Round nine — the next client pass

Six items, then the client's revisions of four of them. The one thing that could
not be settled from the reference — where HOT should go — resolved itself: the
client removed it.

## 1. Shorts audio

**Checked, and it was not fine.** The YouTube and TikTok embeds were built with
`mute=1` _and_ `controls=0`: autoplay has to start muted (browser policy), but
hiding the controls also hid the speaker button, so a muted TikTok looked like a
clip with no audio and there was no way to turn it on. Both embeds now keep
`mute=1` **and show their controls** (`controls=1`, plus TikTok's
`volume_control` / `play_button` / `progress_bar`), so the sound is one tap away.
Instagram's embed already carries its own player with sound. Uploaded video files
were already `<video muted controls>` — the same pattern: autoplay muted, unmute
in the controls.

## 2. Tabbed showcase: columns and rows

- **Why 5 columns did nothing:** the section stored `columns: 5`, but each filter
  also carried its own `columns: 4` from an older default, and the loader preferred
  the filter's value. The filter's columns/rows are now optional and ignored — the
  **section's grid is fixed for every filter**.
- The section gained a **Rows** control (1–5, default 2) next to **Columns**
  (2–6): `columns × rows` is the box, the picked products fill it in the admin's
  order, and extra picks stay stored until the grid grows. The tab editor says how
  many slots its filter fills and no longer offers a grid of its own.
- The renderer slices to the same ceiling, so the static fallback and the builder
  agree.

## 3. Top banner: gradients, and it follows the store

- A block's background is now either a **solid colour** or a **gradient** (2–6
  stops, each a colour and a 0–100% position, drawn left to right), edited in the
  block's Background panel with a live swatch. The strip, the admin preview and the
  store toggle all read one helper (`topBannerBackgroundCss`).
- **The International store's banner is the client's gradient** — 0% `#F83658`,
  50% `#0894FD`, 100% `#7920FB`, left to right — in the defaults and in the
  existing row (migration `20261017040000_global_top_banner_gradient` rewrites the
  first block only, and only if it is not already a gradient). The India store
  keeps its purple.
- **Fix after the client checked:** the strip was still drawn from the
  server-rendered (initial) store, so switching to the International store in the
  header left the India banner on screen. `TopBanner` now receives **both** stores'
  blocks and picks the active one from the client version, so the gradient appears
  the moment the toggle is pressed. Verified in the DOM: after pressing KDROP the
  strip's `background-image` is `linear-gradient(90deg, #F83658 0%, #0894FD 50%,
#7920FB 100%)`.

## 4. Store control

Two elements, as the client asked:

1. **The toggle** — two connected halves, ~50% smaller than the first version
   (105 × 28 desktop, 91 × 24 on phones). Only the **active** half wears its
   store's top-banner background (the International gradient / the India purple);
   **the inactive half is greyed out** (`zinc-200` with grey text). Pressing a half
   switches the store.
2. **The popup button** — restored as it was: the globe chip that names the current
   store and opens the panel of store cards (descriptions, badges and all), with
   the admin's nudge above it.

The backgrounds come from each store's own top banner (`layout.tsx` computes both),
so changing a banner recolours the toggle too.

## 5. Menu

- The bar is **left-aligned right after the logo** and keeps **CATEGORY · BRAND ·
  REVIEW · EVENT · STORES · B2B · AMBASSADOR** (HOT was dropped at the client's
  request, and `/hot` with it).
- The desktop hamburger opens a **760px dropdown anchored directly under the icon**
  — not a full-width panel. The left pane starts with **OUR:NARA → `/`** (home),
  then every top-level item; hovering, focusing or clicking a row swaps the right
  pane to that item's links (subcategories as `?sub=` filters, plus the rest of the
  site's internal links). Both panes scroll on their own.
- **CATEGORY is a page link now** (`/category`), not a menu button: the client
  asked that the mobile row's items open their pages. `/category` is a new index of
  the top-level categories (their tiles + names, straight from the admin tree).

## 6. Mobile header

Phones and tablets now read **top banner → one justified row (logo · store control
· cart) → one row of menu links**, which scroll sideways when needed. The search
icon and both hamburgers are gone on those sizes (search and the two-pane menu are
desktop-only), and the old drawer went with them — every item in the row is a link:
`/category`, `/brands`, `/review`, `/event`, `/stores`, `/b2b`, `/ambassador`. The
bottom tab bar's CATE button now opens `/category` too.

## Verified in a browser

- Header at 1440: left-aligned bar (`CATEGORY … AMBASSADOR`) starting 48px after the
  logo; the toggle 105 × 28 with the inactive half grey and the active one in its
  store colour; the popup chip opens the store panel; the hamburger's panel is
  760 × 522 at the header's bottom edge (not full width) with the OUR:NARA row.
- Pressing KDROP switches the top banner to the gradient **without a reload**
  (computed `background-image` checked), and the toggle swaps which half is
  coloured.
- Showcase at 1440: five columns, six selected products placed 5 + 1 across rows.
- `/category`: "Category" in Pretendard, four tiles → the four category pages.
- 390: logo (x 15), toggle (x 175), chip (x 272) and cart (x 343) all on the first
  row; the menu row under it; no search, no hamburger, no horizontal overflow.

## Round nine, second pass

Three refinements after the client looked again:

1. **The bobbing arrow now points at the popup button.** The `StoreNudge` moved
   out of the header and back inside the store control, anchored above the globe
   chip, so the hint sits over the thing that opens the store panel rather than
   over the toggle. It is still hidden below 1200px, as before.
2. **The selected store pill is rounded on every side.** The toggle is now a
   light grey pill with 3px padding: each half is a full `rounded-full` pill with
   a small gap between them, the active one filled with its store's background and
   the other greyed out. (Before, the halves only had their outer corners
   rounded, and the selected half looked clipped against the other.)
3. **The /category tiles are never empty.** Root categories have no tile artwork
   in the admin yet, so each tile falls back to the **first product image** in
   that category (a real photo of what is inside; an admin-uploaded tile still
   wins). A category with neither would render a brand-purple block rather than a
   blank one. Verified: all four tiles on `/category` now load a product image.

Also verified at 390px: logo (x 15), toggle (x 166, 100 × 28), chip (x 272) and
cart (x 343) still share the first row with no overflow, and the nudge is hidden.

### Third pass — the toggle's halves overlap

The two halves no longer stand apart with a gap (which read as two separate
round bubbles): they now **overlap by 6px**, and the active pill carries a higher
z-index, so it sits **on top of** the grey one whichever store is selected — the
control reads as one shape with the coloured half laid over the other. The outer
grey wrapper and its padding are gone, so nothing double-rounds the pills.
Measured in the browser in both states: 60px + 53px pills, 6px overlap, the
active one `z-index: 10`.

### Fourth pass — the toggle is one pill

The halves overlapped but both were still pills, so the unselected side kept a
rounded corner of its own. Now the **container** is the only pill (`overflow:
hidden; rounded-full; bg-zinc-200`), the **inactive** half is square
(`border-radius: 0`) and laps **12px** under the active one, and only the
**active** half is rounded and coloured (z-index 10). The grey side's outer edge
is therefore the component's own shape, not a second pill's corner — the control
reads as one slider with the coloured part laid over the grey track. Checked in
both directions in the browser: 60px + 53px halves, 12px overlap, the inactive
one `border-radius: 0`.

### Fifth pass — icons in the menu's left pane

Every row of the dropdown's left pane now carries an icon, the way the OUR:NARA
(home) row already did: Sparkles for Skin Care, Brush for Makeup, Scissors for
Hair Care, Clock for PRE-ORDER, and Tags / Star / CalendarDays / MapPin /
Briefcase / Megaphone / Users / User / Ticket for Brand, Review, Event, Stores,
B2B, Ambassador, Community, My page and Couponzone. A category added later
without a mapping falls back to the grid icon. The icon sits in a fixed 15px slot
before the label, turns point-purple on the selected row (like the label) and is
`aria-hidden` — the label still names the row. Verified: all 14 rows report an
`svg` in the DOM and the panel renders with them aligned.

### Sixth pass — admins choose the menu icons

The icons are configurable in **Site settings → Menu icons**: one row per menu
item (OUR:NARA home, the admin's category roots, then the static rows), each with
a live preview and a dropdown of the icon set. Saved once for both stores, the
same way the store picker is.

- `src/lib/menu-icons.ts` owns the whole thing: the icon set (25 icons, each with
  a label), the menu's static rows and their default icons, the category-slug
  defaults and the resolver. The header builds its static groups from
  `MENU_STATIC_ROWS`, so the picker and the menu cannot drift apart; a category
  added later without a mapping falls back to the grid icon, and every default is
  guarded by a test.
- Storage: `SiteConfig.menuIcons` (JSON, row id → icon key) via migration
  `20261017050000_menu_icons`. Empty means "all defaults". The save rejects icon
  names it cannot draw, so a stale key can never leave a row icon-less.
- The values reach the header through the root layout (`local` row, shared by
  both stores), and a custom icon is rendered by the same component that draws
  the defaults.

Verified with the admin's own write path: setting `home: sparkles`,
`category-skin-care: droplets`, `brand: crown` in `site_configs` made the header
render `lucide-sparkles`, `lucide-droplets` and `lucide-crown` for those rows
while every other row kept its default; the values were then cleared.

### Seventh pass — a row picker, a default icon, image uploads and a preview

Site settings → Menu icons now works the way the client described:

- **Pick a menu item.** Each row of the menu is listed; clicking one opens its
  editor. Every row shows a live preview (the shared `MenuRowIcon`), so the picker
  and the header cannot draw different things.
- **The default icon is named and drawn** at the top of the editor, next to the
  icon dropdown, so an admin always sees what "leave it alone" looks like.
- **Upload any image.** An `ImageField` under the icon takes an upload (held until
  Save, like every other image in the admin) and replaces the icon for that row.
  Clearing it restores the chosen icon.
- **Storage** stays in `site_configs.menu_icons`, one entry per row, now
  `{ icon, image }` (the image wins). The first round's flat values — an icon key
  or an image path — still resolve, so no data migration was needed. The save
  keeps only known icon names and real image URLs/paths.
- **Rendering**: `src/components/layout/menu-row-icon.tsx` draws a 15px
  `object-cover` image when there is one and the Lucide glyph otherwise; the
  header and the admin preview both use it.

Verified with the admin's own write path: `home` and `brand` set to images,
`review` to `{ icon: "flame" }`, `event` to the old flat `"star"` — the open menu
rendered `<img>` on the first two, `lucide-flame` and `lucide-star` on those rows,
and the defaults everywhere else. Values were cleared afterwards.

### Eighth pass — icons from both libraries, listed

The picker no longer hides its choices behind a dropdown: opening a menu row shows
the available icons **as a grid, grouped by the library they come from** — the
Lucide set the site already uses and the Material Design set from
`react-icons/md`, which the header already ships. Each button is 32px, carries a
tooltip and the accessible name (`Lucide: Sparkles`), and the current choice is
ringed in point-purple. The image upload sits under the grid, unchanged.

Stored keys are now library-qualified (`lucide:sparkles`, `material:brush`), so
the two sets can never collide. The first round's bare Lucide names still resolve
(`flame` → `lucide:flame`), and the defaults name their library too. Added
Material choices include Face retouching, Spa, Water drop, Store, Coupon,
Campaign, Premium and Fire.

Verified with the action's own write path: `home` as `material:store` rendered the
Material glyph (a plain 24px-viewBox SVG, no Lucide classes), `brand` as
`lucide:crown` rendered `lucide-crown`, and the legacy `"flame"` rendered
`lucide-flame`; cleared afterwards.

### Ninth pass — ten libraries in a compact, searchable picker

The client asked for the full set of libraries, not a vertical list, and for a
search that copes with the same icon name existing in several sets:

- **Ten libraries** are now available: Lucide (the site's own set), Material
  Design, Font Awesome 6, Bootstrap Icons, Ionicons 5, Feather, Tabler, Remix
  Icon, Phosphor and Boxicons. That is ~250 icons, every one checked against the
  installed `react-icons` package, keyed per library (`fa6:star`,
  `pi:heart`, `tb:calendar`, `bi:store`) so names cannot collide.
- **The picker is one compact panel**, not stacked groups: a search box, a
  horizontally scrollable row of library tabs (with counts and an "All" tab), and
  a single 32px grid that scrolls inside the panel. Tooltips and accessible names
  read "Star · Font Awesome 6", so identical names stay distinguishable.
- **Search spans every library** by label, key and library name, drops groups with
  no match, reports "N of 250 icons", and offers a clear button and an empty
  state. A "Selected … · library" footer names the current choice and offers
  `Use default` when the row is not on its default.
- The row's live preview, default-icon line and image upload are unchanged; the
  picker only replaces the old static grid. `filterMenuIcons` lives in
  `src/lib/menu-icons.ts` and is covered by the tests (group count, unique keys,
  labels, search across libraries, defaults).

Verified with the admin's own write path: `brand` as `fa6:star`, `review` as
`pi:heart`, `event` as `tb:calendar` and `stores` as `bi:store` all rendered their
own library's glyph in the open header menu (Font Awesome's 576×512 viewBox,
Phosphor's 256×256, Tabler and Boxicons' 24×24 stroke/fill shapes), while
unconfigured rows kept their Lucide defaults. The settings were restored
afterwards. `/admin/site` still redirects to `/login` when unauthenticated, so the
picker screen itself was only type-checked and built, not screenshotted.

### Tenth pass — one volume control, and no more cropped or muted players

The client reported cropped iframes and silent TikToks, then asked for a single
volume control after seeing the platform control bars:

- **Why it was cut off.** Inactive slides deliberately widen the poster box to
  116% and clip it, and the iframe was then sized to 124% of that box and
  shifted up 12%. The white product info bar was absolutely positioned over the
  bottom of the card. At a 220px card that hid the bottom 176px of the player —
  exactly where YouTube and TikTok put their control bars — and clipped ~8% from
  each side, including TikTok's right-hand action rail.
- **Player now fits the card.** When a player mounts, `playActiveShortsVideo`
  adds `has-player` to the `.video-wrap`; that cancels the 116% poster bleed and
  the iframe/video fills the 9:16 box with no offset. The old 124%/-12% crop and
  its mobile 126%/-13% override are gone.
- **The info bar sits below the media.** `.shorts-slide` is a column and the
  info bar is back in normal flow, so it can no longer cover the player. Cards
  still keep the poster bleed and rounded frame for inactive slides.
- **One visible volume control.** The native bars are off (`controls=0`):
  YouTube only exposes its gear and CC buttons inside that bar, and TikTok
  ignores its per-button flags, so hiding the bar is the only way to remove
  them. The carousel overlays a compact control at the **top-right of the
  active video**: a speaker toggle and a real 0–100 slider. Inactive cards show
  no control. YouTube starts muted (autoplay policy) and TikTok starts at full
  volume; clicking the picture still plays/pauses.
- **Volume, not just mute.** The slider sends `setVolume` through the platform
  APIs, clamped to 0–100. TikTok does not document `setVolume`, but its player
  accepts it and reports the new level through `onVolumeChange` (verified). The
  control also reads the players' `infoDelivery` / `onMute` / `onVolumeChange`
  messages, so the slider and icon stay correct if the platform changes the
  state itself. Muting remembers the last audible level and restores it.
- **TikTok quirk.** Its player ignores `unMute` when the message contains a
  `value` field, so `volumeCommand` sends the parameterless documented shape
  (`{ type: "mute" | "unMute", "x-tiktok-player": true }`). Verified from the
  player's own `onMute`/`onVolumeChange` messages for both directions.
- **Limits.** Instagram's embed exposes no mute or volume API, and uploaded
  video files use the browser's own player; those two keep their native UI.
- **Verified** in a real browser at 1440, 768 and 390px widths: the iframe box
  equals the media box, the info bar starts exactly where the iframe ends, only
  the active card shows the volume control, and the YouTube/TikTok native gear,
  CC, progress and fullscreen controls are gone. Dragging the YouTube slider to
  40 made the player report `muted: false, volume: 40`; 0 muted it; the speaker
  button restored 40. TikTok reported `onVolumeChange: 30` for the same UI step.
  `tests/shorts.test.ts` covers URL parsing, both embed URLs and both mute and
  volume command shapes.

### Eleventh pass — every product, not the newest 300

The client reported that `/category/skin-care` stopped at "300 items were found"
and that VT, AHC, JMsolution and AROCELL were missing from the brand filter:

- **Cause.** The category and brand queries were hard-capped at `take: 300` and
  the count came from that same query, so the heading, the brand facet counts,
  the subcategory tabs and `?page=` all described the first 300 rows only. The
  oldest Skin Care product in the query was 2026-10-15; the real oldest is
  2026-08-08. The same cap sat on brand pages and search.
- **Real listing query.** `getProductListing` in `src/data/products.ts` builds
  the where/order from the active store version, applies the category filters,
  and returns `total`, `page`, `pageSize`, `totalPages`, `hasMore`,
  `brandFacets` and `availabilityFacets` from the database rather than from the
  loaded slice. Brand and availability facets are separate groupBy/count
  queries, and the price sorts sort in JS because Prisma cannot order by
  `COALESCE(globalPriceCents, priceCents)`.
- **Batches of 48.** `PRODUCTS_PER_PAGE` is 48. The first batch is still
  server-rendered; later batches come from the public
  `GET /api/products/listing` route (`category`, `brandSlug` or `q`, plus
  `brand`, `sub`, `availability`, `sort`, `page`, `version`). Category, brand
  and search pages all use it.
- **Infinite scroll, no new dependency.** `CategoryProductList` and
  `InfiniteProductGrid` observe a sentinel with `IntersectionObserver`
  (`rootMargin: 600px`) and append the next batch; a "Load more" button remains
  as the keyboard/fallback path, with error and retry states. Requests carry an
  `AbortController` and a request counter so a filter or sort change cannot be
  overwritten by an in-flight batch. "All N items shown" ends the list.
- **Store version.** The visible store can switch before the cookie round-trips,
  so batch requests send the server-resolved `version` explicitly. The API
  validates it with `parseSiteVersion` and only accepts `local` or `global`.
- **Totals and the brand filter.** The number below the tabs and the brand facet
  counts now use the full category total. The filter sheet's "Show N items"
  uses the same total.
- **Availability counts match the cards.** The buckets use the product's own
  flag for the browsing store, with buy-now winning over pre-order, exactly as
  `saleStateForVersion` does for the product cards. A brand-wide Buy Now toggle
  (which the cards ignore) therefore cannot move the counts away from the
  badges. Brand pages now request the facets too, so their filter sheet keeps
  real availability counts instead of zeroes.
- **Verified against the live database and in a browser**: Skin Care reports
  **554** items (was 300), the facets include `AHC 8`, `AROCELL 7`,
  `JMsolution 10`, `MEDIPEEL 45`, `VT 43`, scrolling appends 48 → 96 → 144, and
  `?page=2` renders a different 48 cards with the same 554 count.
  `?sub=facial-care` reports 233 with the same facets. `/brand/medipeel`
  reports all 45 items. `/search?q=a` reports 763 and appends on scroll. The
  global store reports 548 Skin Care items — the six that are not active
  globally — which is the intended storefront split. Price sorts ascend
  correctly (₹119 → ₹160 → ₹249 for `sort=lowest`).
- **Admin note.** The admin Categories list counts every row (242 for Facial
  Care); the storefront shows the 233 active rows. Aligning those two numbers
  was not requested and is left unchanged.
