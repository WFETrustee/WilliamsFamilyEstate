(async function () {
  const log = (...args) => console.log("[logo.js]", ...args);
  const warn = (...args) => console.warn("[logo.js]", ...args);

  try {
    const wrapper = document.getElementById('logo-wrapper');
    if (!wrapper) return warn("No #logo-wrapper found.");

    // Clear any fallback content (e.g. static <img>)
    wrapper.innerHTML = '';

    // Create <img> for seal
    const sealImg = document.createElement("img");
    sealImg.src = "/images/logo/WFE-Seal.svg";
    sealImg.alt = "Williams Family Estate™ Seal";
    sealImg.id = "seal";

    // Create <img> for tradename
    const nameImg = document.createElement("img");
    nameImg.src = "/images/logo/WFE-Tradename.svg";
    nameImg.alt = "Williams Family Estate™";
    nameImg.id = "text";

    // Append to wrapper
    wrapper.appendChild(sealImg);
    wrapper.appendChild(nameImg);

    log("Logo images injected successfully.");
  } catch (err) {
    warn("Error injecting logo images:", err);
  }
})();
