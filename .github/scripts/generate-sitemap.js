const fs = require("fs");
const path = require("path");
const { getAllContentFolders } = require("./utils/template-metadata");

const BASE_URL = "https://williamsfamilyestate.org";
const REPO_ROOT = path.join(__dirname, "../../");
const OUTPUT_FILE = path.join(REPO_ROOT, "sitemap.xml");

// 1. Dynamically discover content folders
const contentFolders = getAllContentFolders(REPO_ROOT);

// 2. Walk each folder and collect .html files
function walkFolder(folder) {
  const folderPath = path.join(REPO_ROOT, folder);
  if (!fs.existsSync(folderPath)) return [];

  return fs.readdirSync(folderPath)
    .filter(f => f.endsWith(".html"))
    .map(f => `${BASE_URL}/${folder}/${f}`);
}

const urls = contentFolders.flatMap(walkFolder);

// 3. Generate sitemap
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(url => `  <url><loc>${url}</loc></url>`),
  '</urlset>'
].join("\n");

// 4. Write file
fs.writeFileSync(OUTPUT_FILE, xml, "utf-8");

console.log(`✅ Sitemap generated with ${urls.length} URLs from ${contentFolders.length} folders.`);
