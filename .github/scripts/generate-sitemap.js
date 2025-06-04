const fs = require("fs");
const path = require("path");
const { getAllContentFolders } = require("./utils/template-metadata");

const BASE_URL = "https://williamsfamilyestate.org";
const OUTPUT_FILE = "sitemap.xml"; // relative to repo root

// Discover folders with valid templates
const folders = getAllContentFolders('.');

// Aggregate URLs from each folder’s manifest
const urls = folders.flatMap(folder => {
  const manifestPath = path.join(folder, `${folder}.json`);
  if (!fs.existsSync(manifestPath)) {
    console.warn(`Missing manifest in folder: ${folder}`);
    return [];
  }

  const entries = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  return entries.map(entry => ({
    loc: `${BASE_URL}/${folder}/${entry.filename}`,
    lastmod: entry.lastModified
  }));
});

// Generate XML
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`),
  '</urlset>'
].join("\n");

// Write to root
fs.writeFileSync(OUTPUT_FILE, xml, 'utf-8');
