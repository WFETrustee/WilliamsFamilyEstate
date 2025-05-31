// =============================
// File: main.js
// Purpose: Site bootstrap script that initializes the front-end environment.
// It loads config (site-config.json), loads core.js, and then dynamically
// loads header, footer, and dynamic content rendering if needed.
// =============================

function loadScript(url, callback) {
  const script = document.createElement("script");
  script.src = url;
  script.onload = () => callback?.();
  script.onerror = () => console.error(`Failed to load script: ${url}`);
  document.head.appendChild(script);
}

document.addEventListener("DOMContentLoaded", () => {
  fetch("/site-config.json")
    .then(res => res.json())
    .then(config => {
      window.siteConfig = config;

      loadScript("/scripts/core.js", () => {
        // Core must be loaded before we call any utilities
        if (typeof loadHTML === "function") {
          loadHTML("site-header", "/header.html", highlightActiveMenuItem, config);
          loadHTML("site-footer", "/footer.html", insertFooterYear, config);
        }

        // If this page is dynamic, load publish.js after core
        if (document.getElementById("live-notices")) {
          loadScript("/scripts/publish.js");
        }
      });
    })
    .catch(err => {
      console.error("site-config.json failed to load. Aborting startup.", err);
    });
});
