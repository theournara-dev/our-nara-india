-- INFO content per store: the India default keeps the legacy "default" key,
-- the International (K-Drop) default gets its own row, and each product can
-- override either store independently.
ALTER TABLE "products" ADD COLUMN "info_rows_global" JSONB;

-- The delivery window each store quotes, next to its fee / dispatch cut-off.
ALTER TABLE "site_configs" ADD COLUMN "delivery_estimate" TEXT;

-- K-Drop's storewide default, as supplied by the client. `default` (India) is
-- left untouched.
INSERT INTO "product_info_templates" ("id", "key", "blocks", "updated_at")
VALUES (
  'info-template-global',
  'global',
  $json$[
    {
      "heading": "PAYMENT & BILLING",
      "body": "We accept the following payment methods for your convenience:\nCredit and Debit Cards: Visa, Mastercard, American Express, and Discover\nUPI (Unified Payments Interface)\nNet Banking and Digital Wallets"
    },
    {
      "heading": "SHIPPING & DELIVERY",
      "body": "Shipping Method: Parcel delivery service\nDelivery Area: Across India\nShipping Charges: Calculated based on the items in your cart and the delivery destination\nEstimated Delivery Time: 7–15 business days from the date of dispatch\nPlease note that delivery times may vary depending on the destination and unforeseen logistical circumstances."
    },
    {
      "heading": "PRODUCT INQUIRIES & CUSTOMER SUPPORT",
      "body": "For product-related questions, please use the Q&A tab available on the relevant product page.\nFor all other inquiries, please contact our Customer Service Center:\nPhone: +82-1544-9348\nBusiness Hours: Monday to Friday, 09:00–18:00 KST (Korea Standard Time)\nOur customer support team will be happy to assist you with your inquiries."
    }
  ]$json$::jsonb,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
