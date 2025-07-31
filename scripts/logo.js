(async function () {
  const log = (...args) => console.log("[logo.js]", ...args);
  const warn = (...args) => console.warn("[logo.js]", ...args);

  try {
    log("Starting fragment fetches...");

    const [sealResp, textResp] = await Promise.all([
      fetch('/images/logo/seal-wfe.svgfrag'),
      fetch('/images/logo/text-wfe.svgfrag')
    ]);

    if (!sealResp.ok || !textResp.ok) {
      warn("Fragment fetch failed", {
        seal: sealResp.status,
        text: textResp.status
      });
      return;
    }

    const [seal, text] = await Promise.all([
      sealResp.text(),
      textResp.text()
    ]);

    const wrapper = document.getElementById('logo-wrapper');
    if (!wrapper) return warn("No #logo-wrapper found.");

    // Clear fallback <img>
    wrapper.innerHTML = '';

    // Create SVG shell
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 2612 512");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "auto");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.classList.add("dynamic");

    // Inject fragments
    svg.innerHTML = seal + text;

    wrapper.appendChild(svg);
    log("SVG logo fragments injected.");
  } catch (err) {
    warn("Unexpected logo.js error:", err);
  }
})();
