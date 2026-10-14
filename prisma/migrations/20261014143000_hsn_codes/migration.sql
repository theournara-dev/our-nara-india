-- HSN codes: one per product, copied onto the order item at checkout so an
-- issued invoice keeps the code it was billed with.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "hsn_code" TEXT;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "hsn_code" TEXT;
