/**
 * Parser for the bulk subcategory CSV (products list → "Import CSV").
 *
 * The client's format is one row per product ↔ mid-level category pair:
 *
 *   product slug, category, subcategory
 *   cica-panthenol-soothing-cream, skin-care, facial-care
 *   daiso-roll-type-cleansing-towel-20-sheets, skin-care, cleansing
 *   daiso-roll-type-cleansing-towel-20-sheets, skin-care, masks-patches
 *
 * A product with several subcategories simply appears on several rows. The
 * header row is optional; quoted values are tolerated. Pure and free of the
 * database so the rules are unit tested.
 */

export interface SubcategoryCsvRow {
  /** 1-based line number in the pasted text (for the preview report). */
  line: number;
  productSlug: string;
  categorySlug: string;
  subcategorySlug: string;
}

export interface ParsedSubcategoryCsv {
  rows: SubcategoryCsvRow[];
  /** Lines that could not be read at all (too few columns, empty cells). */
  errors: string[];
}

const HEADER_WORDS = new Set(["slug", "product", "product slug", "category", "subcategory"]);

/** Strip a single pair of surrounding quotes (Excel exports quote freely). */
function unquote(value: string): string {
  const v = value.trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    return v.slice(1, -1).replace(/""/g, '"').trim();
  }
  return v;
}

export function parseSubcategoryCsv(text: string): ParsedSubcategoryCsv {
  const rows: SubcategoryCsvRow[] = [];
  const errors: string[] = [];

  const lines = text.split(/\r?\n/);
  lines.forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed) return;
    // Comments let a sheet keep notes between blocks.
    if (trimmed.startsWith("#")) return;

    const cells = trimmed.split(",").map(unquote);
    if (cells.length < 3 || cells.some((c) => c === "")) {
      errors.push(`Line ${line}: expected "product slug, category, subcategory".`);
      return;
    }

    const [productSlug, categorySlug, subcategorySlug] = cells;
    // Skip a header row whatever its column order.
    if (
      HEADER_WORDS.has(productSlug.toLowerCase()) &&
      HEADER_WORDS.has(subcategorySlug.toLowerCase())
    ) {
      return;
    }
    if (!/^[a-z0-9-]+$/.test(productSlug)) {
      errors.push(`Line ${line}: "${productSlug}" is not a product slug.`);
      return;
    }
    if (!/^[a-z0-9-]+$/.test(subcategorySlug)) {
      errors.push(`Line ${line}: "${subcategorySlug}" is not a subcategory slug.`);
      return;
    }

    rows.push({
      line,
      productSlug,
      categorySlug: categorySlug.toLowerCase(),
      subcategorySlug: subcategorySlug.toLowerCase(),
    });
  });

  return { rows, errors };
}

/** Group the parsed rows by product, keeping the row order (duplicates dropped). */
export function subcategoriesByProduct(
  rows: SubcategoryCsvRow[],
): Map<string, { categorySlug: string; subcategorySlugs: string[] }> {
  const byProduct = new Map<
    string,
    { categorySlug: string; subcategorySlugs: string[] }
  >();
  for (const row of rows) {
    const entry = byProduct.get(row.productSlug) ?? {
      categorySlug: row.categorySlug,
      subcategorySlugs: [],
    };
    if (!entry.subcategorySlugs.includes(row.subcategorySlug)) {
      entry.subcategorySlugs.push(row.subcategorySlug);
    }
    byProduct.set(row.productSlug, entry);
  }
  return byProduct;
}
