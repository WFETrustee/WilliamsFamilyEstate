const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { getAllContentFolders } = require("./utils/template-metadata");

const BASE_URL = "https://williamsfamilyestate.org";
const ARCHIVE_ENDPOINT = "https://web.archive.org/save/";
const MAX_CONCURRENT = 5; // adjustable batch size

const folders = getAllContentFolders('.');
let allUrls = [];

folders.forEach(folder => {
  const manifestPath = path.join(folder, `${folder}.json`);
  if (!fs.existsSync(manifestPath)) return;

  const entries = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const urls = entries.map(e => `${BASE_URL}/${folder}/${e.filename}`);
  allUrls.push(...urls);
});

console.log(`Preparing to archive ${allUrls.length} URLs...`);

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

// Batched concurrency helper
async function archiveInBatches(urls, batchSize) {
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(archiveUrl));
    await new Promise(resolve => setTimeout(resolve, 1500)); // short delay between batches
  }
}

archiveInBatches(allUrls, MAX_CONCURRENT)
  .then(() => console.log(`Archive complete. ${allUrls.length} attempted.`));
