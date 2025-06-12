#!/usr/bin/env node

/**
 * -----------------------------------------------------------------------------
 * TRUST AUTOMATION – FILE STAGING SCRIPT
 * -----------------------------------------------------------------------------
 * Copies selected files from the root repo into a temporary public folder
 * based on MODE. It excludes internal folders unless explicitly whitelisted.
 *
 * Modes:
 *   html   → Copies only active .html files (skips inactive ones)
 *   assets → Copies all other files (CSS, JS, images, etc)
 *   all    → Copies everything (use with caution)
 * -----------------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');

const SOURCE_ROOT = path.resolve(__dirname, '../../../');
const DEST_ROOT = process.argv[3] || '/tmp/public';
const MODE = process.argv[2] || 'html';

// Folders to always exclude unless allowlisted
const EXCLUDED_FOLDERS = [
  '.github',
  '.git',
  'logs',
  'private',
  '__secrets__',
  'drafts'
];

// Folder overrides that are allowed even if they appear in EXCLUDED_FOLDERS
const ALLOWLISTED_PATHS = ['scripts'];

// Determines if a file or folder path should be excluded
function isExcluded(relPath) {
  const firstSegment = relPath.split(path.sep)[0];
  return (
    EXCLUDED_FOLDERS.includes(firstSegment) &&
    !ALLOWLISTED_PATHS.includes(firstSegment)
  );
}

// Checks whether an HTML file is inactive (via meta tag)
function isInactiveHtml(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const inactivePattern = /<meta\s+name=["']doc-status["']\s+content=["']inactive["']/i;
  return inactivePattern.test(content);
}

// Main recursive file copier
function copyFiles(currentDir = SOURCE_ROOT, destDir = DEST_ROOT) {
  fs.readdirSync(currentDir).forEach(item => {
    const srcPath = path.join(currentDir, item);
    const relPath = path.relative(SOURCE_ROOT, srcPath);
    const destPath = path.join(destDir, relPath);

    if (isExcluded(relPath)) return;

    const stats = fs.statSync(srcPath);
    if (stats.isDirectory()) {
      copyFiles(srcPath, destDir);
    } else {
      const isHTML = srcPath.endsWith('.html');
      const isAsset = !isHTML;

      if (MODE === 'html' && isHTML) {
        if (isInactiveHtml(srcPath)) {
          console.log(`⚠ Skipped inactive HTML: ${relPath}`);
          return;
        }
        fse.ensureDirSync(path.dirname(destPath));
        fs.copyFileSync(srcPath, destPath);
        console.log(`✔ Copied active HTML: ${relPath}`);

      } else if (MODE === 'assets' && isAsset) {
        fse.ensureDirSync(path.dirname(destPath));
        fs.copyFileSync(srcPath, destPath);
        console.log(`✔ Copied asset: ${relPath}`);

      } else if (MODE === 'all') {
        fse.ensureDirSync(path.dirname(destPath));
        fs.copyFileSync(srcPath, destPath);
        console.log(`✔ Copied: ${relPath}`);
      }
    }
  });
}

copyFiles();
