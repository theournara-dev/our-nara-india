-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "buy_now_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "popup_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "buy_now_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "popup_enabled" BOOLEAN NOT NULL DEFAULT false;
