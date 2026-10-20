CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED');
CREATE TYPE "DiscountScope" AS ENUM ('ALL', 'BRAND', 'CATEGORY', 'PRODUCT');

CREATE TABLE "discounts" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "admin_note" TEXT,
  "type" "DiscountType" NOT NULL,
  "value" INTEGER NOT NULL,
  "scope" "DiscountScope" NOT NULL DEFAULT 'ALL',
  "brand_id" TEXT,
  "category_id" TEXT,
  "product_id" TEXT,
  "site_version" TEXT NOT NULL DEFAULT 'all',
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "discounts_site_version_deleted_at_idx" ON "discounts"("site_version", "deleted_at");
CREATE INDEX "discounts_product_id_idx" ON "discounts"("product_id");
CREATE INDEX "discounts_brand_id_idx" ON "discounts"("brand_id");
CREATE INDEX "discounts_category_id_idx" ON "discounts"("category_id");

ALTER TABLE "discounts" ADD CONSTRAINT "discounts_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_items"
  ADD COLUMN "list_price_cents" INTEGER,
  ADD COLUMN "discount_title" TEXT;
