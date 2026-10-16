-- The event card's background image gets admin framing tools (client's slide 6):
-- the point the artwork focuses on and a zoom. The defaults are the plain cover
-- the cards already rendered, so existing rows are untouched.

ALTER TABLE "events"
  ADD COLUMN "image_focus_x" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN "image_focus_y" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN "image_zoom" INTEGER NOT NULL DEFAULT 100;
