-- Per-store sale state for products.
--
-- Until now only the price was split between the two storefronts
-- (price_cents / global_price_cents); the show / pre-order / buy-now flags
-- were shared. Each product now answers all four questions per store.
--
-- Backfill preserves today's behaviour, so nothing changes for shoppers until
-- an admin edits a product:
--   * the International store sold every product with Buy Now (pre-orders are
--     a local-store feature), so its buy-now flag starts enabled;
--   * its pre-order flag starts disabled;
--   * visibility mirrors the local flag.
--
-- New products get the opposite defaults from the columns themselves
-- (pre-order off, buy-now off, shown) and are enabled per store by an admin.

-- AlterTable
ALTER TABLE "products"
  ADD COLUMN "global_is_pre_order" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "global_buy_now_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "global_is_active" BOOLEAN NOT NULL DEFAULT true;

-- Backfill: keep the International store selling exactly what it sells today.
UPDATE "products" SET "global_buy_now_enabled" = true;
UPDATE "products" SET "global_is_active" = "is_active";
