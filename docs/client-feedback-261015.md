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

## New / changed infrastructure

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
