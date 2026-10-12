import { db } from "@/lib/db";
import {
  parseSubcategoryCsv,
  subcategoriesByProduct,
} from "@/lib/subcategory-csv";

/**
 * Mid-level category assignments: the queries behind the admin's bulk bar and
 * the CSV importer. Kept out of the server actions so the resolution rules can
 * be exercised directly (scripts, tests) without an admin session.
 */

export type AssignResult =
  { ok: true; changed: number } | { ok: false; message: string };

/**
 * Bulk-assign one mid-level category to many products.
 *
 * `add` files it on every selected product, `remove` takes it off, `clear`
 * drops all of a product's mid-level categories.
 */
export async function bulkAssignSubcategories(
  productIds: string[],
  categoryId: string | null,
  mode: "add" | "remove" | "clear" = "add",
): Promise<AssignResult> {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (ids.length === 0) {
    return { ok: false, message: "Select at least one product first." };
  }

  if (mode === "clear") {
    const removed = await db.productSubcategory.deleteMany({
      where: { productId: { in: ids } },
    });
    return { ok: true, changed: removed.count };
  }

  if (!categoryId) {
    return { ok: false, message: "Choose a subcategory first." };
  }
  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { parentId: true },
  });
  if (!category || !category.parentId) {
    return {
      ok: false,
      message:
        "Pick a subcategory (a mid-level category), not a top-level one.",
    };
  }

  if (mode === "add") {
    const result = await db.productSubcategory.createMany({
      data: ids.map((productId) => ({ productId, categoryId })),
      skipDuplicates: true,
    });
    return { ok: true, changed: result.count };
  }

  const removed = await db.productSubcategory.deleteMany({
    where: { productId: { in: ids }, categoryId },
  });
  return { ok: true, changed: removed.count };
}

export interface CsvReportRow {
  line?: number;
  productSlug: string;
  productName?: string;
  subcategories: string[];
  status: "ok" | "unknown-product" | "unknown-subcategory" | "unreadable";
  message?: string;
}

export interface CsvReport {
  parseErrors: string[];
  rows: CsvReportRow[];
  summary: {
    products: number;
    assignments: number;
    problems: number;
  };
}

/**
 * Resolve a subcategory CSV against the catalogue.
 *
 * The file is the source of truth per product: every product it mentions ends
 * up with exactly the subcategories listed for it (so re-running the same file
 * changes nothing). Products the file doesn't mention are left alone.
 */
export async function resolveSubcategoryCsv(csv: string): Promise<{
  report: CsvReport;
  assignments: { productId: string; categoryIds: string[] }[];
}> {
  const { rows, errors } = parseSubcategoryCsv(csv);
  const grouped = subcategoriesByProduct(rows);
  const report: CsvReport = {
    parseErrors: errors,
    rows: [],
    summary: { products: 0, assignments: 0, problems: errors.length },
  };

  if (grouped.size === 0) return { report, assignments: [] };

  const products = await db.product.findMany({
    where: { slug: { in: [...grouped.keys()] } },
    select: { id: true, slug: true, name: true },
  });
  const productBySlug = new Map(products.map((p) => [p.slug, p]));

  const subSlugs = new Set<string>();
  for (const entry of grouped.values()) {
    for (const slug of entry.subcategorySlugs) subSlugs.add(slug);
  }
  const categories = await db.category.findMany({
    where: { slug: { in: [...subSlugs] } },
    select: {
      id: true,
      slug: true,
      name: true,
      parentId: true,
      isActive: true,
    },
  });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const assignments: { productId: string; categoryIds: string[] }[] = [];

  for (const [productSlug, entry] of grouped) {
    const product = productBySlug.get(productSlug);
    const resolvedIds: string[] = [];
    const problems: string[] = [];

    if (!product) {
      report.rows.push({
        productSlug,
        subcategories: entry.subcategorySlugs,
        status: "unknown-product",
        message: "No product with this slug.",
      });
      report.summary.problems += 1;
      continue;
    }

    for (const slug of entry.subcategorySlugs) {
      const category = categoryBySlug.get(slug);
      if (!category) {
        problems.push(`No subcategory "${slug}".`);
        continue;
      }
      if (!category.parentId) {
        problems.push(`"${slug}" is a top-level category, not a subcategory.`);
        continue;
      }
      resolvedIds.push(category.id);
    }

    // A typo in one row must not throw away the product's other rows: the
    // resolvable subcategories are written, and the row is flagged so the
    // sheet can be fixed and re-imported.
    if (resolvedIds.length > 0) {
      assignments.push({ productId: product.id, categoryIds: resolvedIds });
      report.summary.products += 1;
      report.summary.assignments += resolvedIds.length;
    }
    if (problems.length > 0) {
      report.summary.problems += 1;
    }

    report.rows.push({
      productSlug,
      productName: product.name,
      subcategories: entry.subcategorySlugs,
      status: problems.length > 0 ? "unknown-subcategory" : "ok",
      message: problems.length > 0 ? problems.join(" ") : undefined,
    });
  }

  return { report, assignments };
}

/** Dry run: what the CSV would change, without writing anything. */
export async function previewSubcategoryCsv(csv: string): Promise<CsvReport> {
  const { report } = await resolveSubcategoryCsv(csv);
  return report;
}

/**
 * Apply the CSV. Only the rows that resolved cleanly are written — every
 * product the file mentions ends up with exactly its listed subcategories.
 */
export async function applySubcategoryCsv(csv: string): Promise<CsvReport> {
  const { report, assignments } = await resolveSubcategoryCsv(csv);

  for (const { productId, categoryIds } of assignments) {
    await db.$transaction([
      db.productSubcategory.deleteMany({ where: { productId } }),
      db.productSubcategory.createMany({
        data: categoryIds.map((categoryId) => ({ productId, categoryId })),
        skipDuplicates: true,
      }),
    ]);
  }

  return report;
}
