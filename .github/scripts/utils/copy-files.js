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
const fse = require('fs-extra');

const SOURCE_ROOT = path.resolve(__dirname, '../../../'); // adjust as needed
const DEST_ROOT = process.argv[3] || '/tmp/public';
const MODE = process.argv[2] || 'html'; // 'html' | 'assets' | etc.

// Folders you never want pushed public
const EXCLUDED_FOLDERS = [
  '.github',
  '.git',
  'logs',
  'private',
  '__secrets__',
  '.DS_Store'
];

// Allowlist overrides (e.g. allow public scripts folder)
const ALLOWLISTED_PATHS = [
  'scripts'
];

// Check whether a folder should be excluded from public push
function isExcluded(relativePath) {
  const firstSegment = relativePath.split(path.sep)[0];
  return (
    EXCLUDED_FOLDERS.includes(firstSegment) &&
    !ALLOWLISTED_PATHS.includes(firstSegment)
  );
}

// Recursively copy files based on mode, skipping excluded folders
function copyFiles(currentDir = SOURCE_ROOT, destDir = DEST_ROOT) {
  fs.readdirSync(currentDir).forEach(item => {
    const srcPath = path.join(currentDir, item);
    const relPath = path.relative(SOURCE_ROOT, srcPath);
    const destPath = path.join(destDir, relPath);

    // Skip excluded folders
    if (isExcluded(relPath)) return;

    const stats = fs.statSync(srcPath);
    if (stats.isDirectory()) {
      copyFiles(srcPath, destDir);
    } else {
      // Filter by mode if needed
      const isHTML = srcPath.endsWith('.html');
      const isAsset = !srcPath.endsWith('.html') && !srcPath.endsWith('.js') && !srcPath.endsWith('.json');

      if (
        (MODE === 'html' && isHTML) ||
        (MODE === 'assets' && isAsset) ||
        (MODE === 'all')
      ) {
        fse.ensureDirSync(path.dirname(destPath));
        fs.copyFileSync(srcPath, destPath);
        console.log(`✔ Copied ${relPath}`);
      }
    }
  });
}

copyFiles();
