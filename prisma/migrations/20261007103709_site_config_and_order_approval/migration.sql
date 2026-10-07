-- CreateEnum
CREATE TYPE "OrderApprovalStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "approval_note" TEXT,
ADD COLUMN     "approval_status" "OrderApprovalStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "id_document_url" TEXT;

-- CreateTable
CREATE TABLE "site_configs" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "topBanner" JSONB,
    "switcher" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_configs_version_key" ON "site_configs"("version");

-- CreateIndex
CREATE INDEX "orders_approval_status_idx" ON "orders"("approval_status");
