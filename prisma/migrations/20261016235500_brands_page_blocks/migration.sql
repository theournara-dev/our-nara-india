-- /brands gets the same two blocks as the category pages (client's slide 6): a
-- long banner between the title and the group tabs — the picks the page already
-- had, renamed — and a promo block that stays empty until one is picked.

ALTER TABLE "site_configs"
  RENAME COLUMN "brands_banner_ids" TO "brands_long_banner_ids";

ALTER TABLE "site_configs"
  ADD COLUMN "brands_long_banner_height" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "brands_promo_banner_id" TEXT,
  ADD COLUMN "brands_promo_height" INTEGER NOT NULL DEFAULT 0;

-- The "brand-top" placement is gone: the page references its banners now, so the
-- placement is dead weight. Banners that used it return to the standalone pool.
UPDATE "banners"
  SET "placement" = '', "category_id" = NULL
  WHERE "placement" = 'brand-top';
