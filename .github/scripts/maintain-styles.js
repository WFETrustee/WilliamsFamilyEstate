// ============================================================
// File: maintain-styles.js
// Purpose: Manages all CSS-related tasks in one place.
//          Use this script to auto-generate class stubs based on template metadata,
//          distribute shared root-level styles to content folders,
//          inject missing style references into HTML headers (only if absent),
//          and clean up redundant <link> tags for style.css.
//
// Usage:
//   node maintain-styles.js all         // runs everything
//   node maintain-styles.js stubs       // generate only stubs
//   node maintain-styles.js distribute  // copy shared scoped styles
//   node maintain-styles.js inject      // insert link tags into HTML
//   node maintain-styles.js clean       // remove duplicate <link> tags
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

    const stubCss = Array.from(classNames).sort().map(c => `.${c} {
  /* style for ${c} */
}
`).join('\n');

    if (!fs.existsSync(stylePath)) {
      writeFile(stylePath, stubCss);
      console.log(`${folder}/style.css created with ${classNames.size} stubs.`);
    }
  });
}

function distributeSharedStyles() {
  const rootCssPath = path.join('.', 'style.css');
  if (!fs.existsSync(rootCssPath)) return;

  const rootCSS = fs.readFileSync(rootCssPath, 'utf-8');
  const selectorBlocks = rootCSS.split(/(?=^\s*\.)/m).map(b => b.trim()).filter(Boolean);

  const globalPrefixes = [
    'body', 'html', 'main', 'header', 'footer',
    'h1', 'h2', 'h3', 'p', 'nav', '@media', '.main-nav'
  ];

  const isScoped = block => !globalPrefixes.some(p => block.startsWith(p));
  const scopedBlocks = selectorBlocks.filter(isScoped).sort();

  folders.forEach(folder => {
    const folderCssPath = path.join(folder, 'style.css');
    if (!fs.existsSync(folderCssPath)) return;

    let localCss = fs.readFileSync(folderCssPath, 'utf-8');
    const missing = scopedBlocks.filter(block => !localCss.includes(block));

    if (missing.length > 0) {
      const final = localCss.trim() + '\n\n' + missing.join('\n\n');
      writeFile(folderCssPath, final);
      console.log(`${folder}/style.css updated with ${missing.length} inherited blocks.`);
    }
  });
}

function cleanStyleLinks() {
  folders.forEach(folder => {
    const folderPath = path.join('.', folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.html'));

    files.forEach(file => {
      const fullPath = path.join(folderPath, file);
      const original = fs.readFileSync(fullPath, 'utf-8');
      const $ = cheerio.load(original);

      const links = $('link[href$="style.css"]');
      if (links.length > 1) {
        links.slice(1).remove();
        const updated = $.html();
        if (updated !== original) {
          writeFile(fullPath, updated);
          console.log(`${folder}/${file}: Removed ${links.length - 1} duplicate style link(s).`);
        }
      }
    });
  });
}

function injectStyleLinks() {
  folders.forEach(folder => {
    const folderPath = path.join('.', folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.html'));

    files.forEach(file => {
      const fullPath = path.join(folderPath, file);
      const original = fs.readFileSync(fullPath, 'utf-8');
      const $ = cheerio.load(original);

      const head = $('head');
      if (!head.length) return;

      const rootHref = '/style.css';
      const folderHref = `/${folder}/style.css`;

      const rootExists = $(`link[href="${rootHref}"]`).length > 0;
      const folderExists = $(`link[href="${folderHref}"]`).length > 0;

      let changed = false;
      if (!rootExists) {
        head.append(`\n<link rel="stylesheet" href="${rootHref}">`);
        changed = true;
      }

      if (!folderExists) {
        head.append(`\n<link rel="stylesheet" href="${folderHref}">`);
        changed = true;
      }

      if (changed) {
        const updated = $.html();
        if (updated !== original) {
          writeFile(fullPath, updated);
          console.log(`${folder}/${file}: Injected missing style link(s).`);
        }
      }
    });
  });
}

if (modesToRun.includes('stubs')) generateCssStubs();
if (modesToRun.includes('distribute')) distributeSharedStyles();
if (modesToRun.includes('clean')) cleanStyleLinks();
if (modesToRun.includes('inject')) injectStyleLinks();
