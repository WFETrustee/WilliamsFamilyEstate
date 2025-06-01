// .github/scripts/clean-style-links.js
// ==========================================================
// Purpose: Cleans up duplicate or invalid <link rel="stylesheet"> tags in HTML
// Files must include only one root and one folder style.css reference.
// ==========================================================

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const ROOT_STYLE = '/style.css';

/**
 * Cleans a single HTML file by removing duplicate or incorrect style references.
 */
function cleanStyleLinks(filePath, folderName) {
  let html = fs.readFileSync(filePath, 'utf-8');

  // Remove relative references like "../style.css" or "./style.css"
  html = html.replace(/<link\s+rel="stylesheet"\s+href="\.{1,2}\/style\.css"\s*\/?>\s*/gi, '');

  // Track and eliminate duplicates of root and folder CSS links
  const seen = new Set();
  html = html.replace(/<link\s+rel="stylesheet"\s+href="([^"]+)"[^>]*>\s*/gi, (match, href) => {
    if (href === ROOT_STYLE || href === `/${folderName}/style.css`) {
      if (seen.has(href)) return ''; // Remove duplicate
      seen.add(href);
      return match; // Keep first occurrence
    }
    return ''; // Remove all others
  });

  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`🧼 Cleaned: ${filePath}`);
}

/**
 * Process all folders that have a corresponding *_template.html file.
 */
const folders = fs.readdirSync('.').filter(f => fs.existsSync(`${f}/${f}_template.html`));

folders.forEach(folder => {
  const htmlFiles = glob.sync(`${folder}/**/*.html`);
  htmlFiles.forEach(file => cleanStyleLinks(file, folder));
});
