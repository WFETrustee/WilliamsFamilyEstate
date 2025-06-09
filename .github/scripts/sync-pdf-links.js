const fs = require("fs");
const path = require("path");

const directory = "./public/emergency"; // Adjust as needed

function syncPdfLink(html, basename) {
  const hasPdf = fs.existsSync(path.join(directory, `${basename}.pdf`));
  const pdfLinkRegex = /<a[^>]*class="pdf-link"[^>]*>[\s\S]*?<\/a>/;

  const shouldInject = hasPdf && !pdfLinkRegex.test(html);
  const shouldRemove = !hasPdf && pdfLinkRegex.test(html);

  // Remove if no PDF exists
  if (shouldRemove) {
    return html.replace(pdfLinkRegex, "").trimEnd();
  }

  // Inject only if necessary
  if (shouldInject) {
    const pdfLink = `
  <a href="${basename}.pdf" class="pdf-link" target="_blank" rel="noopener noreferrer" title="Download PDF">
    <img src="/images/pdf_icon.svg" alt="PDF" class="pdf-float-icon">
  </a>`;

    // Place just after the closing </h2> inside doc-title-wrapper
    return html.replace(
      /(<div class="doc-title-wrapper">[\s\S]*?<h2[^>]*>.*?<\/h2>)/,
      `$1\n${pdfLink}`
    );
  }

  return html;
}

fs.readdirSync(directory).forEach((file) => {
  if (file.endsWith(".html")) {
    const basename = path.basename(file, ".html");
    const htmlPath = path.join(directory, file);

    let html = fs.readFileSync(htmlPath, "utf8");
    const newHtml = syncPdfLink(html, basename);

    if (html !== newHtml) {
      fs.writeFileSync(htmlPath, newHtml, "utf8");
      console.log(`✎ Updated: ${file}`);
    } else {
      console.log(`✓ No change needed: ${file}`);
    }
  }
});
