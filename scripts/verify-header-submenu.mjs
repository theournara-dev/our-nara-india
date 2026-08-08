// Verify header submenu links include the subcategory filter.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(800);
const out = await page.evaluate(() => {
  // desktop dropdown submenu links (invisible until hover, but in DOM)
  const links = [...document.querySelectorAll("li.group a")].map((a) => ({
    text: a.textContent.trim(),
    href: a.getAttribute("href"),
  }));
  return links.filter((l) => l.href && l.href.includes("sub=")).slice(0, 12);
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
