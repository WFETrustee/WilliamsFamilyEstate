const fs = require("fs");
const path = require("path");

const BASE_URL = "https://williamsfamilyestate.org";
const CONTENT_DIRS = ["notices", "emergency", "education"]; // Add more as needed
const OUTPUT_FILE = path.join(".", "sitemap.xml");

function walkDir(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".html"))
    .map(f => `${BASE_URL}/${dir}/${f}`);
}

const urls = CONTENT_DIRS.flatMap(walkDir);

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(url => `  <url><loc>${url}</loc></url>`),
  '</urlset>'
].join("\n");

fs.writeFileSync(OUTPUT_FILE, xml, "utf-8");

console.log(`✅ Sitemap generated with ${urls.length} URLs.`);
