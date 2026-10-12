-- DropForeignKey
ALTER TABLE "coupon_redemptions" DROP CONSTRAINT "coupon_redemptions_user_id_fkey";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "image" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "product_subcategories" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_subcategories_category_id_idx" ON "product_subcategories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_subcategories_product_id_category_id_key" ON "product_subcategories"("product_id", "category_id");

-- AddForeignKey
ALTER TABLE "product_subcategories" ADD CONSTRAINT "product_subcategories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_subcategories" ADD CONSTRAINT "product_subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
