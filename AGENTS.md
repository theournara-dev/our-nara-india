# Cafe24 → Next.js Migration

The original Cafe24 website located at /cafe24-original is the
visual source of truth.

The Next.js implementation must reproduce the original site
pixel-perfectly.

Rules:

1. Never invent spacing, colors, dimensions, fonts, or assets.
2. Inspect the original HTML/CSS before implementing components.
3. Reuse original assets whenever possible.
4. Preserve exact CSS values initially.
5. Do not replace exact pixel values with approximate Tailwind classes.
6. Do not change fonts unless explicitly required.
7. Do not optimize or refactor CSS until visual parity is achieved.
8. Test pages at the exact reference viewport dimensions.
9. Compare screenshots between the original and Next.js versions.
10. Fix the smallest possible CSS/layout difference first.
11. Do not modify the original Cafe24 files.
12. When uncertain, inspect the original implementation instead
    of guessing.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
