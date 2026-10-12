-- CreateEnum
CREATE TYPE "BrandGroup" AS ENUM ('ONLY_AT_OURNARA', 'NEW_LAUNCH');

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "group" "BrandGroup";
