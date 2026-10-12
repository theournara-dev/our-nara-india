/**
 * One-off migration: turn the old static subcategory lists
 * (`src/data/subcategories.ts`, now deleted) into real rows in the category
 * tree, and copy the legacy product → subcategory map into the new
 * `ProductSubcategory` assignments.
 *
 * Safe to re-run: children are matched by slug and assignments upsert.
 *
 *   node --import tsx --env-file=.env.local scripts/migrate-subcategories.ts
 *   node --import tsx --env-file=.env.local scripts/migrate-subcategories.ts --suggestions
 *   node --import tsx --env-file=.env.local scripts/migrate-subcategories.ts --suggestions --apply
 *
 * Without `--apply` it only prints what it would do (dry run). `--suggestions`
 * additionally proposes a mid-level category for every product that has none,
 * by name — review the list, then re-run with `--apply` (or assign in the
 * admin / by CSV import).
 */
import { db } from "../src/lib/db";

/** Child categories to create per root, mirroring the old static lists. */
const CHILDREN: { root: string; children: { slug: string; name: string }[] }[] =
  [
    {
      root: "skin-care",
      children: [
        { slug: "masks-patches", name: "Masks & Patches" },
        { slug: "facial-care", name: "Facial Care" },
        { slug: "cleansing", name: "Cleansing" },
        { slug: "sun-care", name: "Sun Care" },
        { slug: "set", name: "Set" },
      ],
    },
    {
      root: "makeup",
      children: [
        { slug: "base-makeup", name: "Base Makeup" },
        { slug: "eye-makeup", name: "Eye Makeup" },
        { slug: "lip-makeup", name: "Lip Makeup" },
      ],
    },
    // "hair-care" keeps its single root: the old list named its child "Hair
    // Care" too, which would collide with the root's slug. Create real
    // children (Shampoo, Treatment, …) in the admin when there is a need.
  ];

/** The legacy static product → subcategory map. */
const LEGACY_MAP: Record<string, string> = {
  // Skin Care
  "brightening-vitamin-serum": "facial-care",
  "return-collagen-cream-50g": "facial-care",
  "prestige73-teatree-mask-70g": "masks-patches",
  "prestige-collagen-eye-cream-25ml": "facial-care",
  "no-pore-cleansing-oil": "cleansing",
  "cica-panthenol-soothing-cream": "facial-care",
  "vegan-sun-cream": "sun-care",
  "soft-reset-green-cleansing-balm": "cleansing",
  "hydrating-hyaluronic-mist": "facial-care",
  "green-tangerine-vita-c-mist": "facial-care",
  // Makeup
  "blurring-slip-fit-lipcheek-choose-1-of-6": "lip-makeup",
  "first-stain-glow-tint-choose-1-of-10": "lip-makeup",
  "gleaming-skin-cushion-v2": "base-makeup",
  "love-core-tatto-water-tint-choose-1-of-20": "lip-makeup",
  "glow-dewy-tint-choose-1-of-10": "lip-makeup",
  // Pre-order
  "skin-booster-collagen-mask-50g": "masks-patches",
  "peptide-volume-lifting-pro-essence-30ml": "facial-care",
  "peptide-volume-lifting-pro-essence-100ml": "facial-care",
  "centella-dark-spot-solution-ampoule-pro": "facial-care",
  "peptide-volume-neck-cream": "facial-care",
  "centella-moist-soothing-gel-cream-ex": "facial-care",
  "timemelody-gold-collagen-ampoule": "facial-care",
  "grasen-hyal-pdrn-lift-shot-ampoule": "facial-care",
  "calming-cica-hydrogel-mask": "masks-patches",
  "radiance-collagen-hydrogel-mask": "masks-patches",
  "cream-hydrating-ingredients": "facial-care",
  "toner-soothing-treatment": "facial-care",
  "sunscreen-protection-factor": "sun-care",
  "aqua-protein-first-ampoule": "facial-care",
  "aqua-protein-cream": "facial-care",
  "stem-cell-peptide-retinol": "facial-care",
};

/**
 * Name-based first guess for products nobody has filed yet. Only a report —
 * the client reviews it (or applies it in the admin) before it counts.
 */
function suggest(name: string, categorySlug: string): string | null {
  const n = name.toLowerCase();
  if (categorySlug === "makeup") {
    if (/lip|tint|gloss|cheek/.test(n)) return "lip-makeup";
    if (/liner|mascara|brow|shadow|lash|kajal/.test(n)) return "eye-makeup";
    return "base-makeup";
  }
  if (categorySlug === "skin-care" || categorySlug === "pre-order") {
    if (/sun|spf|uv/.test(n)) return "sun-care";
    if (/cleanser|cleansing|foam|wipe|towel|(cleansing|clean) balm|oil/.test(n))
      return "cleansing";
    if (/patch|mask|sheet/.test(n)) return "masks-patches";
    if (/\b(kit|set)\b/.test(n)) return "set";
    return "facial-care";
  }
  // hair-care and tools have no mid-level categories yet.
  return null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const withSuggestions = process.argv.includes("--suggestions");
  const reset = process.argv.includes("--reset");
  const dry = !apply;

  if (reset) {
    const removed = await db.productSubcategory.deleteMany({});
    console.log(
      `# --reset: cleared ${removed.count} mid-level assignment(s)\n`,
    );
  }

  // ── 1. children ──────────────────────────────────────────────────────────
  console.log(`# Category tree ${dry ? "(dry run)" : ""}`);
  const childIdBySlug = new Map<string, string>();
  for (const group of CHILDREN) {
    const root = await db.category.findUnique({
      where: { slug: group.root },
      select: { id: true, name: true },
    });
    if (!root) {
      console.log(`  ! root "${group.root}" not found — skipped`);
      continue;
    }
    for (const [index, child] of group.children.entries()) {
      const existing = await db.category.findUnique({
        where: { slug: child.slug },
        select: { id: true, parentId: true },
      });
      if (existing) {
        childIdBySlug.set(child.slug, existing.id);
        if (existing.parentId !== root.id && !dry) {
          await db.category.update({
            where: { id: existing.id },
            data: { parentId: root.id },
          });
          console.log(`  ~ reparented ${child.slug} → ${root.name}`);
        } else {
          console.log(`  = ${child.slug} already exists`);
        }
        continue;
      }
      console.log(`  + ${child.slug} under ${root.name} (${child.name})`);
      if (dry) continue;
      const created = await db.category.create({
        data: {
          slug: child.slug,
          name: child.name,
          parentId: root.id,
          sortOrder: index,
        },
        select: { id: true },
      });
      childIdBySlug.set(child.slug, created.id);
    }
  }

  // ── 2. legacy map ────────────────────────────────────────────────────────
  console.log(`\n# Legacy product → subcategory map ${dry ? "(dry run)" : ""}`);
  let assigned = 0;
  const missingProduct: string[] = [];
  for (const [productSlug, childSlug] of Object.entries(LEGACY_MAP)) {
    const product = await db.product.findUnique({
      where: { slug: productSlug },
      select: { id: true },
    });
    const categoryId = childIdBySlug.get(childSlug);
    if (!product || !categoryId) {
      missingProduct.push(`${productSlug} (${childSlug})`);
      continue;
    }
    assigned += 1;
    if (dry) continue;
    await db.productSubcategory.upsert({
      where: {
        productId_categoryId: { productId: product.id, categoryId },
      },
      create: { productId: product.id, categoryId },
      update: {},
    });
  }
  console.log(`  ${assigned} assignment(s) ${dry ? "to write" : "written"}`);
  if (missingProduct.length > 0) {
    console.log(
      `  ! skipped ${missingProduct.length}: ${missingProduct.join(", ")}`,
    );
  }

  // ── 3. unassigned products ───────────────────────────────────────────────
  const unassigned = await db.product.findMany({
    where: { subcategories: { none: {} } },
    select: { slug: true, name: true, category: { select: { slug: true } } },
    orderBy: { slug: "asc" },
  });
  console.log(
    `\n# Products without a mid-level category: ${unassigned.length}`,
  );

  if (withSuggestions) {
    for (const p of unassigned) {
      const guess = suggest(p.name, p.category.slug);
      console.log(
        `  ${p.slug.padEnd(52)} [${p.category.slug}] → ${guess ?? "?"}`,
      );
      if (!guess || dry) continue;
      const categoryId = childIdBySlug.get(guess);
      if (!categoryId) continue;
      const product = await db.product.findUnique({
        where: { slug: p.slug },
        select: { id: true },
      });
      if (!product) continue;
      await db.productSubcategory.upsert({
        where: {
          productId_categoryId: { productId: product.id, categoryId },
        },
        create: { productId: product.id, categoryId },
        update: {},
      });
    }
    if (!dry) console.log("  (suggestions applied)");
  } else {
    for (const p of unassigned.slice(0, 15)) {
      console.log(`  ${p.slug.padEnd(52)} [${p.category.slug}]`);
    }
    if (unassigned.length > 15)
      console.log(`  … ${unassigned.length - 15} more`);
    console.log("  (re-run with --suggestions to see proposals)");
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
