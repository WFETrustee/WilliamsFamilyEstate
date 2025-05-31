// .github/scripts/generate-manifests.js
// ===============================================
// This script scans each folder for documents with embedded
// metadata inside <meta> tags, extracts key values based on
// the folder's template, and outputs a JSON manifest file.
// This enables dynamic loading without parsing HTML live.
// ===============================================

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { getAllContentFolders, extractMetadataFromDocument, parseTemplateMetadata } = require('./utils/template-metadata');
const { loadSiteConfig } = require('./utils/load-config');

const config = loadSiteConfig();
const folders = getAllContentFolders('.');

folders.forEach(folder => {
  const templatePath = path.join(folder, `${folder}_template.html`);
  const manifestPath = path.join(folder, `${folder}.json`);

  if (!fs.existsSync(templatePath)) return;

  const templateHTML = fs.readFileSync(templatePath, 'utf-8');
  const { keys } = parseTemplateMetadata(templateHTML);

  const files = fs.readdirSync(folder).filter(f => f.endsWith('.html') && !f.includes('_template'));
  const manifest = [];

  files.forEach(file => {
    const fullPath = path.join(folder, file);
    const html = fs.readFileSync(fullPath, 'utf-8');
    const $ = cheerio.load(html);

    const entry = {};
    keys.forEach(key => {
      const tag = $(`meta[name="${key}"]`);
      if (tag.length) entry[key] = tag.attr('content') || '';
    });

    entry.filename = file;
    manifest.push(entry);
  });

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`✅ ${manifestPath} generated with ${manifest.length} entries`);
});
