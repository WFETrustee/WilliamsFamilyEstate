// ============================================================
// File: maintain-styles.js
// Purpose: Central CSS maintenance: class stubs, style distribution, <link> injection, deduplication
// ============================================================

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { loadSiteConfig } = require('./utils/load-config');
const { getAllContentFolders, parseTemplateMetadata } = require('./utils/template-metadata');
const { writeFile } = require('./utils/write-file');

const config = loadSiteConfig();
const mode = process.argv[2] || 'all';
const folders = getAllContentFolders('.');

let modesToRun = (mode === 'all') ? ['stubs', 'distribute', 'clean', 'inject'] : [mode];
if (!config.css?.autoOrganize) {
  modesToRun = modesToRun.filter(m => m !== 'distribute');
}

// -------------------------------------
// Generate CSS stubs from <meta data-style="">
// -------------------------------------
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

// -------------------------------------
// Copy shared scoped styles into folder stylesheets
// -------------------------------------
function distributeSharedStyles() {
  const rootCssPath = path.join('.', 'style.css');
  if (!fs.existsSync(rootCssPath)) return;

  const rootCss = fs.readFileSync(rootCssPath, 'utf-8');

  // STEP 1 — Extract root-level styles as a map of selector => fullBlock
  const rootBlocks = Array.from(rootCss.matchAll(/([^{]+)\s*\{[^}]*\}/g))
    .map(match => {
      const selector = match[1].trim().replace(/\s+/g, ' ');
      const fullBlock = match[0].trim();
      return [selector, fullBlock];
    });

  const rootSelectorMap = new Map(rootBlocks); // selector => block

  // STEP 2 — Iterate over each content folder
  folders.forEach(folder => {
    const folderCssPath = path.join(folder, 'style.css');
    if (!fs.existsSync(folderCssPath)) return;

    const folderCss = fs.readFileSync(folderCssPath, 'utf-8');

    // STEP 3 — Extract normalized selectors from B (folder CSS)
    const existingSelectors = new Set(
      Array.from(folderCss.matchAll(/([^{]+)\s*\{/g))
        .map(match => match[1].trim().replace(/\s+/g, ' '))
    );

    // STEP 4 — Identify styles in A that are NOT in B
    const missingBlocks = [];
    for (const [selector, block] of rootSelectorMap.entries()) {
      if (!existingSelectors.has(selector)) {
        missingBlocks.push(block);
      }
    }

    // STEP 5 — Append the missing styles to the end of B
    if (missingBlocks.length > 0) {
      const updated = folderCss.trim() + '\n\n' + missingBlocks.join('\n\n') + '\n';
      writeFile(folderCssPath, updated);
      console.log(`${folder}/style.css updated with ${missingBlocks.length} inherited selector(s).`);
    }

    // 🔐 Final safeguard:
    // We NEVER overwrite or reformat existing styles in folder-level CSS.
    // Designers can fully override root selectors, and we will NOT interfere.
    // Only truly missing selectors are gently appended once.
  });
}

// -------------------------------------
// Remove duplicate <link href="style.css"> entries
// -------------------------------------
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

      // Clean-up rationale:
      // Without this, the "inject" step can accumulate duplicate tags over time.
      // This reduces bloat, avoids validator noise, and keeps diffs clean.
    });
  });
}

// -------------------------------------
// Inject missing root/folder <link> tags into <head>
// -------------------------------------
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
        } else {
          console.log(`${folder}/${file}: Skipped write – only cosmetic changes detected.`);
        }
      }
    });
  });
}

// -------------------------------------
// Execute the selected operations
// -------------------------------------
if (modesToRun.includes('stubs')) generateCssStubs();
if (modesToRun.includes('distribute')) distributeSharedStyles();
if (modesToRun.includes('clean')) cleanStyleLinks();
if (modesToRun.includes('inject')) injectStyleLinks();
