(async function () {
  try {
    const [sealResp, textResp, layoutResp] = await Promise.all([
      fetch('/images/logo/seal-wfe.svgfrag'),
      fetch('/images/logo/text-wfe.svgfrag'),
      fetch('/images/logo/logo-template.svg')
    ]);

    if (!sealResp.ok || !textResp.ok || !layoutResp.ok) {
      console.warn("One or more logo fragments failed to load.");
      return;
    }

    const [seal, text, layoutRaw] = await Promise.all([
      sealResp.text(),
      textResp.text(),
      layoutResp.text()
    ]);

    const layout = layoutRaw
      .replace('<!-- {{SEAL_CONTENT}} -->', seal)
      .replace('<!-- {{TEXT_CONTENT}} -->', text);

    const container = document.getElementById('logo');
    if (container) {
      container.innerHTML = layout;
    }
  } catch (e) {
    console.warn("Dynamic SVG logo injection failed:", e);
  }
})();
