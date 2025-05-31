// .github/scripts/distribute-shared-styles.js
// ==========================================================
// This script scans the root-level style.css for all scoped (non-global)
// selectors and distributes those into the appropriate folder-level
// style.css files (e.g., /notices/style.css, /emergency/style.css, etc.)
// if they are not already present. This allows each folder to override
// design logic while maintaining root-level layout control.
// ==========================================================

const fs = require('fs');
const path = require('path');
const { getAllContentFolders } = require('./utils/template-metadata');

const rootStylePath = path.join('.', 'style.css');
const rootCSS = fs.readFileSync(rootStylePath, 'utf-8');

// Define selectors considered "global" and should NOT be copied
const globalPrefixes = [
  'body', 'html', 'main', 'header', 'footer',
  'h1', 'h2', 'h3', 'p', 'nav',
  '@media', '.main-nav', '.site-header', '.site-footer'
];

// Extract selectors and their full rule blocks
const ruleRegex = /([^{]+)\{[^}]*\}/g;
const scopedRules = new Map();

let match;
while ((match = ruleRegex.exec(rootCSS)) !== null) {
  const selector = match[1].trim();
  const rule = match[0];

  // Skip global selectors
  if (globalPrefixes.some(prefix => selector.startsWith(prefix))) continue;

  scopedRules.set(selector, rule);
}

// Process each content folder
const folders = getAllContentFolders('.');

folders.forEach(folder => {
  const cssPath = path.join('.', folder, 'style.css');
  let existing = '';
  const foundSelectors = new Set();

  // Load existing folder CSS if present
  if (fs.existsSync(cssPath)) {
    existing = fs.readFileSync(cssPath, 'utf-8');
    const defined = [...existing.matchAll(/([^{]+)\s*\{/g)].map(m => m[1].trim());
    defined.forEach(sel => foundSelectors.add(sel));
  } else {
    fs.writeFileSync(cssPath, '', 'utf-8');
  }

  const additions = [];
  for (const [selector, rule] of scopedRules.entries()) {
    if (!foundSelectors.has(selector)) {
      additions.push(`/* Inherited from root: ${selector} */\n${rule}\n`);
    }
  }

  if (additions.length > 0) {
    fs.appendFileSync(cssPath,
      [
        '',
        '/* ================================================= */',
        '/* Inherited scoped styles from root-level style.css */',
        '/* ================================================= */',
        ...additions
      ].join('\n') + '\n',
      'utf-8'
    );
    console.log(`✅ ${folder}/style.css updated with ${additions.length} inherited rules.`);
  } else {
    console.log(`✔️ ${folder}/style.css already contains all scoped rules.`);
  }
});
