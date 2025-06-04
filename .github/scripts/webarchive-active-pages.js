// File: archive-active-documents.js
// Purpose: Archive only active documents (doc-status = "active")
// listed in folder-level manifest files using the Internet Archive's save endpoint.

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { getAllContentFolders } = require("./utils/template-metadata");
const { loadSiteConfig } = require("./utils/load-config");

const config = loadSiteConfig();
if (!config.automation?.archiveToInternetArchive) {
  console.log("Archive.org publishing disabled via site-config.json");
  process.exit(0);
}

const BASE_URL = "https://williamsfamilyestate.org";
const ARCHIVE_ENDPOINT = "https://web.archive.org/save/";
const MAX_CONCURRENT = 5;

const folders = getAllContentFolders('.');
let allUrls = [];

folders.forEach(folder => {
  const manifestPath = path.join(folder, `${folder}.json`);
  if (!fs.existsSync(manifestPath)) return;

  const entries = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  // Only include entries where doc-status is explicitly "active"
  const activeUrls = entries
    .filter(entry => entry['doc-status']?.toLowerCase() === 'active')
    .map(entry => `${BASE_URL}/${folder}/${entry.filename}`);

  allUrls.push(...activeUrls);
});

console.log(`Preparing to archive ${allUrls.length} active URLs...`);

async function archiveUrl(url) {
  console.log('Archiving:', url);
  try {
    const res = await fetch(ARCHIVE_ENDPOINT + encodeURIComponent(url));
    if (!res.ok) {
      console.warn('Failed:', url, res.statusText);
    } else {
      console.log('Archived:', url);
    }
  } catch (err) {
    console.error('Error:', url, err.message);
  }
}

// Submit URLs in batches to avoid hitting rate limits
async function archiveInBatches(urls, batchSize) {
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(archiveUrl));
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

archiveInBatches(allUrls, MAX_CONCURRENT)
  .then(() => console.log(`Archive complete. ${allUrls.length} active documents submitted.`));
