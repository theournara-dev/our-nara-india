-- The header menu's icons are admin-editable now (client's follow-up to the
-- dropdown). One JSON object per store, row id to icon key; empty means every
-- row keeps the default set in src/lib/menu-icons.ts.

ALTER TABLE "site_configs"
  ADD COLUMN "menu_icons" JSONB;
