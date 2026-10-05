/**
 * Regenerate src/data/countries.ts from the mledoze/countries dataset.
 * Usage: npx tsx scripts/generate-countries.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const URL =
  "https://raw.githubusercontent.com/mledoze/countries/master/countries.json";

type RawCountry = {
  name: { common: string };
  cca2: string;
  cca3: string;
  idd: { root: string; suffixes: string[] };
};

function callingCode(c: RawCountry): string {
  const root = c.idd?.root ?? "";
  const suffixes = c.idd?.suffixes ?? [];
  if (!root) return "";
  // Multiple suffixes (e.g. US/Canada area codes) share the root as the code.
  return suffixes.length === 1 ? `${root}${suffixes[0]}` : root;
}

async function main() {
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`GET ${URL} -> ${res.status}`);
  const data = (await res.json()) as RawCountry[];

  const countries = data
    .map((c) => ({
      name: c.name.common,
      code: c.cca2,
      code3: c.cca3,
      phone: callingCode(c),
    }))
    .filter((c) => c.code && c.phone)
    .sort((a, b) => a.name.localeCompare(b.name));

  const lines = [
    "export type Country = {",
    "  name: string;",
    "  code: string; // ISO 3166-1 alpha-2",
    "  code3: string; // ISO 3166-1 alpha-3 (Razorpay requires alpha-3)",
    "  phone: string; // dialing code",
    "};",
    "",
    `export const COUNTRIES: Country[] = [`,
    ...countries.map(
      (c) =>
        `  { name: ${JSON.stringify(c.name)}, code: ${JSON.stringify(c.code)}, code3: ${JSON.stringify(c.code3)}, phone: ${JSON.stringify(c.phone)} },`,
    ),
    "];",
    "",
    "export function findCountry(codeOrName: string): Country | undefined {",
    "  const q = codeOrName.trim().toLowerCase();",
    "  return COUNTRIES.find(",
    "    (c) =>",
    "      c.code.toLowerCase() === q ||",
    "      c.code3.toLowerCase() === q ||",
    "      c.name.toLowerCase() === q,",
    "  );",
    "}",
    "",
    "/** Convert an ISO alpha-2 code, alpha-3 code, or country name to alpha-3. */",
    "export function toAlpha3(codeOrName: string): string | undefined {",
    "  const trimmed = codeOrName.trim();",
    "  if (/^[A-Za-z]{3}$/.test(trimmed)) return trimmed.toUpperCase();",
    "  return findCountry(trimmed)?.code3;",
    "}",
    "",
  ];

  const out = resolve(process.cwd(), "src/data/countries.ts");
  writeFileSync(out, lines.join("\n"));
  console.log(`Wrote ${countries.length} countries to ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
