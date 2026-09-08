-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "global_price_cents" INTEGER;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "global_compare_at_cents" INTEGER,
ADD COLUMN     "global_price_cents" INTEGER;

-- Backfill: existing products get a default global (USD) price converted from
-- their local INR price at 1 USD = 83 INR (paise -> USD cents). Admins can
-- refine these values later in the product form.
UPDATE "products"
SET "global_price_cents" = GREATEST(1, ROUND("price_cents" / 83.0)::int),
    "global_compare_at_cents" = CASE
      WHEN "compare_at_cents" IS NOT NULL
        THEN GREATEST(1, ROUND("compare_at_cents" / 83.0)::int)
      ELSE NULL
    END;

UPDATE "product_variants"
SET "global_price_cents" = GREATEST(1, ROUND("price_cents" / 83.0)::int)
WHERE "price_cents" IS NOT NULL;
