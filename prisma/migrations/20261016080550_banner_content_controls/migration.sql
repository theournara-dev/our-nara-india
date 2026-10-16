-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "heading" TEXT,
ADD COLUMN     "scrim" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "style" TEXT NOT NULL DEFAULT 'image',
ADD COLUMN     "subheading" TEXT,
ADD COLUMN     "text_align" TEXT NOT NULL DEFAULT 'left',
ADD COLUMN     "text_color" TEXT,
ADD COLUMN     "text_v_align" TEXT NOT NULL DEFAULT 'bottom',
ALTER COLUMN "placement" SET DEFAULT '';
