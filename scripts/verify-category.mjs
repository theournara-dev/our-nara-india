// Quick verification of the category page changes via Chromium.
import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:3000/category/skin-care";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(800);

const out = await page.evaluate(() => {
  const main = document.querySelector("main") || document.body;
  const nav = main.querySelector("nav");
  const h1 = main.querySelector("h1");
  const chips = [...main.querySelectorAll("a.rounded-full")].map((a) =>
    a.textContent.trim(),
  );
  const count = main.querySelector("span")?.textContent.trim();
  const sort = [...main.querySelectorAll("select option")].map((o) => o.text);
  const grid = main.querySelector(".grid");
  const gridCols = grid
    ? getComputedStyle(grid).gridTemplateColumns.split(" ").length
    : 0;
  const toolbar = main.querySelector("div.flex.items-center.justify-between");
  return {
    url: location.pathname + location.search,
    navJustify: nav ? getComputedStyle(nav).justifyContent : null,
    h1Align: h1 ? getComputedStyle(h1).textAlign : null,
    chips,
    count,
    sort,
    gridCols,
    tbBorder: toolbar ? getComputedStyle(toolbar).borderTopWidth : null,
    cards: grid ? grid.children.length : 0,
  };
});

console.log(JSON.stringify(out, null, 2));
await browser.close();
