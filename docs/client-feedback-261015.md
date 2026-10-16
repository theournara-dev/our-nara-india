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
| 12  | Banner images on individual brand pages                                                  | New `BrandBanner` component + `Brand.coverUrl` wired end to end: each brand page renders **its own** wide banner under the breadcrumb (≈3.5:1, `object-cover`, square-cornered, 16:9 on phones), and admins upload it per brand in **Brands → Edit → "Brand page banner"**. A brand without artwork renders no frame at all, so the page never shows an empty box. The banner is the page's own artwork, so it carries no link.                                                                                                                                           |
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

**Category page: long banner below the filters + one ad block.** Both are
admin-controlled, and both render under the mid-level filter tiles (the block
position the slide-8 reference showed), inside the page container so they line
up with the filter sidebar and the product grid:

- **Long banner** — the same strip the home page uses (one banner per column:
  one runs full width, two or three share the row, phones stack). Up to three
  picks, plus a **Height (px)** setting (`0` keeps each banner's own proportions,
  which is also the current behaviour). It renders through the shared
  `LongBannerCells` + `BannerArtwork`, so the banner content the client asked to
  “copy here” — heading, subheading, text placement, colour and scrim — shows on
  the category page exactly as on the home page. The old auto-rotating carousel
  (arrows, bullets) is gone with it: it was the one place that ignored those
  controls. `LongBannerCells` takes a `framed` prop so the home page keeps its own
  92% container while the listings render it bare.
- **Ad block** — a single image below the long banner, picked the same way, with
  its own **Height (px)** setting (“just height for now”); `0` keeps the artwork's
  proportions. It links to the banner's own destination when it has one.

New: `Category.longBannerHeight` + `Category.adBannerHeight` (migration
`20261016210000_category_page_blocks`, both default `0`) and a `category-ad`
banner placement (scoped to a category, like the top pair and the long banner).

**Follow-up — page configuration lives under Pages.** The Pages screen is now
the single home for per-page settings. The content pages (home, ambassador)
keep their section builder; a new **Other pages** table lists the brands page
and every top-level category listing, with what is already configured on each
(“None yet” until something is picked). Each row opens its own screen:

- `/admin/pages/brands` — the directory's preview grid and the banners above it
  (moved out of Site settings, which keeps the store-wide content: contact
  details, top banner, store picker, delivery, tax, invoice). This is where the
  slide-4 follow-up landed for it, and it now lives with the banner pickers it
  belongs to.
- `/admin/pages/category/<slug>` — that listing's top pair, long banner (up to
  three picks + height) and ad block (+ height). A mid-level category has no
  page of its own, so it redirects to its parent's settings.

`/admin/categories` is back to the tree alone — name, slug, tile, order,
visibility and subcategories — with a gear shortcut on each top-level row that
opens its page settings. Nothing about the storefront changed: the same
`placement`/`categoryId` picks and the same `SiteConfig` columns are written,
just from the new screens (`setCategoryPageBanners`, `saveBrandsPage` in
`src/app/admin/pages/actions.ts`).

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

- Two (or one) **brand banners** per brand section in `/admin/banners` — the
  section renders them the moment they exist; until then the sections simply
  show their product rows.
- A **banner image per brand page** in `/admin/brands` — same for category
  tiles, brand images and event artwork.
- Event artwork: square uploads fit the new 1:1 cards best.

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
