// utils/template-metadata.js

const fs = require('fs');
const path = require('path');

function getAllContentFolders(baseDir = '.') {
  return fs.readdirSync(baseDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(folder => fs.existsSync(path.join(baseDir, folder, `${folder}_template.html`)));
}

function getTemplateMetaKeys(folderPath, folderName) {
  const templateFile = path.join(folderPath, `${folderName}_template.html`);
  if (!fs.existsSync(templateFile)) return [];

  const html = fs.readFileSync(templateFile, 'utf-8');
  const metaRegex = /<meta\s+[^>]*name=["']doc-([a-z0-9\-]+)["'][^>]*>/gi;
  const keys = new Set();
  let match;
  while ((match = metaRegex.exec(html))) {
    const raw = match[1].trim();
    keys.add(`doc-${raw}`);
  }
  return Array.from(keys);
}

module.exports = {
  getAllContentFolders,
  getTemplateMetaKeys
};
