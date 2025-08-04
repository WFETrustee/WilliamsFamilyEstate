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

    let [seal, text] = await Promise.all([
      sealResp.text(),
      textResp.text()
    ]);

    // Ensure each is wrapped in <svg> if not already
    const wrapInSvg = (content) => {
      const hasSvg = content.trim().startsWith("<svg");
      return hasSvg ? content : `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" preserveAspectRatio="xMidYMid meet">${content}</svg>`;
    };

    seal = wrapInSvg(seal);
    text = wrapInSvg(text);

    const wrapper = document.getElementById('logo-wrapper');
    if (!wrapper) return warn("No #logo-wrapper found.");

    // Clear fallback <img>
    wrapper.innerHTML = '';

    // Create wrapper divs
    const sealDiv = document.createElement("div");
    sealDiv.id = "seal";
    sealDiv.innerHTML = seal;

    const textDiv = document.createElement("div");
    textDiv.id = "text";
    textDiv.innerHTML = text;

    // Append to wrapper
    wrapper.appendChild(sealDiv);
    wrapper.appendChild(textDiv);

    log("Injected logo using HTML containers and verified SVG wrapping.");
  } catch (err) {
    warn("Unexpected logo.js error:", err);
  }
})();
