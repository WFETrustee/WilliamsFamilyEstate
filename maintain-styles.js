// maintain-styles.js
//
// 🛠️ Maintains and organizes CSS files across folders.
// Core rules:
// - Keeps visual groupings (headers, empty lines, etc.)
// - Preserves @media nesting
// - Deduplicates by selector + media type
// - Outputs structured, readable CSS
//
// G W – Williams Family Estate
// June 2025

import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import safeParser from 'postcss-safe-parser';

// Load target CSS file paths
const targets = [
  './style.css',
  './notice/style.css',
  './emergency/style.css'
];

const readCssFile = (filePath) =>
  fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';

const writeCssFile = (filePath, contents) => {
  if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf8') !== contents) {
    fs.writeFileSync(filePath, contents, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`⏩ No changes: ${filePath}`);
  }
};

const extractGroupName = (comment) => {
  const match = comment.text.match(/Group:\s*(.*)/i);
  return match ? match[1].trim() : 'Ungrouped';
};

const normalizeWhitespace = (css) =>
  css.replace(/[ \t]+$/gm, '') // Trim right side
     .replace(/\n{3,}/g, '\n\n'); // Collapse excess newlines

const serializeRules = (rules) => {
  return rules.map(rule => rule.toString()).join('\n\n');
};

const processCss = async (filePath) => {
  const raw = readCssFile(filePath);
  const root = postcss.parse(raw, { from: filePath, parser: safeParser });

  const blocks = [];
  let currentGroup = '';
  let currentMedia = '';
  const dedupMap = new Map();

  root.nodes.forEach((node, idx) => {
    if (node.type === 'comment' && node.text.match(/Group:/)) {
      currentGroup = extractGroupName(node);
      blocks.push({ type: 'comment', value: `/* ==================== */\n/* Group: ${currentGroup} */` });
    }

    if (node.type === 'atrule' && node.name === 'media') {
      const mq = `@media ${node.params}`;
      const groupComment = root.nodes[idx - 1];
      const groupName = groupComment?.type === 'comment' && groupComment.text.match(/Group:/)
        ? extractGroupName(groupComment)
        : 'Responsive Enhancements';

      const mediaRules = serializeRules(node.nodes);
      const key = `${mq}|${mediaRules}`;

      if (!dedupMap.has(key)) {
        dedupMap.set(key, true);
        blocks.push({ type: 'media', query: mq, rules: mediaRules, group: groupName });
      }
    }

    if (node.type === 'rule') {
      const selectorKey = `${currentMedia || 'global'}|${node.selector}`;
      if (!dedupMap.has(selectorKey)) {
        dedupMap.set(selectorKey, true);
        blocks.push({ type: 'rule', selector: node.selector, css: node.toString(), group: currentGroup });
      }
    }

    if (node.type === 'comment' && !node.text.match(/Group:/)) {
      blocks.push({ type: 'loose-comment', value: `/* ${node.text.trim()} */` });
    }
  });

  // Construct final output
  let output = '';
  let lastGroup = null;

  for (const block of blocks) {
    if (block.type === 'comment') {
      output += `\n\n${block.value}\n`;
      lastGroup = block.value;
    } else if (block.type === 'rule') {
      if (block.group !== lastGroup) {
        output += `\n\n/* Group: ${block.group || 'Ungrouped'} */\n`;
        lastGroup = block.group;
      }
      output += `\n${block.css}`;
    } else if (block.type === 'media') {
      output += `\n\n/* Group: ${block.group} */\n${block.query} {\n${block.rules}\n}\n`;
    } else if (block.type === 'loose-comment') {
      output += `\n${block.value}`;
    }
  }

  const finalOutput = normalizeWhitespace(output.trim()) + '\n';
  writeCssFile(filePath, finalOutput);
};

// Run the processor for each file
(async () => {
  for (const target of targets) {
    await processCss(target);
  }
})();
