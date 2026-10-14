-- The ambassador page's content moved from SiteConfig into the page builder
-- (a dedicated `ambassador` Page with an `ambassador` section), so these
-- storefront-wide columns are no longer read or written.
ALTER TABLE "site_configs" DROP COLUMN IF EXISTS "ambassador_images";
ALTER TABLE "site_configs" DROP COLUMN IF EXISTS "ambassador_form_title";
ALTER TABLE "site_configs" DROP COLUMN IF EXISTS "ambassador_form_intro";
