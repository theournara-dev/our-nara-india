-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paid_side_effects_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "stock" INTEGER;

-- CreateTable
CREATE TABLE "order_audit_logs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_email" TEXT,
    "snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_audit_logs_order_number_idx" ON "order_audit_logs"("order_number");
