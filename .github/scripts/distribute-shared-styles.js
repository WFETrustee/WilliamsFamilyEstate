// .github/scripts/distribute-shared-styles.js
// ==========================================================
// This script scans the root-level style.css for all scoped (non-global)
// selectors and distributes those into each content folder's style.css
// (e.g., /notice/style.css, /emergency/style.css).
// It avoids inserting global styles and appends missing inherited blocks
// without duplicating the metadata header or bloat.
// ==========================================================

const fs = require('fs');
const path = require('path');
const { getAllContentFolders } = require('./utils/template-metadata');
const { writeFile } = require('./utils/write-file'); // shared writer

const rootStylePath = path.join('.', 'style.css');
const rootCSS = fs.readFileSync(rootStylePath, 'utf-8');

// Define global selectors that should not be copied to child folders
const globalPrefixes = [
  'body', 'html', 'main', 'header', 'footer',
  'h1', 'h2', 'h3', 'p', 'nav',
  '@media',
  '.main-nav', '.site-header', '.site-footer', '.tm',
  '.doc-shell', '.page-container'
];

// Extract non-global selectors and their blocks
const ruleRegex = /([^{]+)\{[^}]*\}/g;
const scopedRules = new Map();
let match;

while ((match = ruleRegex.exec(rootCSS)) !== null) {
  const selector = match[1].trim();
  const cleaned = selector.replace(/\/\*.*?\*\//g, '').trim();
  if (globalPrefixes.some(prefix => cleaned.startsWith(prefix))) continue;
  scopedRules.set(cleaned, match[0]); // full rule
}

const folders = getAllContentFolders('.');

folders.forEach(folder => {
  const cssPath = path.join('.', folder, 'style.css');
  let existing = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf-8') : '';

  const foundSelectors = new Set();
  const definedMatches = [...existing.matchAll(/([^{]+)\s*\{/g)];
  definedMatches.forEach(m => foundSelectors.add(m[1].trim()));

  const additions = [];

  for (const [selector, rule] of scopedRules.entries()) {
    if (!foundSelectors.has(selector)) {
      additions.push({
        selector,
        block: `/* Inherited from root: ${selector} */\n${rule}\n`
      });
    }
  }

  if (additions.length > 0) {
    additions.sort((a, b) => a.selector.localeCompare(b.selector));

    const header = [
      '',
      '/* ================================================= */',
      '/* Inherited scoped styles from root-level style.css */',
      '/* ================================================= */',
    ];

    const finalOutput = [
      existing.trimEnd(),
      ...header,
      ...additions.map(a => a.block.trim()),
      ''
    ].join('\n');

    writeFile(cssPath, finalOutput);
    console.log(`✅ ${folder}/style.css updated with ${additions.length} inherited rules.`);
  } else {
    console.log(`⏭  ${folder}/style.css already contains all scoped rules.`);
  }
});
