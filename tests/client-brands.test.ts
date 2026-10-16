import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
// Loads .env when the suite is run locally (the other tests are pure logic and
// need no environment), so this check runs instead of skipping.
import "dotenv/config";

/**
 * The brand directory must carry every brand the client listed in the
 * 2026-10-15 feedback ("Verify and update the brand list"): each one active,
 * with the exact display name they used, and with products behind it so its
 * page is not an empty shell.
 *
 * The list is catalogue data, so the test needs the database. It skips itself
 * when no DATABASE_URL is configured (the pure-logic suite still runs offline).
 */

const CLIENT_BRANDS = [
  "Prelude Dinto",
  "TAG",
  "ZOOM by JUNGSAEMMOOL",
  "JMsolution",
  "IPKN",
  "BONCEPT",
  "VOV",
  "MIMO by MAMONDE",
  "MEDIPEEL",
  "VT",
];

const connectionString = process.env.DATABASE_URL;

test(
  "every brand the client listed is active and has products",
  { skip: connectionString ? false : "DATABASE_URL is not set" },
  async () => {
    // Imported lazily so a missing generated client never breaks the suite.
    const { PrismaClient } = await import("../src/generated/prisma/client");
    const db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: connectionString as string }),
    });
    try {
      const brands = await db.brand.findMany({
        where: { name: { in: CLIENT_BRANDS } },
        select: {
          name: true,
          slug: true,
          isActive: true,
          _count: { select: { products: true } },
        },
      });

      const byName = new Map(brands.map((b) => [b.name, b]));
      for (const name of CLIENT_BRANDS) {
        const brand = byName.get(name);
        assert.ok(brand, `"${name}" is missing from the brand directory`);
        assert.equal(
          brand.isActive,
          true,
          `"${name}" is hidden from the store`,
        );
        assert.ok(
          brand._count.products > 0,
          `"${name}" has no products, so its brand page would be empty`,
        );
        assert.match(brand.slug, /^[a-z0-9-]+$/, `"${name}" has an odd slug`);
      }
    } finally {
      await db.$disconnect();
    }
  },
);
