-- CreateEnum
CREATE TYPE "CouponScope" AS ENUM ('ALL', 'BRAND', 'CATEGORY', 'PRODUCT');

-- CreateEnum
CREATE TYPE "AmbassadorStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "brand_id" TEXT,
ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "first_purchase_only" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "product_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "scope" "CouponScope" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "site_version" TEXT NOT NULL DEFAULT 'all',
ADD COLUMN     "title" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "site_configs" ADD COLUMN     "free_shipping_over_cents" INTEGER,
ADD COLUMN     "invoice_address" TEXT,
ADD COLUMN     "invoice_email" TEXT,
ADD COLUMN     "invoice_legal_name" TEXT,
ADD COLUMN     "invoice_note" TEXT,
ADD COLUMN     "invoice_phone" TEXT,
ADD COLUMN     "invoice_tax_id" TEXT,
ADD COLUMN     "shipping_cents" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "from_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambassador_applications" (
    "id" TEXT NOT NULL,
    "site_version" TEXT NOT NULL DEFAULT 'local',
    "status" "AmbassadorStatus" NOT NULL DEFAULT 'PENDING',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT,
    "city" TEXT,
    "instagram" TEXT,
    "tiktok" TEXT,
    "youtube" TEXT,
    "blog" TEXT,
    "followers" TEXT,
    "audience" TEXT,
    "motivation" TEXT,
    "experience" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ambassador_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_order_id_key" ON "invoices"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "invoices_issued_at_idx" ON "invoices"("issued_at");

-- CreateIndex
CREATE INDEX "ambassador_applications_site_version_idx" ON "ambassador_applications"("site_version");

-- CreateIndex
CREATE INDEX "ambassador_applications_status_idx" ON "ambassador_applications"("status");

-- CreateIndex
CREATE INDEX "coupons_site_version_idx" ON "coupons"("site_version");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
