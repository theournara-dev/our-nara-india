-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "hours" JSONB,
    "map_query" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stores_version_sort_order_idx" ON "stores"("version", "sort_order");

/* Seed one store per storefront with the values the /stores page showed
   before stores became a list, so the switch is invisible to shoppers. */
INSERT INTO "stores" ("id", "version", "name", "address", "phone", "email", "hours", "map_query", "sort_order", "is_active", "created_at", "updated_at")
VALUES
  ('store_local_default', 'local', 'OURNARA',
   'One World, S.V. Road, Near N L School, Malad West, Mumbai, Maharashtra 400064',
   '+91-88283-38323', 'theournara@gmail.com',
   '{"mon":{"closed":false,"open":"09:00","close":"18:00"},"tue":{"closed":false,"open":"09:00","close":"18:00"},"wed":{"closed":false,"open":"09:00","close":"18:00"},"thu":{"closed":false,"open":"09:00","close":"18:00"},"fri":{"closed":false,"open":"09:00","close":"18:00"},"sat":{"closed":true,"open":"09:00","close":"18:00"},"sun":{"closed":true,"open":"09:00","close":"18:00"}}'::jsonb,
   'One World, S.V. Road, Near N L School, Malad West, Mumbai, Maharashtra 400064',
   0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('store_global_default', 'global', 'OURNARA',
   'Room 1816, Building B, Incheon Techno Valley U1 Center, 94, Galsan-dong, Bupyeong-gu, Incheon, Republic of Korea',
   '', 'tft@thefirstteam.co.kr',
   '{"mon":{"closed":false,"open":"09:00","close":"18:00"},"tue":{"closed":false,"open":"09:00","close":"18:00"},"wed":{"closed":false,"open":"09:00","close":"18:00"},"thu":{"closed":false,"open":"09:00","close":"18:00"},"fri":{"closed":false,"open":"09:00","close":"18:00"},"sat":{"closed":true,"open":"09:00","close":"18:00"},"sun":{"closed":true,"open":"09:00","close":"18:00"}}'::jsonb,
   'Room 1816, Building B, Incheon Techno Valley U1 Center, 94, Galsan-dong, Bupyeong-gu, Incheon, Republic of Korea',
   0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- DropTable columns superseded by the stores list (they were never filled).
ALTER TABLE "site_configs" DROP COLUMN IF EXISTS "store_name";
ALTER TABLE "site_configs" DROP COLUMN IF EXISTS "store_hours";
ALTER TABLE "site_configs" DROP COLUMN IF EXISTS "store_map_query";
