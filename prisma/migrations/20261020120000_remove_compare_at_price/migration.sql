-- The manual compare-at ("was") price is replaced by the discounts feature.
-- Current prices are left untouched: the amount customers already pay does not
-- change, only the struck-through reference price goes away.
ALTER TABLE "products"
  DROP COLUMN "compare_at_cents",
  DROP COLUMN "global_compare_at_cents";
