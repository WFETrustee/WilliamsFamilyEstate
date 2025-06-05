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

  const rootCSS = fs.readFileSync(rootCssPath, 'utf-8');

  // Grab all blocks that start with a class selector like `.example { ... }`
  const selectorBlocks = rootCSS
    .split(/(?=^\s*\.)/m)
    .map(b => b.trim())
    .filter(Boolean);

  // Skip anything that's clearly global layout — body, html, etc.
  const globalPrefixes = [
    'body', 'html', 'main', 'header', 'footer',
    'h1', 'h2', 'h3', 'p', 'nav', '@media', '.main-nav'
  ];

  const isScoped = block => !globalPrefixes.some(p => block.startsWith(p));
  const scopedBlocks = selectorBlocks.filter(isScoped).sort();

  folders.forEach(folder => {
    const folderCssPath = path.join(folder, 'style.css');
    if (!fs.existsSync(folderCssPath)) return;

    const localCss = fs.readFileSync(folderCssPath, 'utf-8');

    // Extract all defined selectors from local CSS — including comma-separated ones
    const extractSelectors = cssText => {
      return Array.from(cssText.matchAll(/([^{]+)\s*\{/g))
        .flatMap(match => match[1].split(','))
        .map(sel => sel.trim());
    };

    const localSelectors = new Set(extractSelectors(localCss));

    const missingBlocks = scopedBlocks.filter(block => {
      const match = block.match(/^([^{]+)\s*\{/);
      if (!match) return false;

      // Split out any comma-delimited selectors like `.foo, .bar`
      const selectors = match[1].split(',').map(s => s.trim());

      // DESIGN SAFETY:
      // If even one selector is defined locally, skip the whole block.
      // This ensures designers can override root styles without fear.
      return selectors.every(sel => !localSelectors.has(sel));
    });

    if (missingBlocks.length > 0) {
      const final = localCss.trim() + '\n\n' + missingBlocks.join('\n\n') + '\n';
      writeFile(folderCssPath, final);
      console.log(`${folder}/style.css updated with ${missingBlocks.length} inherited block(s).`);
    }

    // Guardrails:
    // We do NOT overwrite or modify any existing selector blocks.
    // This avoids stomping on custom overrides — local files win.
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
