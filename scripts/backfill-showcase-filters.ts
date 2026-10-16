/**
 * One-off backfill for the home page's tabbed showcase (client's slide 2).
 *
 * The filters the client configured before this round carry no brand, and one
 * of them (Dinto) has no banner link at all. This script attaches each filter
 * to the brand its own products belong to and records a `rows` value that keeps
 * every product the filter shows today (columns × rows is the new ceiling).
 *
 * Dry run by default; pass --apply to write.
 *
 *   npx tsx --env-file=.env scripts/backfill-showcase-filters.ts --apply
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const apply = process.argv.includes("--apply");
const COLUMNS = 4;

type Tab = {
  id: string;
  label?: string;
  brandSlug?: string;
  href?: string;
  productSlugs?: string[];
  columns?: number;
  rows?: number;
  [key: string]: unknown;
};

async function main() {
  const page = await db.page.findUnique({
    where: { slug: "home" },
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });
  const section = page?.sections.find((s) => s.type === "tabbed-showcase");
  if (!section) {
    process.stdout.write("No tabbed-showcase section on the home page.\n");
    return;
  }

  const config = section.config as { tabs?: Tab[]; columns?: number };
  const tabs = config.tabs ?? [];
  const columns = config.columns ?? COLUMNS;

  const next: Tab[] = [];
  for (const tab of tabs) {
    const slugs = tab.productSlugs ?? [];
    const rows = await db.product.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, brand: { select: { slug: true, name: true } } },
    });

    // The filter's own products decide its brand: the most common one.
    const tally = new Map<string, { count: number; name: string }>();
    for (const r of rows) {
      const key = r.brand.slug;
      const entry = tally.get(key) ?? { count: 0, name: r.brand.name };
      entry.count += 1;
      tally.set(key, entry);
    }
    const dominant = [...tally.entries()].sort(
      (a, b) => b[1].count - a[1].count,
    )[0];

    // Columns × rows must not drop products the filter already shows.
    const neededRows = Math.max(
      tab.rows ?? 1,
      Math.ceil(slugs.length / columns),
    );

    const brandSlug = tab.brandSlug?.trim() || dominant?.[0] || "";
    const patch: Partial<Tab> = {
      brandSlug,
      columns: tab.columns ?? columns,
      rows: neededRows,
    };

    process.stdout.write(
      `${JSON.stringify(tab.label)} → brand=${brandSlug}${dominant ? ` (${dominant[1].name}, ${dominant[1].count}/${slugs.length})` : ""} rows=${neededRows} columns=${patch.columns} href=${tab.href || `(derived /brand/${brandSlug})`}\n`,
    );
    next.push({ ...tab, ...patch });
  }

  if (!apply) {
    process.stdout.write("\nDry run — pass --apply to write.\n");
    return;
  }

  await db.pageSection.update({
    where: { id: section.id },
    data: {
      config: { ...config, tabs: next } as unknown as Prisma.InputJsonValue,
    },
  });
  process.stdout.write("\nSaved.\n");
}

main()
  .catch((e) => process.stderr.write(String(e)))
  .finally(() => db.$disconnect());
