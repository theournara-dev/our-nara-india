-- AlterTable
ALTER TABLE "preorders" ADD COLUMN     "address_line1" TEXT,
ADD COLUMN     "address_line2" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'IN',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postal" TEXT,
ADD COLUMN     "state" TEXT;
