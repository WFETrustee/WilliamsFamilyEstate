(async function () {
  try {
    const sealResp = await fetch('/images/logo/seal-wfe.svgfrag');
    const textResp = await fetch('/images/logo/text-wfe.svgfrag');
    const layoutResp = await fetch('/images/logo/logo-template.svg');

    if (!sealResp.ok || !textResp.ok || !layoutResp.ok) return;

    let layout = await layoutResp.text();
    const seal = await sealResp.text();
    const text = await textResp.text();

    layout = layout
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