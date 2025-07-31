(async function () {
  const log = (...args) => console.log("[logo.js]", ...args);
  const warn = (...args) => console.warn("[logo.js]", ...args);

  try {
    log("Starting fetches...");

    const [sealResp, textResp] = await Promise.all([
      fetch('/images/logo/seal-wfe.svgfrag'),
      fetch('/images/logo/text-wfe.svgfrag')
    ]);

    if (!sealResp.ok || !textResp.ok) {
      warn("Failed to fetch one or more logo fragments:", {
        seal: sealResp.status,
        text: textResp.status
      });
      return;
    }

    const [seal, text] = await Promise.all([
      sealResp.text(),
      textResp.text()
    ]);

    const logoDiv = document.getElementById("logo");
    if (!logoDiv) {
      warn("Missing #logo container in DOM.");
      return;
    }

    // Clear fallback PNG
    logoDiv.innerHTML = "";

    // Build HTML structure
    const container = document.createElement("div");
    container.className = "logo-container";

    const sealDiv = document.createElement("div");
    sealDiv.id = "seal";
    sealDiv.innerHTML = seal;

    const textDiv = document.createElement("div");
    textDiv.id = "text";
    textDiv.innerHTML = text;

    container.appendChild(sealDiv);
    container.appendChild(textDiv);
    logoDiv.appendChild(container);

    log("SVG logo fragments injected.");
  } catch (err) {
    warn("Unexpected error during logo injection:", err);
  }
})();
