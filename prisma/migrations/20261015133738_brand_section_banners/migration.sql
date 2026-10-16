-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "brand_id" TEXT;

-- CreateIndex
CREATE INDEX "banners_brand_id_placement_idx" ON "banners"("brand_id", "placement");

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
