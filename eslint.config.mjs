import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Ban Prisma's unsafe raw-query escape hatches. Normal `$queryRaw` / `$executeRaw`
  // tagged templates are parameterized and safe; the `…Unsafe` variants build SQL
  // from strings and open the door to injection.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[property.name=/^\\$(queryRawUnsafe|executeRawUnsafe)$/]",
          message:
            "Do not use Prisma $queryRawUnsafe/$executeRawUnsafe. Use a parameterized $queryRaw/$executeRaw tagged template or the Prisma query builder instead.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Static assets copied from the original site (and vendored libs).
    "public/**",
  ]),
]);

export default eslintConfig;
