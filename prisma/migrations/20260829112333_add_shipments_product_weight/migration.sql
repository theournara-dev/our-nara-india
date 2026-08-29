-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('CREATED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'RTO', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "ShipmentSource" AS ENUM ('APP', 'ADMIN', 'DELHIVERY');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "weight_grams" INTEGER;

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'delhivery',
    "waybill" TEXT NOT NULL,
    "client_order_ref" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'CREATED',
    "provider_status" TEXT,
    "label_url" TEXT,
    "cod_amount_cents" INTEGER NOT NULL DEFAULT 0,
    "is_cod" BOOLEAN NOT NULL DEFAULT false,
    "last_event_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3),
    "source" "ShipmentSource" NOT NULL DEFAULT 'APP',
    "rawPayload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_waybill_key" ON "shipments"("waybill");

-- CreateIndex
CREATE INDEX "shipments_order_id_idx" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
