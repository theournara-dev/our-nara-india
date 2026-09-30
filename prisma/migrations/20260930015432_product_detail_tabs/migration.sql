-- AlterTable
ALTER TABLE "products" ADD COLUMN     "info_rows" JSONB;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "is_visible" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "product_blocks" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "config" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_info_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "blocks" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_info_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_qa" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'ADMIN',
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "submitted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_qa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_blocks_product_id_sort_order_idx" ON "product_blocks"("product_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "product_info_templates_key_key" ON "product_info_templates"("key");

-- CreateIndex
CREATE INDEX "product_qa_product_id_sort_order_idx" ON "product_qa"("product_id", "sort_order");

-- AddForeignKey
ALTER TABLE "product_blocks" ADD CONSTRAINT "product_blocks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_qa" ADD CONSTRAINT "product_qa_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
