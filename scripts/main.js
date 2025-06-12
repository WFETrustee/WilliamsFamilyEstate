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
        if (typeof loadHTML === "function") {
          loadHTML("site-header", "/header.html", highlightActiveMenuItem, config);
          
          // Inject both year and build version after footer loads
          loadHTML("site-footer", "/footer.html", () => {
            insertFooterYear();
            insertBuildMetadata(config);
          }, config);
        }

        // Load dynamic publishing logic if needed
        if (document.getElementById("live-content")) {
          loadScript("/scripts/publish.js", () => {
            if (typeof startPublish === "function") {
              startPublish(window.siteConfig);
            } else {
              console.error("startPublish is not defined in publish.js");
            }
          });
        }
      });
    })
    .catch(err => {
      console.error("site-config.json failed to load. Aborting startup.", err);
    });
});
