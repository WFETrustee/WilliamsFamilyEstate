(async function () {
  const log = (...args) => console.log("[logo.js]", ...args);
  const warn = (...args) => console.warn("[logo.js]", ...args);

  try {
    log("Starting fetches...");

    // Fire all 3 fetches in parallel
    const [sealResp, textResp, layoutResp] = await Promise.all([
      fetch('/images/logo/seal-wfe.svgfrag'),
      fetch('/images/logo/text-wfe.svgfrag'),
      fetch('/images/logo/logo-template.svg')
    ]);

    // Check all responses
    if (!sealResp.ok || !textResp.ok || !layoutResp.ok) {
      warn("One or more SVG fetches failed:", {
        seal: sealResp.status,
        text: textResp.status,
        layout: layoutResp.status
      });
      return;
    }

    // Read content in parallel too
    const [seal, text, layoutRaw] = await Promise.all([
      sealResp.text(),
      textResp.text(),
      layoutResp.text()
    ]);

    // Compose final SVG
    const layout = layoutRaw
      .replace('<!-- {{SEAL_CONTENT}} -->', seal)
      .replace('<!-- {{TEXT_CONTENT}} -->', text);

    // Inject into DOM
    const container = document.getElementById('logo');
    if (!container) {
      warn("Container #logo not found in DOM.");
      return;
    }

    container.innerHTML = layout;
    log("SVG successfully injected into #logo.");
  } catch (err) {
    warn("Unexpected error during SVG injection:", err);
  }
})();
