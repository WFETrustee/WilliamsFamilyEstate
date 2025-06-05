// File: webarchive-active-pages.js
// Purpose: Archive only active documents to Archive.org using manifest data.
// Optimized to skip previously archived files and run in parallel.

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const crypto = require("crypto");
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
const STATE_FILE = ".archive-log.json";

let previousHashes = {};
if (fs.existsSync(STATE_FILE)) {
  try {
    previousHashes = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {}
}

const folders = getAllContentFolders(".");
const urlsToArchive = [];

folders.forEach(folder => {
  const manifestPath = path.join(folder, `${folder}.json`);
  if (!fs.existsSync(manifestPath)) return;

  const entries = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  entries.forEach(entry => {
    if (entry["doc-status"]?.toLowerCase() !== "active") return;
    const filePath = path.join(folder, entry.filename);
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath);
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    const url = `${BASE_URL}/${folder}/${entry.filename}`;

    if (previousHashes[url] !== hash) {
      urlsToArchive.push({ url, filePath, hash });
    }
  });
});

console.log(`Preparing to archive ${urlsToArchive.length} changed or new active URLs...`);

async function archiveUrl({ url, hash }) {
  console.log("Archiving:", url);
  try {
    const res = await fetch(ARCHIVE_ENDPOINT + encodeURIComponent(url));
    if (!res.ok) {
      console.warn("Failed:", url, res.statusText);
    } else {
      console.log("Archived:", url);
      previousHashes[url] = hash;
    }
  } catch (err) {
    console.error("Error:", url, err.message);
  }
}

async function archiveInBatches(items, batchSize) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(archiveUrl));
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

archiveInBatches(urlsToArchive, MAX_CONCURRENT).then(() => {
  fs.writeFileSync(STATE_FILE, JSON.stringify(previousHashes, null, 2));
  console.log(`Archive complete. ${urlsToArchive.length} submitted.`);
});
