-- Rename rawPayload → raw_payload to match the snake_case convention of
-- every other shipments column (table not yet in production use).
ALTER TABLE "shipments" RENAME COLUMN "rawPayload" TO "raw_payload";