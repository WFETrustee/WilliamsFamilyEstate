// ============================================================
// File: maintain-styles.js
// Purpose: Combines style tasks (stubs, distribution, cleanup) into a single
//          utility script. Controlled by 'mode' CLI argument and site-config.json.
//          Usage: node maintain-styles.js [all|stubs|distribute|clean]
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
let modesToRun = (mode === 'all') ? ['stubs', 'distribute', 'clean'] : [mode];

if (!config.css?.autoOrganize) {
  modesToRun = modesToRun.filter(m => m !== 'distribute');
}

// Generate CSS stub entries for each template
function generateCssStubs() {
  folders.forEach(folder => {
    const templatePath = path.join(folder, `${folder}_template.html`);
    const stylePath = path.join(folder, 'style.css');

    if (!fs.existsSync(templatePath)) return;

    const html = fs.readFileSync(templatePath, 'utf-8');
    const $ = cheerio.load(html);
    const classNames = new Set();

    // Pull all class names from meta[name] that have data-style
    $('meta[data-style]').each((_, el) => {
      const key = $(el).attr('data-style') || $(el).attr('name');
      if (key) classNames.add(key);
    });

    if (classNames.size === 0) return;

    const stubCss = Array.from(classNames).sort().map(c => `.${c} {\n  /* style for ${c} */\n}\n`).join('\n');

    if (!fs.existsSync(stylePath)) {
      writeFile(stylePath, stubCss);
      console.log(`${folder}/style.css created with ${classNames.size} stubs.`);
    }
  });
}

// Copy shared root styles to folder-level CSS files if they don't already include them
function distributeSharedStyles() {
  const rootCssPath = path.join('.', 'style.css');
  if (!fs.existsSync(rootCssPath)) return;

  const rootCSS = fs.readFileSync(rootCssPath, 'utf-8');
  const selectorBlocks = rootCSS.split(/(?=^\s*\.)/m).map(b => b.trim()).filter(Boolean);

  const globalPrefixes = [
    'body', 'html', 'main', 'header', 'footer',
    'h1', 'h2', 'h3', 'p', 'nav',
    '@media', '.main-nav'
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

// Remove duplicate <link> to style.css in each HTML file
function cleanStyleLinks() {
  folders.forEach(folder => {
    const folderPath = path.join('.', folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.html'));

    files.forEach(file => {
      const fullPath = path.join(folderPath, file);
      const html = fs.readFileSync(fullPath, 'utf-8');
      const $ = cheerio.load(html);

      const links = $('link[href$="style.css"]');
      if (links.length > 1) {
        links.slice(1).remove();
        writeFile(fullPath, $.html());
        console.log(`${folder}/${file}: Removed ${links.length - 1} duplicate style link(s).`);
      }
    });
  });
}

if (modesToRun.includes('stubs')) generateCssStubs();
if (modesToRun.includes('distribute')) distributeSharedStyles();
if (modesToRun.includes('clean')) cleanStyleLinks();
