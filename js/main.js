// =============================
// File: main.js
// =============================

function loadScript(url, callback) {
  const script = document.createElement("script");
  script.src = url;
  script.onload = () => callback?.();
  script.onerror = () => console.error(`Failed to load script: ${url}`);
  document.head.appendChild(script);
}

document.addEventListener("DOMContentLoaded", () => {
  // Load core.js first
  loadScript("/js/core.js", () => {
    // Then load header and footer
    loadHTML("site-header", "/header.html", highlightActiveMenuItem);
    loadHTML("site-footer", "/footer.html", insertFooterYear);

    // Conditionally load publish.js if needed
    if (document.getElementById("live-notices")) {
      loadScript("/js/publish.js", () => {
        if (typeof startPublish === "function") startPublish();
      });
    }
  });
});
