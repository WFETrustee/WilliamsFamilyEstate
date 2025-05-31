// .github/scripts/distribute-shared-styles.js
// ============================================================================
// Purpose:
// This script scans the root-level style.css for all scoped (non-global)
// selectors and distributes those into the appropriate folder-level style.css
// files (e.g., /notices/style.css, /emergency/style.css, etc.) if not present.
// This enables shared design logic while allowing overrides per folder.
// Rules are appended in alphabetical order, and insertion is conditional
// on the site-config.json setting: `"autoOrganizeCSS": true`.
// ============================================================================

const fs = require('fs');
const path = require('path');
const { getAllContentFolders } = require('./utils/template-metadata');

// Load configuration (optional site-config.json)
let config = { autoOrganizeCSS: true };
try {
  const raw = fs.readFileSync('site-config.json', 'utf-8');
  config = JSON.parse(raw);
} catch (err) {
  console.warn('No site-config.json found, using defaults.');
}

if (!config.autoOrganizeCSS) {
  console.log("CSS auto-organization disabled via site-config.json");
  process.exit(0);
}

const rootStylePath = path.join('.', 'style.css');
const rootCSS = fs.readFileSync(rootStylePath, 'utf-8');

// Define "global" selectors that should NOT be copied to folder stylesheets
const globalSelectorPrefixes = [
  'body', 'html', 'main', 'header', 'footer',
  'h1', 'h2', 'h3', 'p', 'nav', '@media',
  '.main-nav', '.site-header', '.site-footer', '.tm',
  '.doc-shell', '.page-container'
];

// Extract all scoped CSS rules from root stylesheet
const ruleRegex = /([^{]+)\{[^}]*\}/g;
const scopedRules = new Map();

let match;
while ((match = ruleRegex.exec(rootCSS)) !== null) {
  let selector = match[1].trim();
  selector = selector.replace(/\/\*.*?\*\//g, '').trim();
  const rule = match[0];

  if (globalSelectorPrefixes.some(prefix => selector.startsWith(prefix))) continue;

  scopedRules.set(selector, rule);
}

// Loop through all content folders and distribute missing scoped styles
const folders = getAllContentFolders('.');
folders.forEach(folder => {
  const cssPath = path.join('.', folder, 'style.css');
  let existing = '';
  const foundSelectors = new Set();
  const retainedLines = [];

  if (fs.existsSync(cssPath)) {
    existing = fs.readFileSync(cssPath, 'utf-8');
    const defined = [...existing.matchAll(/([^{]+)\s*\{/g)].map(m => m[1].trim());
    defined.forEach(sel => foundSelectors.add(sel));

    // Retain user-defined CSS (everything before the inherited block)
    const lines = existing.split(/\r?\n/);
    let retain = true;
    for (const line of lines) {
      if (line.includes('/* Inherited scoped styles from root-level style.css */')) retain = false;
      if (retain) retainedLines.push(line);
    }
  } else {
    fs.writeFileSync(cssPath, '', 'utf-8');
  }

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

    const result = [
      ...retainedLines,
      '',
      '/* ================================================= */',
      '/* Inherited scoped styles from root-level style.css */',
      '/* ================================================= */',
      ...additions.map(a => a.block.trim()),
      ''
    ].join('\n');

    fs.writeFileSync(cssPath, result, 'utf-8');
    console.log(`${folder}/style.css updated with ${additions.length} inherited rules.`);
  } else {
    console.log(`${folder}/style.css already contains all scoped rules.`);
  }
});
