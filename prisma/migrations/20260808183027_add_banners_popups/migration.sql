-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "placement" TEXT NOT NULL DEFAULT 'long',
    "image" TEXT NOT NULL,
    "mobile_image" TEXT,
    "alt" TEXT,
    "href" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "popups" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "image" TEXT,
    "cta_label" TEXT,
    "cta_href" TEXT,
    "placement" TEXT NOT NULL DEFAULT 'center',
    "frequency" TEXT NOT NULL DEFAULT 'once',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "popups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "banners_is_active_placement_sort_order_idx" ON "banners"("is_active", "placement", "sort_order");

-- CreateIndex
CREATE INDEX "popups_is_active_placement_idx" ON "popups"("is_active", "placement");
