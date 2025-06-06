// ============================================================
// File: .github/scripts/generate-clean-path-redirects.js
// Purpose: Auto-create /[folder]/[doc-id]/index.html redirect files
//          based on page-routes.json so that clean URLs like
//          /emergency/EMG-HC01/ will resolve to the correct document.
// ============================================================

const fs = require('fs');
const path = require('path');

const ROUTE_FILE = 'page-routes.json';
if (!fs.existsSync(ROUTE_FILE)) {
  console.error(`page-routes.json is missing. This must be generated before this script runs.`);
  process.exit(1);
}

const routes = JSON.parse(fs.readFileSync(ROUTE_FILE, 'utf-8'));
let created = 0;
let skipped = 0;
let missingFolder = 0;

for (const [docId, relativePath] of Object.entries(routes)) {
  const parts = relativePath.split('/');
  if (parts.length !== 2) {
    console.warn(`Skipping invalid path format: ${relativePath}`);
    continue;
  }

  const [folder, filename] = parts;
  const targetUrl = `/${folder}/${filename}`;

  // If the target content folder (e.g., /emergency) doesn't exist, skip it.
  // We don't create these folders — they should be part of the normal site structure.
  const baseFolderPath = path.join('.', folder);
  if (!fs.existsSync(baseFolderPath)) {
    console.warn(`Folder not found: ${baseFolderPath}. Skipping this entry.`);
    missingFolder++;
    continue;
  }

  // This is where the redirect index.html will be written
  const redirectDir = path.join(baseFolderPath, docId);
  const redirectPath = path.join(redirectDir, 'index.html');

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

  // Avoid unnecessary writes if the file already exists and matches
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

console.log(`Redirect generation complete. Created: ${created}, Skipped: ${skipped}, Missing folder: ${missingFolder}`);
