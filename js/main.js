// =============================
// File: main.js
// =============================

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Load dependencies and initialize
(async () => {
  try {
    await loadScript("/js/core.js");

    // If notices are being rendered, load publish.js
    if (document.getElementById("live-notices")) {
      await loadScript("/js/publish.js");
    }

    if (typeof startCore === "function") startCore();
  } catch (err) {
    console.error("Script load error:", err);
  }
})();
