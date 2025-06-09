// ============================================================
// File: sync-pdf-links.js
// Purpose: Ensures that a matching PDF icon link appears
//          inside the <h1> tag if a PDF with the same
//          basename exists. Otherwise, any existing icon link
//          is stripped to keep the HTML tidy.
// ============================================================

const fs = require("fs");
const path = require("path");
const { getAllContentFolders } = require("./utils/template-metadata");

// Regex to match <a class="pdf-link">...</a>
const pdfLinkRegex = /<a[^>]*class="pdf-link"[^>]*>[\s\S]*?<\/a>/;

// Create the inline PDF icon block
function buildPdfLink(basename) {
  return `
    <a href="${basename}.pdf" class="pdf-link" target="_blank" rel="noopener noreferrer" title="Download PDF">
      <img src="/images/pdf_icon.svg" alt="PDF" class="pdf-icon-inline">
    </a>`;
}

// Inject the PDF icon inside <h1> tag
function injectPdfIcon(html, basename) {
  const hasIcon = pdfLinkRegex.test(html);
  const iconHtml = buildPdfLink(basename).trim();

  // Remove old version if it exists
  html = html.replace(pdfLinkRegex, "");

  // Inject the icon at the end of <h1> content
  return html.replace(
    /(<div class="doc-title-wrapper">[\s\S]*?<h1[^>]*>)(.*?)(<\/h1>)/,
    (_, open, content, close) => `${open}${content} ${iconHtml}${close}`
  );
}

// MAIN OPERATION
function syncPdfLink(html, basename, folder) {
  const pdfPath = path.join(folder, `${basename}.pdf`);
  const pdfExists = fs.existsSync(pdfPath);

  if (pdfExists) {
    return injectPdfIcon(html, basename);
  } else {
    return html.replace(pdfLinkRegex, "").trimEnd();
  }
}

// Execute for all folders with content templates
const contentFolders = getAllContentFolders(".");

contentFolders.forEach((folder) => {
  const folderPath = path.resolve(folder);

  fs.readdirSync(folderPath).forEach((file) => {
    if (file.endsWith(".html")) {
      const basename = path.basename(file, ".html");
      const htmlPath = path.join(folderPath, file);

      const original = fs.readFileSync(htmlPath, "utf8");
      const updated = syncPdfLink(original, basename, folderPath);

      if (original !== updated) {
        fs.writeFileSync(htmlPath, updated, "utf8");
        console.log(`✎ Updated: ${folder}/${file}`);
      } else {
        console.log(`✓ No change needed: ${folder}/${file}`);
      }
    }
  });
});
