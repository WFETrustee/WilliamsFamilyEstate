// ==========================================================
// File: generate-manifests.js (Refactored)
// Purpose: Generates per-folder ($folder).json manifest files
//          and a global page-routes.json using shared metadata logic.
//          This file depends on:
//          - extractHtmlMetadata(): parses <meta> tags from HTML files
//          - parseTemplateMetadata(): determines expected meta keys from templates
// ==========================================================

const fs = require('fs');
const path = require('path');
const { getAllContentFolders, parseTemplateMetadata, extractHtmlMetadata } = require('./utils/template-metadata');
const { writeFile } = require('./utils/write-file');

// Get all valid content folders based on presence of a template
const folders = getAllContentFolders('.');
const pageRoutes = {}; // Holds doc-id to relative path mapping for page/QR routing

folders.forEach(folder => {
  const folderPath = path.join('.', folder);
  const templatePath = path.join(folderPath, `${folder}_template.html`);
  const outputPath = path.join(folderPath, `${folder}.json`);

  // Skip folders without template
  if (!fs.existsSync(templatePath)) {
    console.warn(`Template not found: ${templatePath}`);
    return;
  }

  // Determine which metadata fields to extract based on the template
  const templateHTML = fs.readFileSync(templatePath, 'utf-8');
  const { groupedMeta } = parseTemplateMetadata(templateHTML);
  const keys = Object.values(groupedMeta || {}).flat().map(m => m.key);

  const entries = [];
  const files = fs.readdirSync(folderPath);

  files.forEach(file => {
    // Ignore non-HTML, index, or template files
    if (!file.endsWith('.html') || file === 'index.html' || file === `${folder}_template.html`) return;

    const fullPath = path.join(folderPath, file);
    const meta = extractHtmlMetadata(fullPath, keys);

    // Only include active or draft documents in the manifest
    if (!meta || !['active', 'draft'].includes(meta['doc-status'])) return;

    const entry = {
      filename: file,
      lastModified: fs.statSync(fullPath).mtime.toISOString()
    };

    // Pull only requested metadata keys into the manifest
    keys.forEach(key => {
      if (meta[key] !== undefined) entry[key] = meta[key];
    });

    entries.push(entry);

    // If a doc-id is present, add to global routing table
    if (meta['doc-id']) {
      pageRoutes[meta['doc-id']] = `${folder}/${file}`;
    }
  });

  // Write folder-specific manifest
  writeFile(outputPath, JSON.stringify(entries, null, 2));
  console.log(`${folder}/${folder}.json written with ${entries.length} active entries`);
});

// Write global page routing table (supports QR and path-based navigation)
writeFile('page-routes.json', JSON.stringify(pageRoutes, null, 2));
console.log(`page-routes.json updated: ${Object.keys(pageRoutes).length} IDs mapped`);
