-- Pre-order eligibility for coupons. Off by default: a pre-order ships later,
-- and most offers are meant for stock that ships now.
ALTER TABLE "coupons" ADD COLUMN "pre_order_allowed" BOOLEAN NOT NULL DEFAULT false;

-- Redemptions are now recorded for guest checkouts too. `user_id` becomes
-- optional and the order email identifies the shopper, so per-customer limits
-- and usage caps count guests as well.
ALTER TABLE "coupon_redemptions" ALTER COLUMN "user_id" DROP NOT NULL,
ADD COLUMN "email" TEXT;

-- CreateIndex
CREATE INDEX "coupon_redemptions_email_idx" ON "coupon_redemptions"("email");
