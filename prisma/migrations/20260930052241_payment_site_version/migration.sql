-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "site_version" TEXT NOT NULL DEFAULT 'local';

-- Backfill: derive each payment's version from its order.
UPDATE "payments" SET "site_version" = COALESCE(
  (SELECT o."site_version" FROM "orders" o WHERE o."id" = "payments"."order_id"),
  'local'
);
