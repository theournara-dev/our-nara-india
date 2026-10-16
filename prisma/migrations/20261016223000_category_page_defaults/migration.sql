-- The "all category pages" blocks, and per-page overrides (client's slide 4):
-- every listing shows the all-pages long banner and promo block, and a page set
-- to its own configuration (or hiding a block) overrides that. The banners are
-- still the "category-long" / "category-promo" picks; the all-pages ones have
-- no category attached, so a banner still sits in one place only.

-- Which blocks a listing uses: "default" follows the all-pages configuration,
-- "custom" uses the picks and heights stored on the category itself.
ALTER TABLE "categories"
  ADD COLUMN "page_banners_mode" TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN "hidden_blocks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- The ad block is the promo block now.
ALTER TABLE "categories" RENAME COLUMN "ad_banner_height" TO "promo_height";
UPDATE "banners" SET "placement" = 'category-promo' WHERE "placement" = 'category-ad';

-- The top pair is gone: the long banner (two columns) already does that, so
-- banners that sat in a top pair return to the standalone pool.
UPDATE "banners"
  SET "placement" = '', "category_id" = NULL
  WHERE "placement" = 'category-top';

-- The all-pages block heights (the picks are the category-less banners above).
ALTER TABLE "site_configs"
  ADD COLUMN "category_long_banner_height" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "category_promo_height" INTEGER NOT NULL DEFAULT 0;
