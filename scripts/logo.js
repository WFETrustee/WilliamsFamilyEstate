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

    const [sealContent, textContent] = await Promise.all([
      sealResp.text(),
      textResp.text()
    ]);

    const wrapSvg = (inner, viewBox = "0 0 512 512") => {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="auto" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
    };

    const wrapper = document.getElementById('logo-wrapper');
    if (!wrapper) return warn("No #logo-wrapper found.");

    wrapper.innerHTML = '';

    const sealDiv = document.createElement("div");
    sealDiv.id = "seal";
    sealDiv.innerHTML = wrapSvg(sealContent, "0 0 512 512"); // adjust viewBox as needed

    const textDiv = document.createElement("div");
    textDiv.id = "text";
    textDiv.innerHTML = wrapSvg(textContent, "0 0 2100 512"); // adjust viewBox as needed

    wrapper.appendChild(sealDiv);
    wrapper.appendChild(textDiv);

    log("Injected logo with valid SVG wrapping.");
  } catch (err) {
    warn("Unexpected logo.js error:", err);
  }
})();
