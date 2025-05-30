// generate-css-stubs.js

const fs = require('fs');
const path = require('path');
const { getAllContentFolders, getTemplateMetaKeys } = require('./utils/template-metadata');

const folders = getAllContentFolders('.');

folders.forEach(folder => {
  const folderPath = path.join('.', folder);
  const cssPath = path.join(folderPath, 'style.css');
  const docKeys = getTemplateMetaKeys(folderPath, folder); // e.g., ["doc-venue", "doc-summary"]

  // Convert keys to class names
  const classNames = new Set(docKeys.map(key => '.' + key.replace(/^doc-/, '')));

  // Create empty CSS file if needed
  if (!fs.existsSync(cssPath)) fs.writeFileSync(cssPath, '', 'utf-8');

  // Load existing classes
  const css = fs.readFileSync(cssPath, 'utf-8');
  const existing = new Set();
  const regex = /\.(\w[\w\-]*)\s*\{/g;
  let match;
  while ((match = regex.exec(css))) {
    existing.add('.' + match[1]);
  }

  // Generate missing stubs
  const missing = [...classNames].filter(cls => !existing.has(cls));
  if (missing.length > 0) {
    const additions = `\n/* Auto-generated metadata stubs */\n` +
      missing.map(cls => `${cls} { }\n`).join('');
    fs.appendFileSync(cssPath, additions, 'utf-8');
    console.log(`✅ ${folder}/style.css updated with ${missing.length} stubs.`);
  } else {
    console.log(`✔️ ${folder}/style.css already complete.`);
  }
});
