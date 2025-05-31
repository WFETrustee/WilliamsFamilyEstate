// ==========================================================
// File: generate-manifests.js
// Purpose: Generates per-folder ($folder).json manifest files
// for each content folder that includes a ($folder)_template.html file.
// These files contain only "active" entries with selected metadata
// extracted from individual HTML files.
// ==========================================================

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { getAllContentFolders, parseTemplateMetadata } = require('./utils/template-metadata');

const folders = getAllContentFolders('.');

folders.forEach(folder => {
  const folderPath = path.join('.', folder);
  const templatePath = path.join(folderPath, `${folder}_template.html`);
  const outputPath = path.join(folderPath, `${folder}.json`);

  if (!fs.existsSync(templatePath)) {
    console.warn(`⚠️  Template not found: ${templatePath}`);
    return;
  }

  const templateHTML = fs.readFileSync(templatePath, 'utf-8');
  const { groupedMeta } = parseTemplateMetadata(templateHTML);

  // Flatten meta keys from all groups into one array
  const keys = Object.values(groupedMeta || {}).flat().map(m => m.key);

  const entries = [];
  const files = fs.readdirSync(folderPath);

  files.forEach(file => {
    if (!file.endsWith('.html') || file === 'index.html' || file === `${folder}_template.html`) return;

    const fullPath = path.join(folderPath, file);
    const html = fs.readFileSync(fullPath, 'utf-8');
    const $ = cheerio.load(html);

    const status = $('meta[name="doc-status"]').attr('content')?.toLowerCase();
    if (status !== 'active') return;

    const entry = { filename: file };
    keys.forEach(key => {
      const val = $(`meta[name="${key}"]`).attr('content');
      if (val !== undefined) entry[key] = val;
    });

    // Get last modified timestamp
    entry.lastModified = fs.statSync(fullPath).mtime.toISOString();

    entries.push(entry);
  });

  fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2), 'utf-8');
  console.log(`✅ ${folder}/${folder}.json written with ${entries.length} active entries`);
});

// Write global QR routes if content-certified
const qrRoutes = {};
folders.forEach(folder => {
  const folderPath = path.join('.', folder);
  const files = fs.readdirSync(folderPath);

  files.forEach(file => {
    if (!file.endsWith('.html')) return;

    const fullPath = path.join(folderPath, file);
    const html = fs.readFileSync(fullPath, 'utf-8');
    const $ = cheerio.load(html);

    const certified = $('meta[name="content-certified"]').attr('content')?.toLowerCase() === 'true';
    if (!certified) return;

    const id = $('meta[name="doc-id"]').attr('content');
    if (!id) return;

    const relative = `${folder}/${file}`;
    qrRoutes[id] = relative;
  });
});

fs.writeFileSync('qr-routes.json', JSON.stringify(qrRoutes, null, 2), 'utf-8');
console.log(`📍 QR routes updated: ${Object.keys(qrRoutes).length} routes mapped`);
