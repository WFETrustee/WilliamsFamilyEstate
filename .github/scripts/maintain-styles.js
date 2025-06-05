// ============================================================
// File: maintain-styles.js
// Purpose: Central CSS maintenance: class stubs, style distribution, <link> injection, deduplication
// ============================================================

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const postcss = require('postcss');
const postcssSafeParser = require('postcss-safe-parser');
const { loadSiteConfig } = require('./utils/load-config');
const { getAllContentFolders, parseTemplateMetadata } = require('./utils/template-metadata');
const { writeFile } = require('./utils/write-file');

const config = loadSiteConfig();
const mode = process.argv[2] || 'all';
const folders = getAllContentFolders('.');
let modesToRun = (mode === 'all') ? ['stubs', 'distribute', 'clean', 'inject'] : [mode];

// Disable distribution logic unless it's permitted in the config
if (!config.css?.autoOrganize) {
  modesToRun = modesToRun.filter(m => m !== 'distribute');
}

// ------------------------------------------------------------
// 1. Generate class stubs based on <meta data-style="">
// ------------------------------------------------------------
function generateCssStubs() {
  folders.forEach(folder => {
    const templatePath = path.join(folder, `${folder}_template.html`);
    const stylePath = path.join(folder, 'style.css');
    if (!fs.existsSync(templatePath)) return;

    const html = fs.readFileSync(templatePath, 'utf-8');
    const $ = cheerio.load(html);
    const classNames = new Set();

    $('meta[data-style]').each((_, el) => {
      const key = $(el).attr('data-style') || $(el).attr('name');
      if (key) classNames.add(key);
    });

    if (classNames.size === 0) return;

    const stubCss = Array.from(classNames)
      .sort()
      .map(c => `.${c} {\n  /* style for ${c} */\n}`)
      .join('\n\n');

    if (!fs.existsSync(stylePath)) {
      writeFile(stylePath, stubCss.trim() + '\n');
      console.log(`${folder}/style.css created with ${classNames.size} stubs.`);
    }
  });
}

// ------------------------------------------------------------
// 2. Distribute root styles into folder-level style.css files
//    using PostCSS for AST-level accuracy.
//    Safe: only missing selectors are injected.
// ------------------------------------------------------------
async function distributeSharedStyles() {
  const rootCssPath = path.join('.', 'style.css');
  if (!fs.existsSync(rootCssPath)) return;

  const rootCSS = fs.readFileSync(rootCssPath, 'utf-8');
  const rootAST = await postcss([]).process(rootCSS, { from: rootCssPath, parser: postcssSafeParser });

  // Build a map of all selectors in the root sheet
  const rootMap = new Map();
  for (const node of rootAST.root.nodes) {
    if (node.type === 'rule' && node.selector?.trim()) {
      rootMap.set(node.selector.trim(), node.toString().trim());
    }
  }

  for (const folder of folders) {
    const targetPath = path.join(folder, 'style.css');
    if (!fs.existsSync(targetPath)) continue;

    const folderCSS = fs.readFileSync(targetPath, 'utf-8');
    const folderAST = await postcss([]).process(folderCSS, { from: targetPath, parser: postcssSafeParser });

    const existingSelectors = new Set();
    for (const node of folderAST.root.nodes) {
      if (node.type === 'rule' && node.selector?.trim()) {
        existingSelectors.add(node.selector.trim());
      }
    }

    const additions = [];
    for (const [selector, cssText] of rootMap.entries()) {
      if (!existingSelectors.has(selector)) {
        // This style is truly missing and safe to append
        additions.push(cssText);
      }
    }

    if (additions.length > 0) {
      const finalCSS = `${folderCSS.trim()}\n\n/* Injected shared styles from root style.css */\n${additions.join('\n\n')}`;
      writeFile(targetPath, finalCSS);
      console.log(`✔ Injected ${additions.length} missing styles into ${targetPath}`);
    } else {
      console.log(`✓ ${targetPath} already contains all root selectors. No changes.`);
    }
  }
}

// ------------------------------------------------------------
// 3. Remove duplicate <link href="style.css"> tags
// ------------------------------------------------------------
function cleanStyleLinks() {
  folders.forEach(folder => {
    const folderPath = path.join('.', folder);
    if (!fs.existsSync(folderPath)) return;

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.html'));
    files.forEach(file => {
      const fullPath = path.join(folderPath, file);
      const originalHtml = fs.readFileSync(fullPath, 'utf-8');
      const $ = cheerio.load(originalHtml);

      const seenHrefs = new Set();
      let removedCount = 0;

      $('link[href$="style.css"]').each((i, el) => {
        const href = $(el).attr('href');
        if (seenHrefs.has(href)) {
          $(el).remove();
          removedCount++;
        } else {
          seenHrefs.add(href);
        }
      });

      const updatedHtml = $.html();
      if (removedCount > 0 && updatedHtml !== originalHtml) {
        writeFile(fullPath, updatedHtml);
        console.log(`${folder}/${file}: Removed ${removedCount} duplicate style link(s).`);
      }
    });
  });
}

// ------------------------------------------------------------
// 4. Inject missing <link rel="stylesheet"> tags into <head>
// ------------------------------------------------------------
function injectStyleLinks() {
  folders.forEach(folder => {
    const folderPath = path.join('.', folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.html'));

    files.forEach(file => {
      const fullPath = path.join(folderPath, file);
      const originalHtml = fs.readFileSync(fullPath, 'utf-8');
      const $ = cheerio.load(originalHtml);
      const head = $('head');
      if (!head.length) return;

      const hasRootLink = $('link[href="/style.css"]').length > 0;
      const hasFolderLink = $(`link[href="/${folder}/style.css"]`).length > 0;
      let changed = false;

      if (!hasRootLink) {
        head.append('<link rel="stylesheet" href="/style.css">');
        console.log(`${folder}/${file}: Injecting root style link`);
        changed = true;
      }

      if (!hasFolderLink) {
        head.append(`<link rel="stylesheet" href="/${folder}/style.css">`);
        console.log(`${folder}/${file}: Injecting folder style link`);
        changed = true;
      }

      if (changed) {
        const updatedHtml = $.html();
        const normalize = str => str.replace(/\s+/g, ' ').trim();
        if (normalize(updatedHtml) !== normalize(originalHtml)) {
          writeFile(fullPath, updatedHtml);
          console.log(`${folder}/${file}: Injected missing style link(s).`);
        }
      }
    });
  });
}

// ------------------------------------------------------------
// Execute all requested operations in order
// ------------------------------------------------------------
(async () => {
  if (modesToRun.includes('stubs')) generateCssStubs();
  if (modesToRun.includes('distribute')) await distributeSharedStyles(); // note: now async
  if (modesToRun.includes('clean')) cleanStyleLinks();
  if (modesToRun.includes('inject')) injectStyleLinks();
})();
