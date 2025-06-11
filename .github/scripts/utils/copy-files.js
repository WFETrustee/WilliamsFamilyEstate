#!/usr/bin/env node

/**
 * -----------------------------------------------------------------------------
 * TRUST AUTOMATION – FILE STAGING SCRIPT
 * -----------------------------------------------------------------------------
 * This script is part of the Trust publishing system. It's used to pre-process
 * and stage files (both HTML and non-HTML) for deployment to the `public` branch.
 * 
 * We use it inside GitHub Actions to:
 *   1. Copy all static assets EXCEPT .html files (unless flagged active)
 *   2. Copy only .html files that are *not* marked as inactive via a meta tag
 * 
 * Inactive HTML files are skipped by design – only "live" public documents
 * should be deployed to the trust's public record.
 * 
 * This is part of the broader system ensuring the Trust operates with integrity,
 * minimizes manual steps, and stays DRY.
 * 
 * Usage:
 *   node scripts/copy-files.js [html|assets] /path/to/dest
 * -----------------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

// Parse input params
const [, , type, dest] = process.argv;

if (!type || !dest || !['html', 'assets'].includes(type)) {
  console.error("Usage: node copy-files.js [html|assets] <destination>");
  process.exit(1);
}

// Directories we don't want to copy – ever
const IGNORED_DIRS = ['.git', '.github', 'public', 'node_modules'];

// Helper: Check if file lives inside an ignored dir
function shouldIgnore(filePath) {
  return IGNORED_DIRS.some(dir =>
    filePath.includes(`/${dir}/`) || filePath.startsWith(`${dir}/`)
  );
}

// Helper: For HTML only – is this marked inactive via meta tag?
function isInactiveHTML(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const inactivePattern = /content\s*=\s*["']inactive["']/i;
  return inactivePattern.test(content);
}

// Helper: Create target folder if needed and copy file over
function copyFile(filePath, destRoot) {
  const destPath = path.join(destRoot, filePath);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(filePath, destPath);
}

// Recursive directory walker – reads every file under .
function walk(dir = '.') {
  let results = [];

  for (const entry of fs.readdirSync(dir)) {
    // Skip dotfiles/folders right away
    if (entry.startsWith('.')) continue;

    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Recurse only if not ignored
      if (!IGNORED_DIRS.includes(entry)) {
        results = results.concat(walk(fullPath));
      }
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

// Start walking the working dir and process based on mode
const files = walk();

files.forEach(file => {
  if (shouldIgnore(file)) return;

  // Mode: assets (copy everything that isn't .html)
  if (type === 'assets' && !file.endsWith('.html')) {
    copyFile(file, dest);
  }

  // Mode: html (copy only if not inactive)
  else if (type === 'html' && file.endsWith('.html') && !isInactiveHTML(file)) {
    copyFile(file, dest);
    console.log(`Included: ${file}`);
  }
});
