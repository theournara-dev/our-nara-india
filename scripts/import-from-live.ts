/**
 * Import the public catalog from the live Cafe24 store into PostgreSQL.
 *
 * This reads the store's public pages directly (sitemap → product pages) so the
 * client doesn't need to export anything manually for the catalog. It is a
 * best-effort importer: Cafe24 markup is parsed via JSON-LD / meta tags, and
 * selectors may need tuning against the live HTML as the store changes.
 *
 * Note: only the PUBLIC catalog (products, brands, prices, images) can be
 * pulled this way. Customer orders, accounts and mileage history live behind
 * login and require a one-time Cafe24 admin export.
 *
 * Usage:
 *   npm run import            # import everything
 *   npm run import -- --limit 10 --dry-run
 */
import "dotenv/config";
import { db } from "../src/lib/db";

const STORE_ORIGIN = "https://our-nara.com";

// Cafe24 exposes its sitemap at one of several conventional paths.
const SITEMAP_CANDIDATES = [
  `${STORE_ORIGIN}/sitemap.xml`,
  `${STORE_ORIGIN}/sitemap_index.xml`,
  `${STORE_ORIGIN}/shopinfo/sitemap.xml`,
];

// --- CLI flags --------------------------------------------------------------

function parseFlags(argv: string[]) {
  const limitIndex = argv.indexOf("--limit");
  const urlIndex = argv.indexOf("--url");
  return {
    limit: limitIndex >= 0 ? Number(argv[limitIndex + 1]) : Infinity,
    dryRun: argv.includes("--dry-run"),
    startUrl: urlIndex >= 0 ? argv[urlIndex + 1] : undefined,
  };
}

const { limit, dryRun, startUrl } = parseFlags(process.argv.slice(2));

// --- Helpers ----------------------------------------------------------------

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "OURNARA-importer/0.1" },
  });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}

/** Pull <script type="application/ld+json"> blocks out of an HTML page. */
function extractJsonLd(html: string): unknown[] {
  const blocks: unknown[] = [];
  const pattern =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }
  return blocks;
}

function findProductObject(blocks: unknown[]): Record<string, unknown> | null {
  for (const block of blocks) {
    const graph = Array.isArray(block) ? block : [block];
    for (const node of graph) {
      const obj = node as Record<string, unknown>;
      if (obj["@type"] === "Product" || obj["@type"] === "IndividualProduct") {
        return obj;
      }
    }
  }
  return null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function priceToMinorUnits(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100);
  }
  const str = typeof value === "string" ? value.replace(/[^0-9.]/g, "") : "";
  const number = Number(str);
  return Number.isFinite(number) ? Math.round(number * 100) : null;
}

// --- Extraction -------------------------------------------------------------

/**
 * Discover product URLs. Strategy:
 *  1. Try conventional sitemap paths (or an explicit `--url`).
 *  2. If none exist (Cafe24 often has no public sitemap), crawl the homepage
 *     and a few category listing pages for product-detail links.
 */
async function discoverProductUrls(): Promise<string[]> {
  const found = new Set<string>();
  const candidates = startUrl ? [startUrl] : SITEMAP_CANDIDATES;

  for (const candidate of candidates) {
    try {
      const body = await fetchText(candidate);
      for (const match of body.matchAll(
        /<loc>([^<]*\/product\/[^<]*)<\/loc>/g,
      )) {
        found.add(match[1]);
      }
    } catch {
      // Try the next candidate.
    }
  }

  if (found.size === 0) {
    console.log(
      "No sitemap found — crawling storefront pages for product links…",
    );
    for (const url of await crawlProductLinks()) found.add(url);
  }

  return [...found];
}

/** Product-detail paths look like /product/<slug>/<numeric-id>/… */
const PRODUCT_PATH = /\/product\/([a-z0-9-]+)\/\d+\//g;

/** Path segments that are image/asset folders rather than real products. */
const NON_PRODUCT_SLUGS = new Set([
  "big",
  "small",
  "medium",
  "list",
  "search",
  "detail",
]);

function isProductPath(match: RegExpMatchArray): boolean {
  return !NON_PRODUCT_SLUGS.has(match[1]);
}

async function crawlProductLinks(): Promise<string[]> {
  const productUrls = new Set<string>();
  const categoryUrls = new Set<string>();

  const home = await fetchText(`${STORE_ORIGIN}/`);
  for (const match of home.matchAll(PRODUCT_PATH)) {
    if (isProductPath(match)) productUrls.add(`${STORE_ORIGIN}${match[0]}`);
  }
  for (const match of home.matchAll(/\/product\/list\.html\?cate_no=\d+/g)) {
    categoryUrls.add(`${STORE_ORIGIN}${match[0]}`);
  }

  // Deepen coverage by crawling a few category listing pages.
  const toCrawl = [...categoryUrls].slice(0, 5);
  for (const url of toCrawl) {
    try {
      const body = await fetchText(url);
      for (const match of body.matchAll(PRODUCT_PATH)) {
        if (isProductPath(match)) productUrls.add(`${STORE_ORIGIN}${match[0]}`);
      }
    } catch {
      // Skip unreachable category pages.
    }
  }

  return [...productUrls];
}

interface ExtractedProduct {
  url: string;
  name: string;
  brandName: string;
  priceCents: number | null;
  summary: string | null;
  images: string[];
}

async function extractProduct(url: string): Promise<ExtractedProduct> {
  const html = await fetchText(url);
  const product = findProductObject(extractJsonLd(html));

  const name =
    (product?.["name"] as string) ??
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)/.exec(
      html,
    )?.[1] ??
    /<title>([^<]*)<\/title>/.exec(html)?.[1] ??
    url;

  // Cafe24 returns the brand with brackets, e.g. "[NOWATER]" — strip them.
  const brandName = (
    (product?.["brand"] as { name?: string })?.["name"] ?? "OUR:NARA"
  )
    .replace(/[\[\]]/g, "")
    .trim();
  const priceCents = priceToMinorUnits(
    product?.["offers"] &&
      (product["offers"] as { price?: unknown })?.["price"],
  );
  const summary = (product?.["description"] as string) ?? null;
  const images = asArray(product?.["image"]).map((img) =>
    typeof img === "string" ? img : ((img as { url?: string })?.url ?? ""),
  );

  return {
    url,
    name: name.trim(),
    brandName: brandName.trim(),
    priceCents,
    summary,
    images: images.filter(Boolean),
  };
}

function guessCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/tint|lip|mascara|eyeliner|cushion|blush|concealer/.test(lower))
    return "makeup";
  if (/shampoo|scalp|hair/.test(lower)) return "hair-care";
  if (
    /pre.?order|peptide|collagen|retinol|mask|serum|cream|toner|cleanser|sunscreen/.test(
      lower,
    )
  ) {
    return "pre-order";
  }
  return "skin-care";
}

async function upsertProduct(extracted: ExtractedProduct) {
  const slug =
    extracted.url.split("/product/")[1]?.split("/")[0] ?? extracted.name;
  const safeSlug =
    slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `product-${Date.now()}`;

  const brand = await db.brand.upsert({
    where: { slug: slugify(extracted.brandName) },
    create: {
      slug: slugify(extracted.brandName),
      name: extracted.brandName,
      isActive: true,
    },
    update: { name: extracted.brandName },
  });

  const categorySlug = guessCategory(extracted.name);
  const category = await db.category.upsert({
    where: { slug: categorySlug },
    create: { slug: categorySlug, name: titleCase(categorySlug) },
    update: {},
  });

  await db.product.upsert({
    where: { slug: safeSlug },
    create: {
      slug: safeSlug,
      brandId: brand.id,
      categoryId: category.id,
      name: extracted.name,
      summary: extracted.summary ?? undefined,
      priceCents: extracted.priceCents ?? 0,
      currency: "INR",
      isPreOrder: categorySlug === "pre-order",
      images: extracted.images,
      isActive: true,
    },
    update: {
      name: extracted.name,
      priceCents: extracted.priceCents ?? undefined,
      images: extracted.images,
    },
  });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value: string): string {
  return value
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// --- Main -------------------------------------------------------------------

async function main() {
  console.log(
    `Discovering product URLs${startUrl ? ` from ${startUrl}` : " from sitemap"}…`,
  );
  let urls = await discoverProductUrls();
  if (urls.length === 0) {
    throw new Error(
      "Could not find any product URLs. Pass --url <sitemap-or-listing-url> to point the importer at the store.",
    );
  }
  console.log(`Found ${urls.length} product URLs.`);

  if (urls.length > limit) urls = urls.slice(0, limit);

  let ok = 0;
  let failed = 0;
  for (const url of urls) {
    try {
      const extracted = await extractProduct(url);
      if (dryRun) {
        console.log(`[dry-run] ${extracted.name} (${extracted.brandName})`);
      } else {
        await upsertProduct(extracted);
      }
      ok++;
    } catch (error) {
      failed++;
      console.warn(`Failed ${url}: ${(error as Error).message}`);
    }
  }

  console.log(
    `\nFinished: ${ok} imported, ${failed} failed${dryRun ? " (dry-run)" : ""}.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
