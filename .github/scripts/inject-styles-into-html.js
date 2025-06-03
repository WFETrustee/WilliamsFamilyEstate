// .github/scripts/inject-styles-into-html.js
// ==========================================================
// Ensures every HTML file in content folders includes
// references to both the root-level and folder-level style.css
// ==========================================================

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { getAllContentFolders } = require('./utils/template-metadata');
const { writeFile } = require('./utils/write-file'); // NEW: shared writer

const ROOT_STYLE_HREF = '/style.css';

function injectStylesIntoFile(filePath, folder) {
  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html);

  const head = $('head');
  if (!head.length) return;

  const rootExists = $(`link[href="${ROOT_STYLE_HREF}"]`).length > 0;
  const folderHref = `/${folder}/style.css`;
  const folderExists = $(`link[href="${folderHref}"]`).length > 0;

  let changed = false;

  if (!rootExists) {
    head.append(`\n<link rel="stylesheet" href="${ROOT_STYLE_HREF}">`);
    console.log(`✅ Added root CSS to ${filePath}`);
    changed = true;
  }

  if (!folderExists) {
    head.append(`\n<link rel="stylesheet" href="${folderHref}">`);
    console.log(`✅ Added folder CSS to ${filePath}`);
    changed = true;
  }

  if (changed) {
    const newHTML = $.html();
    writeFile(filePath, newHTML); // ✅ Use shared utility
  } else {
    console.log(`✔️  ${filePath} already includes both styles`);
  }
}

function run() {
  const folders = getAllContentFolders('.');
  folders.forEach(folder => {
    const folderPath = path.join('.', folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.html'));

    files.forEach(file => {
      const filePath = path.join(folderPath, file);
      injectStylesIntoFile(filePath, folder);
    });
  });
}

run();
