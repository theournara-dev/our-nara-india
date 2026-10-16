-- Each brand page's banner gets a height (client's slide 7). The banner is drawn
-- full width; 300px is the default the client asked for, so existing rows keep a
-- sensible strip.

ALTER TABLE "brands"
  ADD COLUMN "banner_height" INTEGER NOT NULL DEFAULT 300;
