// Compare the header between the original site and the local build.
// Run: npx -p playwright node scripts/compare-header.mjs
import { chromium } from "playwright";

const urls = {
  original: "https://our-nara.com",
  local: "http://localhost:3100",
};

async function extract(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto(url, { waitUntil: "networkidle" });

  const data = await page.evaluate(() => {
    const style = (el) => {
      const s = getComputedStyle(el);
      return {
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        color: s.color,
        letterSpacing: s.letterSpacing,
        lineHeight: s.lineHeight,
      };
    };
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    };

    // Menu items: find links whose text matches known categories, in the header (top of page).
    const menuTexts = [
      "Skin Care",
      "Makeup",
      "Hair Care",
      "PRE-ORDER",
      "BRAND",
      "REVIEW",
      "EVENT",
      "STORES",
      "AMBASSADOR",
    ];
    const menuItems = [...document.querySelectorAll("a")].filter((a) => {
      const r = a.getBoundingClientRect();
      return menuTexts.includes(a.textContent.trim()) && r.y < 200;
    });
    const menu = menuItems.map((a) => ({
      text: a.textContent.trim(),
      ...style(a),
      rect: rect(a),
    }));

    // Search icon
    const searchImg = document.querySelector(
      ".search img, .search_icon img, [alt='search']",
    );
    // +3,000P
    const tong = [...document.querySelectorAll("a")].find((a) =>
      a.textContent.includes("3,000P"),
    );
    // Hamburger
    const hamburger = document.querySelector(
      ".btn-allcate, [aria-label='All categories']",
    );

    return {
      headerHeight: rect(
        document.querySelector("#header") || document.querySelector("header"),
      ),
      menu,
      search: rect(searchImg),
      tong: rect(tong),
      hamburger: rect(hamburger),
    };
  });

  await browser.close();
  return data;
}

const orig = await extract(urls.original);
const local = await extract(urls.local);

console.log("=== ORIGINAL ===");
console.log(JSON.stringify(orig, null, 2));
console.log("=== LOCAL ===");
console.log(JSON.stringify(local, null, 2));
