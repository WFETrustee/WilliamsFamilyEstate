// File: generate-sitemap.js
// Purpose: Generates sitemap.xml using only documents with doc-status "active".

const fs = require("fs");
const path = require("path");
const { getAllContentFolders } = require("./utils/template-metadata");
const { loadSiteConfig } = require("./utils/load-config");

const config = loadSiteConfig();
if (!config.automation?.generateSitemap) {
  console.log("Sitemap generation disabled via site-config.json");
  process.exit(0);
}

const BASE_URL = "https://williamsfamilyestate.org";
const OUTPUT_FILE = "sitemap.xml";

// Discover folders that contain template files
const folders = getAllContentFolders('.');

// Collect only active document URLs from each manifest
const urls = folders.flatMap(folder => {
  const manifestPath = path.join(folder, `${folder}.json`);
  if (!fs.existsSync(manifestPath)) {
    console.warn(`Missing manifest in folder: ${folder}`);
    return [];
  }

  const entries = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  return entries
    .filter(entry => entry['doc-status']?.toLowerCase() === 'active')
    .map(entry => ({
      loc: `${BASE_URL}/${folder}/${entry.filename}`,
      lastmod: entry.lastModified
    }));
});

// Create XML structure for sitemap
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`),
  '</urlset>'
].join("\n");

// Write sitemap.xml to the root of the repository
fs.writeFileSync(OUTPUT_FILE, 'utf-8');
console.log('sitemap.xml written with ' + urls.length + ' active entries.');
