-- The promo block becomes a reference to a banner instead of a claim on it
-- (client's follow-up: the promo picker must offer every banner, and picking one
-- may not pull it out of the long banner). The long banner keeps its placements
-- — a banner still sits in one place there, which the pickers say.

ALTER TABLE "categories"
  ADD COLUMN "promo_banner_id" TEXT;

ALTER TABLE "site_configs"
  ADD COLUMN "category_promo_banner_id" TEXT;

-- Carry today's category-promo picks over: a page's pick to that page, the
-- all-pages pick to every store's row. Runs before the placements are cleared.
UPDATE "categories" c
  SET "promo_banner_id" = b."id"
  FROM "banners" b
  WHERE b."category_id" = c."id" AND b."placement" = 'category-promo';

UPDATE "site_configs" s
  SET "category_promo_banner_id" = (
    SELECT b."id" FROM "banners" b
    WHERE b."placement" = 'category-promo' AND b."category_id" IS NULL
    ORDER BY b."sort_order" ASC, b."created_at" ASC
    LIMIT 1
  )
  WHERE EXISTS (
    SELECT 1 FROM "banners" b
    WHERE b."placement" = 'category-promo' AND b."category_id" IS NULL
  );

-- The placement is gone with the claim: the promo no longer takes a banner.
UPDATE "banners"
  SET "placement" = '', "category_id" = NULL
  WHERE "placement" = 'category-promo';
