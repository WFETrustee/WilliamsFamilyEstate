// ============================================================
// File: .github/scripts/generate-clean-path-redirects.js
// Purpose: Auto-create /[folder]/[doc-id]/index.html redirect shims
// Based on page-routes.json content
// ============================================================

const fs = require('fs');
const path = require('path');

const ROUTE_FILE = 'page-routes.json';
if (!fs.existsSync(ROUTE_FILE)) {
  console.error(`${ROUTE_FILE} not found.`);
  process.exit(1);
}

const routes = JSON.parse(fs.readFileSync(ROUTE_FILE, 'utf-8'));
let created = 0, skipped = 0;

for (const [docId, relativePath] of Object.entries(routes)) {
  const parts = relativePath.split('/');
  if (parts.length !== 2) {
    console.warn(`Unexpected path format: ${relativePath}`);
    continue;
  }

  const [folder, filename] = parts;
  const targetUrl = `/${folder}/${filename}`;
  const redirectDir = path.join(folder, docId);
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

  // Only write if it doesn't exist or content has changed
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

console.log(`Clean path redirects complete. Created: ${created}, Skipped: ${skipped}`);
