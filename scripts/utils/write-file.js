const fs = require('fs');
const path = require('path');

/**
 * Safely write UTF-8 content to a file without BOM, overwriting by default.
 * @param {string} filePath - Destination file path.
 * @param {string|Buffer} content - Content to write.
 */
function writeUTF8(filePath, content) {
  fs.writeFileSync(filePath, content, {
    encoding: 'utf8',
    flag: 'w' // Always overwrite (safe default)
  });
}

module.exports = { writeUTF8 };
