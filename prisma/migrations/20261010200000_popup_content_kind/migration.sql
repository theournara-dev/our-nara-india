-- Popups can now render either their own custom content (title/body/image/CTA)
-- or the store-picker cards — the same content as the header's store switcher
-- popup — so the once-per-session store prompt reuses one editor.

-- AlterTable
ALTER TABLE "popups" ADD COLUMN "content_kind" TEXT NOT NULL DEFAULT 'custom';
