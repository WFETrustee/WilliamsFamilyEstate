// .github/scripts/generate-css-stubs.js
// ================================================
// Scans all template HTML files for unique data-style
// values and generates CSS comment stubs for manual
// designer completion. Helps unify look and feel.
// ================================================

const fs = require('fs');
const path = require('path');
const { getAllContentFolders, extractStyleClassesFromTemplate } = require('./utils/template-metadata');
const { loadSiteConfig } = require('./utils/load-config');
const { writeFile } = require('./utils/write-file'); //shared safe writer

const config = loadSiteConfig();
if (!config.css?.autoOrganize) {
  console.log("CSS stub generation skipped via site-config.json");
  process.exit(0);
}

const folders = getAllContentFolders('.');

folders.forEach(folder => {
  const templatePath = path.join(folder, `${folder}_template.html`);
  const cssPath = path.join(folder, 'style.css');

  if (!fs.existsSync(templatePath)) return;

  const templateHTML = fs.readFileSync(templatePath, 'utf-8');
  const styles = extractStyleClassesFromTemplate(templateHTML);

  if (!styles.length) return;

  let existing = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf-8') : '';
  const existingSelectors = new Set([...existing.matchAll(/\.(\w[\w-]*)\s*\{/g)].map(m => m[1]));

  const additions = styles
    .filter(s => !existingSelectors.has(s))
    .sort()
    .map(s => `/* Style for .${s} */\n.${s} {\n  /* TODO: define style */\n}\n`);

  if (additions.length) {
    const result = existing + '\n\n/* Auto-generated style stubs */\n' + additions.join('\n');
    writeFile(cssPath, result); //use wrapper
    console.log(`${folder}/style.css updated with ${additions.length} stubs`);
  } else {
    console.log(`${folder}/style.css already contains all stubs`);
  }
});
