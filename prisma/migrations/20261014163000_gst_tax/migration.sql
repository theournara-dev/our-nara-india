-- India GST: storewide defaults (SiteConfig), per-product overrides, and the
-- values frozen onto each order / order line at checkout.
ALTER TABLE "site_configs" ADD COLUMN IF NOT EXISTS "tax_rate_mh_bps" INTEGER;
ALTER TABLE "site_configs" ADD COLUMN IF NOT EXISTS "tax_rate_other_bps" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tax_rate_mh_bps" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tax_rate_other_bps" INTEGER;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tax_place_of_supply" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tax_round_off_cents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "tax_rate_bps" INTEGER;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "taxable_value_cents" INTEGER;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "tax_cents" INTEGER;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "cgst_cents" INTEGER;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "sgst_cents" INTEGER;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "igst_cents" INTEGER;
