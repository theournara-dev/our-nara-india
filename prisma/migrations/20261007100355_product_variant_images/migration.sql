-- AlterTable: variants move from a single option image to a list of them.
ALTER TABLE "product_variants" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Carry each variant's existing single option image over as the first of its
-- images so no linked gallery image is lost.
UPDATE "product_variants"
SET "images" = ARRAY["image"]
WHERE "image" IS NOT NULL AND "image" <> '';

-- AlterTable
ALTER TABLE "product_variants" DROP COLUMN "image";
