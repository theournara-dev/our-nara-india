-- Pre-orders can now be enabled per storefront (products carry a pre-order flag
-- per store), so each pre-order records which store it was placed on.
-- Existing rows predate the International store's pre-order support and are
-- local by definition.

-- AlterTable
ALTER TABLE "preorders" ADD COLUMN "site_version" TEXT NOT NULL DEFAULT 'local';
