-- The category pages' blocks are per store now (client: the same India /
-- International switch the brands page has), and their picks are references
-- rather than placements, so a banner can be reused anywhere.

-- ── Per-page overrides: one JSON per category, keyed by store ──────────────
ALTER TABLE "categories" ADD COLUMN "page_banners" JSONB;

-- Carry today's per-page configuration into both stores' slices.
UPDATE "categories"
  SET "page_banners" = jsonb_build_object(
    'local', jsonb_strip_nulls(jsonb_build_object(
      'mode', "page_banners_mode",
      'hidden', to_jsonb("hidden_blocks"),
      'long', COALESCE((
        SELECT jsonb_agg(b."id" ORDER BY b."sort_order")
        FROM "banners" b
        WHERE b."category_id" = "categories"."id" AND b."placement" = 'category-long'
      ), '[]'::jsonb),
      'longHeight', "long_banner_height",
      'promoId', "promo_banner_id",
      'promoHeight', "promo_height"
    )),
    'global', jsonb_strip_nulls(jsonb_build_object(
      'mode', "page_banners_mode",
      'hidden', to_jsonb("hidden_blocks"),
      'long', COALESCE((
        SELECT jsonb_agg(b."id" ORDER BY b."sort_order")
        FROM "banners" b
        WHERE b."category_id" = "categories"."id" AND b."placement" = 'category-long'
      ), '[]'::jsonb),
      'longHeight', "long_banner_height",
      'promoId', "promo_banner_id",
      'promoHeight', "promo_height"
    ))
  );

ALTER TABLE "categories"
  DROP COLUMN "page_banners_mode",
  DROP COLUMN "hidden_blocks",
  DROP COLUMN "long_banner_height",
  DROP COLUMN "promo_banner_id",
  DROP COLUMN "promo_height";

-- ── All-pages picks: per store, as references ──────────────────────────────
ALTER TABLE "site_configs"
  ADD COLUMN "category_long_banner_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

WITH all_pages AS (
  SELECT COALESCE(jsonb_agg(b."id" ORDER BY b."sort_order"), '[]'::jsonb) AS ids
  FROM "banners" b
  WHERE b."placement" = 'category-long' AND b."category_id" IS NULL
)
UPDATE "site_configs"
  SET "category_long_banner_ids" = ARRAY(
    SELECT jsonb_array_elements_text((SELECT ids FROM all_pages))
  );

-- The placement is gone with the claim: banners return to the standalone pool.
UPDATE "banners"
  SET "placement" = '', "category_id" = NULL
  WHERE "placement" = 'category-long' OR "category_id" IS NOT NULL;
