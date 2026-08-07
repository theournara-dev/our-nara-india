// Compare a page between the original Cafe24 site and the local Next.js build.
// Extracts content + geometry signals from both and prints a diff.
// Run: npx -p playwright node scripts/compare-page.mjs <original-url> <local-url> [name]
import { chromium } from "playwright";

const [, , ORIG = "http://localhost:3100/", LOCAL = "http://localhost:3000/", NAME = "page"] =
  process.argv;

async function extract(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);

  const data = await page.evaluate(() => {
    const visible = (el) => {
      if (!el || el.nodeType !== 1) return false;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return (
        s.display !== "none" &&
        s.visibility !== "hidden" &&
        parseFloat(s.opacity) > 0 &&
        r.width > 0 &&
        r.height > 0
      );
    };
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const clean = (t) => (t || "").replace(/\s+/g, " ").trim();

    // All images (visible), in DOM order
    const images = [...document.querySelectorAll("img")].filter(visible).map((img) => {
      const r = img.getBoundingClientRect();
      return {
        src: (img.currentSrc || img.src || "").replace(window.location.origin, ""),
        alt: clean(img.alt),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    });

    // Headings
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visible).map((h) => ({
      level: +h.tagName[1],
      text: clean(h.textContent),
      y: Math.round(h.getBoundingClientRect().top),
    }));

    // Buttons + links that look like buttons
    const buttons = [...document.querySelectorAll("button, a.btn, [class*='btn']")]
      .filter(visible)
      .map((b) => clean(b.textContent))
      .filter(Boolean);

    // Top-level section ids + first heading of each
    const sections = [...document.querySelectorAll("section, .section, [id]")]
      .filter((s) => visible(s))
      .slice(0, 60)
      .map((s) => ({
        tag: s.tagName,
        id: s.id,
        cls: (s.className && s.className.baseVal !== undefined ? s.className.baseVal : s.className) || "",
        firstText: clean(s.textContent).slice(0, 60),
      }));

    // Links summary
    const links = [...document.querySelectorAll("a")].filter(visible).map((a) => ({
      text: clean(a.textContent).slice(0, 40),
      href: (a.getAttribute("href") || "").slice(0, 60),
    }));

    return { images, headings, buttons, links, sections };
  });

  await browser.close();
  return data;
}

const [orig, local] = await Promise.all([extract(ORIG), extract(LOCAL)]);

const out = { name: NAME, orig, local };
// Also write a flattened diff-friendly version
console.log("=== " + NAME + " ===");
console.log(JSON.stringify(out, null, 2));
