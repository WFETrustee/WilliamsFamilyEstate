// generate-css-stubs.js

const fs = require('fs');
const path = require('path');

const baseDir = '.';

const folders = fs.readdirSync(baseDir).filter(name => {
  const fullPath = path.join(baseDir, name);
  return fs.statSync(fullPath).isDirectory();
});

folders.forEach(folder => {
  const templateFile = `${folder}_template.html`;
  const templatePath = path.join(folder, templateFile);
  const cssPath = path.join(folder, 'style.css');

  if (!fs.existsSync(templatePath)) return;

  // --- Extract doc-* metadata keys ---
  const html = fs.readFileSync(templatePath, 'utf-8');
  const metaRegex = /<meta\s+[^>]*name=["']doc-([a-z0-9\-]+)["'][^>]*>/gi;
  const found = new Set();
  let match;
  while ((match = metaRegex.exec(html))) {
    const raw = match[1].trim();
    const className = '.' + raw.replace(/[^a-z0-9\-_]/gi, '');
    found.add(className);
  }

  // --- Create style.css if missing ---
  if (!fs.existsSync(cssPath)) {
    fs.writeFileSync(cssPath, '', 'utf-8');
  }

  // --- Check existing classes ---
  const css = fs.readFileSync(cssPath, 'utf-8');
  const existing = new Set();
  const classRegex = /\.(\w[\w\-]*)\s*\{/g;
  let cm;
  while ((cm = classRegex.exec(css))) {
    existing.add('.' + cm[1]);
  }

  // --- Append stubs for missing classes ---
  const missing = [...found].filter(cls => !existing.has(cls));
  if (missing.length > 0) {
    const additions = `\n/* Auto-generated metadata stubs */\n` +
      missing.map(cls => `${cls} { }\n`).join('');
    fs.appendFileSync(cssPath, additions, 'utf-8');
    console.log(`✅ ${folder}/style.css updated with ${missing.length} stubs.`);
  } else {
    console.log(`✔️ ${folder}/style.css already complete.`);
  }
});
