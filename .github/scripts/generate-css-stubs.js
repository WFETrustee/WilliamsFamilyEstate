// generate-css-stubs.js
// ======================
// This script scans all folders containing a `($folder)_template.html`
// Extracts all <meta name="doc-..."> definitions
// Ensures that the corresponding CSS stubs (e.g., `.meta.date { }`) exist
// If `style.css` is missing, it will create it
// If a class is already defined, it is skipped
// This script is designed for backend execution inside GitHub Actions
// and must be paired with `template-metadata.js`

const fs = require('fs');
const path = require('path');
const { getAllContentFolders, getTemplateMetaKeys } = require('./utils/template-metadata');

// Get all folders that contain a `($folder)_template.html`
const folders = getAllContentFolders('.');

folders.forEach(folder => {
  const folderPath = path.join('.', folder);
  const cssPath = path.join(folderPath, 'style.css');

  // Pull all doc-* metadata keys from template (e.g., 'doc-date', 'doc-summary')
  const docKeys = getTemplateMetaKeys(folderPath, folder);

  // Convert each key to a selector like `.meta.summary`
  const classNames = new Set(docKeys.map(key => {
    const raw = key.replace(/^doc-/, '').toLowerCase();
    return `.meta.${raw}`;
  }));

  // Ensure the CSS file exists
  if (!fs.existsSync(cssPath)) {
    fs.writeFileSync(cssPath, '', 'utf-8');
  }

  // Read existing CSS classes already defined
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  const existingClasses = new Set();
  const classRegex = /\.meta\.(\w[\w\-]*)\s*\{/g;
  let match;
  while ((match = classRegex.exec(cssContent))) {
    existingClasses.add(`.meta.${match[1]}`);
  }

  // Determine which classes are missing
  const missing = [...classNames].filter(cls => !existingClasses.has(cls));
  if (missing.length === 0) {
    console.log(`✔️ ${folder}/style.css already contains all metadata stubs.`);
    return;
  }

  // Format missing entries for appending
  const additions = [
    '',
    '/* =============================== */',
    '/* Auto-generated metadata stubs  */',
    '/* =============================== */',
    ...missing.map(cls => `${cls} { }`)
  ].join('\n') + '\n';

  // Append to the CSS file
  fs.appendFileSync(cssPath, additions, 'utf-8');
  console.log(`✅ ${folder}/style.css updated with ${missing.length} stubs.`);
});
