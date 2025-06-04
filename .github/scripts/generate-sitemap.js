const fs = require("fs");
const path = require("path");
const { getAllContentFolders } = require("./utils/template-metadata");

const BASE_URL = "https://williamsfamilyestate.org";
const REPO_ROOT = path.join(__dirname, "../../");
const OUTPUT_FILE = path.join(REPO_ROOT, "sitemap.xml");

// 1. Discover folders
const folders = getAllContentFolders(REPO_ROOT);

// 2. Collect URLs from each folder’s manifest
const urls = folders.flatMap(folder => {
  const manifestPath = path.join(REPO_ROOT, folder, `${folder}.json`);
  if (!fs.existsSync(manifestPath)) {
    console.warn(`Skipping missing manifest: ${manifestPath}`);
    return [];
  }

  const entries = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  return entries.map(entry => `${BASE_URL}/${folder}/${entry.filename}`);
});

// 3. Build sitemap XML
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(url => `  <url><loc>${url}</loc></url>`),
  '</urlset>'
].join("\n");

// 4. Write to file
fs.writeFileSync(OUTPUT_FILE, xml, "utf-8");
console.log(`Sitemap generated with ${urls.length} entries from ${folders.length} folders.`);
