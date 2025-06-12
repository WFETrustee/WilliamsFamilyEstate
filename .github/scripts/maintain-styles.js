// ============================================================
// File: maintain-styles.js
// Purpose: Central CSS maintenance: class stubs, style distribution, <link> injection, deduplication
// Supports: alwaysDistribute and excludeFromRootDistribute via site-config.json
// ============================================================

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const postcss = require('postcss');
const postcssSafeParser = require('postcss-safe-parser');
const { loadSiteConfig } = require('./utils/load-config');
const { getAllContentFolders } = require('./utils/template-metadata');
const { writeFile } = require('./utils/write-file');

const config = loadSiteConfig();
const mode = process.argv[2] || 'all';
const folders = getAllContentFolders('.');

let modesToRun = (mode === 'all') ? ['stubs', 'distribute', 'clean', 'inject'] : [mode];
if (!config.css?.autoOrganize) modesToRun = modesToRun.filter(m => m !== 'distribute');

// ------------------------------------------------------------
// Helper: Convert string patterns into regex
// ------------------------------------------------------------
function getRegexList(array = []) {
  return array.map(pattern => {
    // Escape if needed and convert wildcards (*) to regex
    if (pattern.includes('*')) {
      return new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    } else {
      return new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');
    }
  });
}

// Preprocess config regex rules
const excludeRegexes = getRegexList(config.css?.excludeFromRootDistribute || []);
const alwaysDistributeRegexes = getRegexList(config.css?.alwaysDistribute || []);

// Check if a selector matches any regex in a given list
function matchesAny(selector, regexList) {
  return regexList.some(rx => rx.test(selector));
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

    $('meta').each((_, el) => {
      const name = $(el).attr('name');
      const style = $(el).attr('data-style');

      if (style) {
        classNames.add(`meta.${style}`);
      } else if (name?.startsWith('doc-')) {
        const className = name.replace(/^doc-/, '').toLowerCase();
        classNames.add(`meta.${className}`);
      }
    }); // ← This was missing

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
//    Supports exclusions, always-includes, and displayPriority
// ------------------------------------------------------------
async function distributeSharedStyles() {
  const rootCssPath = path.join('.', 'style.css');
  if (!fs.existsSync(rootCssPath)) return;

  const rootCSS = fs.readFileSync(rootCssPath, 'utf-8');
  const rootAST = await postcss([]).process(rootCSS, { from: rootCssPath, parser: postcssSafeParser });

  // Build maps and lists from config
  const excludePatterns = (config.css?.excludeFromRootDistribute || []).map(p => new RegExp(p));
  const alwaysIncludePatterns = (config.css?.alwaysDistribute || []).map(p => new RegExp(p));
  const priorityMap = config.css?.displayPriority || {};

  // Extract all root rules
  const rootRules = [];
  for (const node of rootAST.root.nodes) {
    if (node.type === 'rule' && node.selector?.trim()) {
      const selector = node.selector.trim();

      const isExcluded = excludePatterns.some(re => re.test(selector));
      const isAlwaysIncluded = alwaysIncludePatterns.some(re => re.test(selector));

      // Skip if excluded and not always included
      if (isExcluded && !isAlwaysIncluded) continue;

      rootRules.push({
        selector,
        cssText: node.toString().trim(),
        priority: getPriority(selector, priorityMap)
      });
    }
  }

  // Sort by display priority (if specified)
  rootRules.sort((a, b) => a.priority - b.priority);

  // Inject missing styles into each content folder
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
    for (const rule of rootRules) {
      if (!existingSelectors.has(rule.selector)) {
        additions.push(rule.cssText);
      }
    }

    if (additions.length > 0) {
      const finalCSS = `${folderCSS.trim()}\n\n/* Injected shared styles from root style.css */\n${additions.join('\n\n')}`;
      writeFile(targetPath, finalCSS);
      console.log(`✔ Injected ${additions.length} styles into ${targetPath}`);
    } else {
      console.log(`✓ ${targetPath} already contains all required selectors. No changes.`);
    }
  }

  // Local helper to resolve numeric priority
  function getPriority(selector, map) {
    for (const pattern in map) {
      if (new RegExp(pattern).test(selector)) return map[pattern];
    }
    return 9999; // Lowest priority if not listed
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
      const $ = cheerio.load(originalHtml, { decodeEntities: false });
      const head = $('head');
      if (!head.length) return;

      const hasRootLink = $('link[href="/style.css"]').length > 0;
      const hasFolderLink = $(`link[href="/${folder}/style.css"]`).length > 0;
      let changed = false;

      if (!hasRootLink) {
        head.append($('<link>').attr({
          rel: 'stylesheet',
          href: '/style.css'
        }));
        console.log(`${folder}/${file}: Injecting root style link`);
        changed = true;
      }

      if (!hasFolderLink) {
        head.append($('<link>').attr({
          rel: 'stylesheet',
          href: `/${folder}/style.css`
        }));
        console.log(`${folder}/${file}: Injecting folder style link`);
        changed = true;
      }

      if (changed) {
        const updatedHtml = $.html().replace(/(\r?\n){3,}/g, '\n\n').trim();
        if (updatedHtml !== originalHtml.trim()) {
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
  if (modesToRun.includes('distribute')) await distributeSharedStyles(); // async
  if (modesToRun.includes('clean')) cleanStyleLinks();
  if (modesToRun.includes('inject')) injectStyleLinks();
})();
