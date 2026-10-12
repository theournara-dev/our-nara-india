-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "category_id" TEXT;

-- CreateIndex
CREATE INDEX "banners_category_id_placement_idx" ON "banners"("category_id", "placement");

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
