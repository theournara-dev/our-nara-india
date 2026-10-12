/**
 * Smoke test for the top-level and mid-level category admin paths (the queries
 * behind /admin/categories, the products list's bulk bar and the CSV import).
 * Creates a throwaway category tree + product, exercises move/bulk/CSV, then
 * removes everything it made.
 *
 *   node --import tsx --env-file=.env.local scripts/test-category-admin.ts
 */
import { db } from "../src/lib/db";
import {
  applySubcategoryCsv,
  bulkAssignSubcategories,
  previewSubcategoryCsv,
} from "../src/data/subcategory-assignments";

let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  console.log(
    `${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`,
  );
  if (!ok) failures += 1;
}

async function main() {
  const stamp = Date.now().toString(36);
  const rootSlug = `zz-test-root-${stamp}`;
  const childSlug = `zz-test-child-${stamp}`;
  const child2Slug = `zz-test-child2-${stamp}`;
  const productSlug = `zz-test-product-${stamp}`;
  const product2Slug = `zz-test-product2-${stamp}`;

  const root = await db.category.create({
    data: { slug: rootSlug, name: "ZZ Test Root", sortOrder: 0 },
  });
  const child = await db.category.create({
    data: {
      slug: childSlug,
      name: "ZZ Test Child",
      parentId: root.id,
      sortOrder: 0,
    },
  });
  const child2 = await db.category.create({
    data: {
      slug: child2Slug,
      name: "ZZ Test Child 2",
      parentId: root.id,
      sortOrder: 1,
    },
  });
  const brand = await db.brand.findFirstOrThrow({ select: { id: true } });
  const product = await db.product.create({
    data: {
      slug: productSlug,
      name: "ZZ Test Product",
      brandId: brand.id,
      categoryId: root.id,
      shortTags: [],
      priceCents: 100,
      currency: "INR",
      images: [],
    },
  });
  const product2 = await db.product.create({
    data: {
      slug: product2Slug,
      name: "ZZ Test Product 2",
      brandId: brand.id,
      categoryId: root.id,
      shortTags: [],
      priceCents: 100,
      currency: "INR",
      images: [],
    },
  });

  // ── bulk assign ──────────────────────────────────────────────────────────
  const added = await bulkAssignSubcategories([product.id], child.id, "add");
  check("bulk add assigns the subcategory", added.ok && added.changed === 1);

  const again = await bulkAssignSubcategories([product.id], child.id, "add");
  check("bulk add is idempotent", again.ok && again.changed === 0);

  const both = await bulkAssignSubcategories([product.id], child2.id, "add");
  check("a second subcategory is allowed", both.ok && both.changed === 1);
  const count = await db.productSubcategory.count({
    where: { productId: product.id },
  });
  check("product sits in two subcategories", count === 2, `count=${count}`);

  const refused = await bulkAssignSubcategories([product.id], root.id, "add");
  check("a top-level category is refused", !refused.ok);

  const removed = await bulkAssignSubcategories(
    [product.id],
    child.id,
    "remove",
  );
  check("bulk remove takes one off", removed.ok && removed.changed === 1);
  const cleared = await bulkAssignSubcategories([product.id], null, "clear");
  check("clear drops the rest", cleared.ok && cleared.changed === 1);

  // ── delete guards ────────────────────────────────────────────────────────
  const rootWithChildren = await db.category.findUnique({
    where: { id: root.id },
    select: { _count: { select: { children: true, products: true } } },
  });
  check(
    "the guard data is visible (children + products)",
    rootWithChildren?._count.children === 2 &&
      rootWithChildren?._count.products === 2,
    JSON.stringify(rootWithChildren?._count),
  );

  // ── CSV round trip ───────────────────────────────────────────────────────
  const csv = [
    "product slug, category, subcategory",
    `${productSlug}, ${rootSlug}, ${childSlug}`,
    `${productSlug}, ${rootSlug}, ${child2Slug}`,
    `does-not-exist-${stamp}, ${rootSlug}, ${childSlug}`,
    `${product2Slug}, ${rootSlug}, ${childSlug}`,
    `${product2Slug}, ${rootSlug}, not-a-subcategory`,
  ].join("\n");

  const preview = await previewSubcategoryCsv(csv);
  check(
    "preview counts the good rows",
    preview.summary.products === 2 && preview.summary.assignments === 3,
    JSON.stringify(preview.summary),
  );
  check(
    "preview flags the unknown product and subcategory",
    preview.rows.some((r) => r.status === "unknown-product") &&
      preview.rows.some((r) => r.status === "unknown-subcategory"),
  );

  const applied = await applySubcategoryCsv(csv);
  const afterCsv = await db.productSubcategory.findMany({
    where: { productId: product.id },
    select: { categoryId: true },
  });
  const afterCsv2 = await db.productSubcategory.findMany({
    where: { productId: product2.id },
    select: { categoryId: true },
  });
  check(
    "apply writes exactly the file's subcategories",
    applied.summary.products === 2 &&
      afterCsv.length === 2 &&
      afterCsv.every(
        (row) => row.categoryId === child.id || row.categoryId === child2.id,
      ),
  );
  check(
    "a typo only drops that row, not the product's others",
    afterCsv2.length === 1 && afterCsv2[0].categoryId === child.id,
    `rows=${afterCsv2.length}`,
  );

  const secondRun = await applySubcategoryCsv(csv);
  const afterSecond = await db.productSubcategory.count({
    where: { productId: product.id },
  });
  check(
    "re-importing the same file changes nothing",
    secondRun.summary.products === 2 && afterSecond === 2,
    `products=${secondRun.summary.products} rows=${afterSecond}`,
  );

  // ── cleanup ──────────────────────────────────────────────────────────────
  await db.productSubcategory.deleteMany({
    where: { productId: { in: [product.id, product2.id] } },
  });
  await db.product.deleteMany({
    where: { id: { in: [product.id, product2.id] } },
  });
  await db.category.deleteMany({
    where: { id: { in: [child.id, child2.id, root.id] } },
  });
  const leftovers = await db.category.count({
    where: { slug: { in: [rootSlug, childSlug, child2Slug] } },
  });
  check("cleanup removed the throwaway tree", leftovers === 0);

  await db.$disconnect();
  console.log(
    failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
