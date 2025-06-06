// ============================================================
// File: .github/scripts/generate-clean-path-redirects.js
// Purpose: Auto-create and clean /[folder]/[doc-id]/index.html redirect shims
//          Based on page-routes.json mappings. 100% data driven.
// ============================================================

const fs = require('fs');
const path = require('path');

const ROUTE_FILE = 'page-routes.json';
if (!fs.existsSync(ROUTE_FILE)) {
  console.error(`Missing route file: ${ROUTE_FILE}`);
  process.exit(1);
}

const routes = JSON.parse(fs.readFileSync(ROUTE_FILE, 'utf-8'));
const expectedPaths = new Set();
let created = 0, skipped = 0, removed = 0;

for (const [docId, relativePath] of Object.entries(routes)) {
  const parts = relativePath.split('/');
  if (parts.length !== 2) {
    console.warn(`Skipping invalid path: ${relativePath}`);
    continue;
  }

  const [folder, filename] = parts;
  const targetUrl = `/${folder}/${filename}`;
  const redirectDir = path.join(folder, docId);
  const redirectPath = path.join(redirectDir, 'index.html');

  expectedPaths.add(redirectPath);

  const redirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Redirecting...</title>
  <meta http-equiv="refresh" content="0; url=${targetUrl}">
  <script>window.location.href = "${targetUrl}";</script>
</head>
<body>
  Redirecting...
</body>
</html>`;

  let needsWrite = true;
  if (fs.existsSync(redirectPath)) {
    const current = fs.readFileSync(redirectPath, 'utf-8');
    if (current.trim() === redirectHtml.trim()) {
      needsWrite = false;
    }
  }

  if (needsWrite) {
    fs.mkdirSync(redirectDir, { recursive: true });
    fs.writeFileSync(redirectPath, redirectHtml, 'utf-8');
    created++;
  } else {
    skipped++;
  }
}

// === Cleanup Phase ===
// Remove any previously generated doc-id folders no longer mapped
const folders = fs.readdirSync('.', { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

// For each folder that has doc-id subfolders
for (const folder of folders) {
  const folderPath = path.join('.', folder);
  const subdirs = fs.readdirSync(folderPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const subdir of subdirs) {
    const indexPath = path.join(folder, subdir, 'index.html');
    if (
      fs.existsSync(indexPath) &&
      !expectedPaths.has(indexPath)
    ) {
      // Folder exists but is no longer routed to — delete it
      fs.rmSync(path.join(folder, subdir), { recursive: true, force: true });
      removed++;
    }
  }
}

console.log(`Redirects created: ${created}, skipped (already correct): ${skipped}, removed (stale): ${removed}`);
