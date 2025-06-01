//.github/scripts/clean-style-links.js

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const ROOT_STYLE = '/style.css';

function cleanStyleLinks(filePath, folderName) {
  let html = fs.readFileSync(filePath, 'utf-8');

  // Remove any "../style.css" or similar relative variants
  html = html.replace(/<link\s+rel="stylesheet"\s+href="\.{1,2}\/style\.css"\s*\/?>\s*/gi, '');

  // Remove any duplicate /style.css links
  const seen = new Set();
  html = html.replace(/<link\s+rel="stylesheet"\s+href="([^"]+)"[^>]*>\s*/gi, (match, href) => {
    if (href === ROOT_STYLE || href === `/${folderName}/style.css`) {
      if (seen.has(href)) return ''; // Remove duplicates
      seen.add(href);
      return match; // Keep the first occurrence
    }
    return ''; // Strip out anything else
  });

  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`🧼 Cleaned: ${filePath}`);
}

const folders = fs.readdirSync('.').filter(f => fs.existsSync(`${f}/${f}_template.html`));

folders.forEach(folder => {
  glob(`${folder}/**/*.html`, {}, (err, files) => {
    if (err) return console.error(err);
    files.forEach(file => cleanStyleLinks(file, folder));
  });
});
