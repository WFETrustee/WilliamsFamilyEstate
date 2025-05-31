// ==========================================================
// File: template-metadata.js
// Purpose: Utility module for parsing content folders and extracting
// template metadata including style class names.
// Used across build tools such as manifest generation, CSS stub creation,
// and shared style distribution.
// ==========================================================

const fs = require('fs');
const path = require('path');

/**
 * Returns a list of all content folders that contain a matching
 * ($folder)_template.html file.
 * Example: 'notice/notice_template.html' means folder 'notice' is valid.
 */
function getAllContentFolders(rootDir = '.') {
  return fs.readdirSync(rootDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(folder => {
      const templateFile = path.join(rootDir, folder, `${folder}_template.html`);
      return fs.existsSync(templateFile);
    });
}

/**
 * Parses a template HTML string and returns all doc-* meta definitions,
 * grouped by data-group (or "__solo__" if no group is provided).
 */
function parseTemplateMetadata(templateHTML) {
  const doc = templateHTML.toString();
  const metaRegex = /<meta\s+[^>]*name=["']doc-([^"']+)["'][^>]*>/gi;

  const groupedMeta = {};
  let match;

  while ((match = metaRegex.exec(doc)) !== null) {
    const full = match[0];
    const key = `doc-${match[1]}`;
    const group = extractAttr(full, 'data-group') || "__solo__";
    const style = extractAttr(full, 'data-style') || null;
    const label = extractAttr(full, 'data-label') || humanizeLabel(match[1]);
    const formatHint = extractAttr(full, 'content') || "";

    const def = { key, group, style, label, formatHint };
    if (!groupedMeta[group]) groupedMeta[group] = [];
    groupedMeta[group].push(def);
  }

  return { groupedMeta };
}

/**
 * Extracts all unique values of data-style="..." from a template HTML string.
 * Used by generate-css-stubs.js to create base CSS classes.
 */
function extractStyleClassesFromTemplate(templateHTML) {
  const matches = [...templateHTML.matchAll(/data-style=["']([^"']+)["']/g)];
  const unique = [...new Set(matches.map(m => m[1]))];
  return unique;
}

/**
 * Extracts the value of an attribute from a raw HTML tag string.
 */
function extractAttr(tag, attr) {
  const regex = new RegExp(`${attr}=["']([^"']+)["']`);
  const match = tag.match(regex);
  return match ? match[1] : null;
}

/**
 * Converts a raw key like "publish-date" to "Publish Date"
 */
function humanizeLabel(raw) {
  return raw
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

module.exports = {
  getAllContentFolders,
  parseTemplateMetadata,
  extractStyleClassesFromTemplate
};
