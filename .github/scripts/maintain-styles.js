// File: maintain-styles.js
// Purpose: Unified utility to manage CSS stubs, distribute shared styles,
// and clean style link tags across all valid content folders.

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { getAllContentFolders, extractStyleClassesFromTemplate } = require('./utils/template-metadata');
const { writeFile } = require('./utils/write-file');
const { loadSiteConfig } = require('./utils/load-config');

const ROOT_STYLE = '/style.css';
const config = loadSiteConfig();
const folders = getAllContentFolders('.');

function generateCSSStubs() {
  if (!config.css?.autoOrganize) {
    console.log("CSS stub generation skipped via site-config.json");
    return;
  }

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
      writeFile(cssPath, result);
      console.log(`${folder}/style.css updated with ${additions.length} stubs`);
    } else {
      console.log(`${folder}/style.css already contains all stubs`);
    }
  });
}

function distributeSharedStyles() {
  const rootStylePath = path.join('.', 'style.css');
  if (!fs.existsSync(rootStylePath)) {
    console.log("No root-level style.css found.");
    return;
  }
  const rootCSS = fs.readFileSync(rootStylePath, 'utf-8');

  const globalPrefixes = [
    'body', 'html', 'main', 'header', 'footer',
    'h1', 'h2', 'h3', 'p', 'nav', '@media',
    '.main-nav', '.site-header', '.site-footer', '.tm',
    '.doc-shell', '.page-container'
  ];

  const ruleRegex = /([^{}]+)\{[^}]*\}/g;
  const scopedRules = new Map();
  let match;
  while ((match = ruleRegex.exec(rootCSS)) !== null) {
    const selector = match[1].trim().replace(/\/\*.*?\*\//g, '').trim();
    if (globalPrefixes.some(prefix => selector.startsWith(prefix))) continue;
    scopedRules.set(selector, match[0]);
  }

  folders.forEach(folder => {
    const cssPath = path.join('.', folder, 'style.css');
    let existing = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf-8') : '';

    const foundSelectors = new Set();
    const definedMatches = [...existing.matchAll(/([^{}]+)\s*\{/g)];
    definedMatches.forEach(m => foundSelectors.add(m[1].trim()));

    const additions = [];

    for (const [selector, rule] of scopedRules.entries()) {
      if (!foundSelectors.has(selector)) {
        additions.push(`/* Inherited from root: ${selector} */\n${rule}`);
      }
    }

    if (additions.length > 0) {
      additions.sort();
      const finalOutput = [
        existing.trimEnd(),
        '',
        '/* ================================================= */',
        '/* Inherited scoped styles from root-level style.css */',
        '/* ================================================= */',
        ...additions,
        ''
      ].join('\n');

      writeFile(cssPath, finalOutput);
      console.log(`${folder}/style.css updated with ${additions.length} inherited rules.`);
    } else {
      console.log(`${folder}/style.css already contains all scoped rules.`);
    }
  });
}

function cleanStyleLinks() {
  folders.forEach(folder => {
    const htmlFiles = glob.sync(`${folder}/**/*.html`);
    htmlFiles.forEach(file => {
      let html = fs.readFileSync(file, 'utf-8');

      html = html.replace(/<link\s+rel="stylesheet"\s+href="\.{1,2}\/style\.css"\s*\/?>\s*/gi, '');

      const seen = new Set();
      html = html.replace(/<link\s+rel="stylesheet"\s+href="([^"]+)"[^>]*>\s*/gi, (match, href) => {
        if (href === ROOT_STYLE || href === `/${folder}/style.css`) {
          if (seen.has(href)) return '';
          seen.add(href);
          return match;
        }
        return '';
      });

      writeFile(file, html);
      console.log(`Cleaned: ${file}`);
    });
  });
}

const task = process.argv[2];

switch (task) {
  case 'stubs':
    generateCSSStubs();
    break;
  case 'distribute':
    distributeSharedStyles();
    break;
  case 'clean':
    cleanStyleLinks();
    break;
  case 'all':
  default:
    generateCSSStubs();
    distributeSharedStyles();
    cleanStyleLinks();
    break;
}
