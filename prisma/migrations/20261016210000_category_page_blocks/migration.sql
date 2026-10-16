-- The category listing's long banner height and ad block (client's slide 4).
-- Both are page settings on the category row; the artwork itself is a banner
-- ("category-long" / "category-ad" placement).

ALTER TABLE "categories"
  ADD COLUMN "long_banner_height" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "ad_banner_height" INTEGER NOT NULL DEFAULT 0;
