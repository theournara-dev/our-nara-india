-- CreateTable
CREATE TABLE "preorders" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preorders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "preorders_product_id_idx" ON "preorders"("product_id");

-- CreateIndex
CREATE INDEX "preorders_status_idx" ON "preorders"("status");

-- AddForeignKey
ALTER TABLE "preorders" ADD CONSTRAINT "preorders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
