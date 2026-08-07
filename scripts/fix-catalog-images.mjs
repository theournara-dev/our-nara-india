// Replace placeholder product images in catalog.ts with real images from the original.
import fs from "fs";

const ORIG_HTML = "F:/Projects/ournara-original/index.html";
const CATALOG = "src/data/catalog.ts";

const h = fs.readFileSync(ORIG_HTML, "utf8");
const map = {};
for (const b of h.split("anchorBoxId_").slice(1)) {
  const img = (b.match(/web\/product\/big\/([^"'\s]+)/) || [])[1];
  const name = (b.match(/color:#000000;">([^<]+)<\/span><\/a><\/strong>/) || [])[1];
  if (img && name && !map[name]) map[name] = img;
}
const alnum = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const normMap = {};
for (const k of Object.keys(map)) normMap[alnum(k)] = map[k];

let c = fs.readFileSync(CATALOG, "utf8");
const start = c.indexOf("const products");
const end = c.indexOf("const real");
const prefix = c.slice(0, start);
const seg = c.slice(start, end);
const suffix = c.slice(end);

// Split into product blocks by id
const blocks = seg.split(/{\s*id: "/);
let out = prefix + blocks[0];
const skipped = [];
let replaced = 0;

for (let i = 1; i < blocks.length; i++) {
  let block = "{ id: \"" + blocks[i];
  const nameM = block.match(/name: "([^"]+)"/);
  const name = nameM ? nameM[1] : null;
  const real = name ? normMap[alnum(name)] : null;
  if (real) {
    const path = "/product/big/" + real;
    // images: [image("...")]  (optionally with extra args)
    block = block.replace(/images:\s*\[[^\]]*image\([^)]*\)[^\]]*\]/, `images: ["${path}"]`);
    // hoverImage: image("...", "color")  (keep the trailing comment)
    block = block.replace(/(hoverImage:\s*)image\([^)]*\)(\s*,\s*\/\/[^\n]*)?/, `$1"${path}"$2`);
    replaced++;
  } else {
    skipped.push(name);
  }
  out += block;
}

fs.writeFileSync(CATALOG, out + suffix);
console.log("replaced:", replaced, "skipped:", skipped.length);
if (skipped.length) console.log("skipped:", skipped.join(" | "));
