-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "site_version" TEXT NOT NULL DEFAULT 'local';

-- Backfill: orders that predate this column derive their version from the
-- stored currency (USD = global, everything else = local).
UPDATE "orders" SET "site_version" = CASE WHEN "currency" = 'USD' THEN 'global' ELSE 'local' END;

-- CreateIndex
CREATE INDEX "orders_site_version_idx" ON "orders"("site_version");
