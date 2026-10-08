-- AlterTable
ALTER TABLE "popups" ADD COLUMN     "content_layout" TEXT NOT NULL DEFAULT 'auto',
ADD COLUMN     "image_height_px" INTEGER,
ADD COLUMN     "text_align" TEXT NOT NULL DEFAULT 'left';
