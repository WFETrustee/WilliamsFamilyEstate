// ==========================================================
// File: generate-manifests.js
// Purpose: Build each folder's manifest AND a universal router for QR and clean path access.
// Note: All docs with a doc-id (draft or active) go into page-routes.json,
//       but only "active" docs are listed in their folder-level manifests.
// ==========================================================

const fs = require('fs');
const path = require('path');
const { getAllContentFolders, parseTemplateMetadata, extractHtmlMetadata } = require('./utils/template-metadata');
const { writeFile } = require('./utils/write-file');

// Grab all folders that have a template file
const folders = getAllContentFolders('.');
const pageRoutes = {}; // This is the universal router { doc-id: "folder/filename.html" }

folders.forEach(folder => {
  const folderPath = path.join('.', folder);
  const templatePath = path.join(folderPath, `${folder}_template.html`);
  const outputPath = path.join(folderPath, `${folder}.json`);

  // Skip folders without a template
  if (!fs.existsSync(templatePath)) {
    console.warn(`Template not found: ${templatePath}`);
    return;
  }

  // Figure out which <meta> keys we care about by parsing the template
  const templateHTML = fs.readFileSync(templatePath, 'utf-8');
  const { groupedMeta } = parseTemplateMetadata(templateHTML);
  const keys = Object.values(groupedMeta || {}).flat().map(m => m.key);

  const entries = []; // folder manifest entries (only for ACTIVE docs)
  const files = fs.readdirSync(folderPath);

  files.forEach(file => {
    // Skip index.html, templates, and non-HTML files
    if (!file.endsWith('.html') || file === 'index.html' || file === `${folder}_template.html`) return;

    const fullPath = path.join(folderPath, file);
    const meta = extractHtmlMetadata(fullPath, keys);

    // Skip if no doc-id or no recognized status
    if (!meta || !['active', 'draft'].includes(meta['doc-status']) || !meta['doc-id']) return;

    // Add to global route table no matter the status
    pageRoutes[meta['doc-id']] = `${folder}/${file}`;

    // Only add ACTIVE docs to public manifest
    if (meta['doc-status'] !== 'active') return;

    const entry = { filename: file, lastModified: fs.statSync(fullPath).mtime.toISOString() };

    keys.forEach(key => {
      if (meta[key] !== undefined) entry[key] = meta[key];
    });

    entries.push(entry);
  });

  // Write the public manifest for this folder (active docs only)
  writeFile(outputPath, JSON.stringify(entries, null, 2));
  console.log(`${folder}/${folder}.json written with ${entries.length} active entries`);
});

// Write the universal page routing map (includes ALL doc-id entries: active + draft)
writeFile('page-routes.json', JSON.stringify(pageRoutes, null, 2));
console.log(`✔ page-routes.json updated with ${Object.keys(pageRoutes).length} entries`);
