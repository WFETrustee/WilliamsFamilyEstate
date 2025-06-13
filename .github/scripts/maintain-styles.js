// ============================================================
// File: maintain-styles.js
// Purpose: Central CSS maintenance tool for my GitHub Pages site
// Features:
//   - Auto-generates .meta.* class stubs from template <meta> tags
//   - Organizes and alphabetizes CSS by functional group
//   - Injects root shared styles into content folders
//   - Ensures <link> tags are present and deduplicated
//   - Honors `site-config.json` options like autoOrganize, exclude rules, and dry run
// Dependencies:
//   - cheerio: HTML parsing for <meta> and <link>
//   - postcss + postcss-safe-parser: parsing and manipulating CSS rules
//   - fs/promises: for modern async file reads/writes
// Usage:
//   node maintain-styles.js all --dry   // dry-run full pipeline
//   node maintain-styles.js stubs       // only generate missing meta class stubs
//   node maintain-styles.js inject      // inject missing <link rel="stylesheet">
// Author: Gregory-Alan Williams, with help from my AI co-architect The GPT
// ============================================================
import fs from 'fs/promises';
import path from 'path';
import cheerio from 'cheerio';
import postcss from 'postcss';
import postcssSafeParser from 'postcss-safe-parser';
import { loadSiteConfig } from './utils/load-config.js';
import { getAllContentFolders } from './utils/template-metadata.js';
import { writeFile } from './utils/write-file.js';

const config = loadSiteConfig();
const folders = getAllContentFolders('.');
const mode = process.argv[2] || 'all';
const DRY_RUN = process.argv.includes('--dry');

let modesToRun = (mode === 'all') ? ['stubs', 'distribute', 'clean', 'inject'] : [mode];
if (!config.css?.autoOrganize) modesToRun = modesToRun.filter(m => m !== 'distribute');

function getRegexList(array = []) {
  return array.map(pattern => {
    if (pattern.includes('*')) {
      return new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    } else {
      return new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');
    }
  });
}

const excludeRegexes = getRegexList(config.css?.excludeFromRootDistribute || []);
const alwaysDistributeRegexes = getRegexList(config.css?.alwaysDistribute || []);

function matchesAny(selector, regexList) {
  return regexList.some(rx => rx.test(selector));
}

function extractGroups(cssText) {
  const groups = {};
  const lines = cssText.split(/\r?\n/);
  let currentGroup = 'Ungrouped';
  let buffer = [];

  for (const line of lines) {
    const groupMatch = line.match(/\/\*+\s*Group: (.+?)\s*\*+\//);
    if (groupMatch) {
      if (!groups[currentGroup]) groups[currentGroup] = [];
      groups[currentGroup].push(...buffer);
      buffer = [];
      currentGroup = groupMatch[1];
      groups[currentGroup] = [`/* ==================== */`, line];
    } else {
      buffer.push(line);
    }
  }
  if (!groups[currentGroup]) groups[currentGroup] = [];
  groups[currentGroup].push(...buffer);
  return groups;
}

function alphabetizeGroup(lines) {
  const blocks = [];
  let block = [];
  for (const line of lines) {
    if (/^\s*$/.test(line)) {
      if (block.length) blocks.push(block);
      blocks.push([line]);
      block = [];
    } else {
      block.push(line);
    }
  }
  if (block.length) blocks.push(block);
  return blocks.sort((a, b) => (a[0] || '').localeCompare(b[0] || ''));
}

function ensureMetaStyles(metaFields, metadataGroupLines) {
  const presentFields = new Set(
    metadataGroupLines.flatMap(line => {
      const match = line.match(/\.meta\.([a-zA-Z0-9_-]+)/);
      return match ? [match[1]] : [];
    })
  );

  const newStyles = metaFields.filter(field => !presentFields.has(field)).map(
    field => `\n.meta.${field} {\n  /* style for meta.${field} */\n}`
  );
  return [...metadataGroupLines, ...newStyles];
}

function reassembleCss(groups, autoOrganize) {
  const order = [
    'Global Layout',
    'Header',
    'Navigation',
    'Content',
    'Metadata',
    'Footer',
    'Emergency Extras',
    'Responsive Enhancements',
    'Print Enhancements',
    'Utility',
  ];

  let final = [];
  for (const groupName of order) {
  if (groups[groupName]) {
    let lines = groups[groupName];
    const nonEmptyLines = lines.filter(line => line.trim() !== '' && !/^\/\*/.test(line.trim()));
    if (nonEmptyLines.length === 0) {
      final.push(`/* ==================== */`);
      final.push(`/* Group: ${groupName} */`);
      final.push(`/* (no styles in this group yet) */`);
    } else {
      if (autoOrganize) lines = alphabetizeGroup(lines).flat();
      if (final.length > 0) final.push('');
      final.push(...lines);
    }
  }
}

  const leftovers = Object.entries(groups)
    .filter(([key]) => !order.includes(key))
    .flatMap(([, lines]) => lines);

  final.push(...leftovers);
  return final.join('\n').replace(/\n{3,}/g, '\n\n');
}

async function parseTemplate(templatePath) {
  const content = await fs.readFile(templatePath, 'utf-8');
  const $ = cheerio.load(content);
  const metaMatches = new Set();

  $('meta').each((_, el) => {
    const name = $(el).attr('name');
    const dataStyle = $(el).attr('data-style');
    if (dataStyle) metaMatches.add(dataStyle);
    else if (name?.startsWith('doc-')) metaMatches.add(name.replace(/^doc-/, ''));
  });

  return [...metaMatches];
}

async function writeUpdatedCss(cssPath, newCssText, originalCssText) {
  if (newCssText === originalCssText) {
    console.log(`No changes needed for ${cssPath}`);
    return;
  }

  if (DRY_RUN) {
    console.log(`--- DRY RUN: ${cssPath} ---`);
    console.log(newCssText);
  } else {
    await writeFile(cssPath, newCssText);
    console.log(`Updated: ${cssPath}`);
  }
}

async function generateCssStubs() {
  for (const folder of folders) {
    const templatePath = path.join(folder, `${folder}_template.html`);
    const stylePath = path.join(folder, 'style.css');
    if (!await fs.stat(templatePath).catch(() => false)) continue;

    const metaFields = await parseTemplate(templatePath);

    let originalCss = '';
    if (await fs.stat(stylePath).catch(() => false)) {
      originalCss = await fs.readFile(stylePath, 'utf-8');
    }

    const groups = extractGroups(originalCss);
    if (!groups['Metadata']) groups['Metadata'] = ['/* ==================== */', '/* Group: Metadata */'];
    groups['Metadata'] = ensureMetaStyles(metaFields, groups['Metadata']);

    const newCss = config.css?.autoOrganize ? reassembleCss(groups, true) : reassembleCss(groups, false);
    await writeUpdatedCss(stylePath, newCss, originalCss);
  }
}

async function distributeSharedStyles() {
  const rootCssPath = path.join('.', 'style.css');
  if (!await fs.stat(rootCssPath).catch(() => false)) return;

  const rootCSS = await fs.readFile(rootCssPath, 'utf-8');
  const rootAST = await postcss([]).process(rootCSS, { from: rootCssPath, parser: postcssSafeParser });

  const priorityMap = config.css?.displayPriority || {};

  const rootRules = [];
  for (const node of rootAST.root.nodes) {
    if (node.type === 'rule' && node.selector?.trim()) {
      const selector = node.selector.trim();
      const isExcluded = matchesAny(selector, excludeRegexes);
      const isAlwaysIncluded = matchesAny(selector, alwaysDistributeRegexes);
      if (isExcluded && !isAlwaysIncluded) continue;
      rootRules.push({
        selector,
        cssText: node.toString().trim(),
        priority: getPriority(selector, priorityMap)
      });
    }
  }

  rootRules.sort((a, b) => a.priority - b.priority);

  for (const folder of folders) {
    const targetPath = path.join(folder, 'style.css');
    if (!await fs.stat(targetPath).catch(() => false)) continue;
    const folderCSS = await fs.readFile(targetPath, 'utf-8');
    const folderAST = await postcss([]).process(folderCSS, { from: targetPath, parser: postcssSafeParser });

    const existingSelectors = new Set();
    for (const node of folderAST.root.nodes) {
      if (node.type === 'rule' && node.selector?.trim()) {
        existingSelectors.add(node.selector.trim());
      }
    }

    const additions = rootRules.filter(rule => !existingSelectors.has(rule.selector)).map(r => r.cssText);

    if (additions.length > 0) {
      const newCSS = `${folderCSS.trim()}\n\n/* Injected shared styles from root style.css */\n${additions.join('\n\n')}`;
      await writeUpdatedCss(targetPath, newCSS, folderCSS);
    }
  }

  function getPriority(selector, map) {
    for (const pattern in map) {
      if (new RegExp(pattern).test(selector)) return map[pattern];
    }
    return 9999;
  }
}

async function cleanStyleLinks() {
  for (const folder of folders) {
    const folderPath = path.join('.', folder);
    try {
      await fs.access(folderPath);
    } catch {
      continue;
    }

    const files = (await fs.readdir(folderPath)).filter(f => f.endsWith('.html'));

    for (const file of files) {
      const fullPath = path.join(folderPath, file);
      const originalHtml = await fs.readFile(fullPath, 'utf-8');
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
        await writeFile(fullPath, updatedHtml);
        console.log(`${folder}/${file}: Removed ${removedCount} duplicate style link(s).`);
      }
    }
  }
}


async function injectStyleLinks() {
  for (const folder of folders) {
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
        head.append($('<link>').attr({ rel: 'stylesheet', href: '/style.css' }));
        changed = true;
      }
      if (!hasFolderLink) {
        head.append($('<link>').attr({ rel: 'stylesheet', href: `/${folder}/style.css` }));
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

(async () => {
  if (modesToRun.includes('stubs')) await generateCssStubs();
  if (modesToRun.includes('distribute')) await distributeSharedStyles();
  if (modesToRun.includes('clean')) cleanStyleLinks();
  if (modesToRun.includes('inject')) injectStyleLinks();
})();
