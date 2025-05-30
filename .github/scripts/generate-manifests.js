// .github/scripts/generate-manifests.js

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { getAllContentFolders, getTemplateMetaKeys } = require('./utils/template-metadata');

const folders = getAllContentFolders('.');

folders.forEach(folder => {
  const folderPath = path.join('.', folder);
  const templateFields = getTemplateMetaKeys(folderPath, folder); // ['doc-title', 'doc-date', etc.]

  const htmlFiles = fs.readdirSync(folderPath).filter(f =>
    f.endsWith('.html') &&
    f !== `${folder}_template.html` &&
    f !== 'index.html'
  );

  const output = [];

  htmlFiles.forEach(file => {
    const fullPath = path.join(folderPath, file);
    const html = fs.readFileSync(fullPath, 'utf-8');
    const $ = cheerio.load(html);

    const status = $('meta[name="doc-status"]').attr('content')?.toLowerCase();
    if (status && status !== 'active') return;

    const entry = { filename: file };
    templateFields.forEach(name => {
      const value = $(`meta[name="${name}"]`).attr('content') || '';
      entry[name] = value;
    });

    entry.lastModified = fs.statSync(fullPath).mtime.toISOString();
    output.push(entry);
  });
