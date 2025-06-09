// ============================================================
// File: sync-pdf-links.js
// Purpose: Ensures that a matching PDF icon link appears in the
//          HTML file only if a PDF with the same basename exists.
//          If no matching PDF is found, any existing <a class="pdf-link">
//          blocks will be stripped from the HTML. This keeps things tidy.
// ============================================================

const fs = require("fs");
const path = require("path");
const { getAllContentFolders } = require("./utils/template-metadata"); 

// This handles the logic for adding or removing the PDF icon
function syncPdfLink(html, basename, folder) {
  const pdfPath = path.join(folder, `${basename}.pdf`);
  const hasPdf = fs.existsSync(pdfPath);

  // Regex to match the entire <a class="pdf-link"> block, including nested <img>
  const pdfLinkRegex = /<a[^>]*class="pdf-link"[^>]*>[\s\S]*?<\/a>/;

  const shouldInject = hasPdf && !pdfLinkRegex.test(html);
  const shouldRemove = !hasPdf && pdfLinkRegex.test(html);

  // If the PDF doesn't exist but the link is still in the HTML, kill it
  if (shouldRemove) {
    return html.replace(pdfLinkRegex, "").trimEnd();
  }

  // If the PDF exists but the link hasn't been injected yet, add it
  if (shouldInject) {
    const pdfLink = `
  <a href="${basename}.pdf" class="pdf-link" target="_blank" rel="noopener noreferrer" title="Download PDF">
    <img src="/images/pdf_icon.svg" alt="PDF" class="pdf-float-icon">
  </a>`;

    // Insert just after the </h2> inside <div class="doc-title-wrapper">
    return html.replace(
      /(<div class="doc-title-wrapper">[\s\S]*?<h2[^>]*>.*?<\/h2>)/,
      `$1\n${pdfLink}`
    );
  }

  // No changes necessary
  return html;
}

// MAIN PROCESS
const contentFolders = getAllContentFolders('.'); // defined in template-metadata.js — scans for folders with *_template.html files

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
