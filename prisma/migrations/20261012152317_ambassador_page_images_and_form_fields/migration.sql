-- AlterTable
ALTER TABLE "ambassador_applications" ADD COLUMN     "address" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "product" TEXT;

-- AlterTable
ALTER TABLE "site_configs" ADD COLUMN     "ambassador_images" JSONB;
