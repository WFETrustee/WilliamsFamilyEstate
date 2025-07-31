// =============================
// File: main.js
// Purpose: Site bootstrap script that initializes the front-end environment.
// It loads config (site-config.json), loads core.js, and then dynamically
// loads header, footer, and dynamic content rendering if needed.
// =============================

// =============================
// File: main.js
// =============================

function loadScript(url, callback) {
  const script = document.createElement("script");
  script.src = url;
  script.onload = () => {
    console.log(`${url} loaded OK`);
    callback?.();
  };
  script.onerror = () => {
    console.error(`❌ Failed to load script: ${url}`);
  };
  document.head.appendChild(script);
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded event fired");

  fetch('/site-config.json')
    .then(res => {
      console.log("site-config.json fetch OK");
      return res.json();
    })
    .then(config => {
      console.log("Parsed site-config.json", config);
      window.siteConfig = config;

      // ✅ Now load core.js before using its functions
      loadScript("/scripts/core.js", () => {
        console.log("/scripts/core.js loaded OK");

        // ✅ These now work because core.js is loaded
        console.log("Calling loadHTML for site-header...");
        loadHTML("site-header", "/header.html", () => {
          highlightActiveMenuItem();
          console.log("calling loadLogoJS() from inside header callback");
          loadLogoJS();
        }, config);

        console.log("Calling loadHTML for site-footer...");
        loadHTML("site-footer", "/footer.html", insertFooterYear, config);

        if (document.getElementById("live-content") && typeof startPublish === "function") {
          console.log("Calling startPublish()");
          startPublish(config);
        } else {
          console.log("startPublish not called.");
        }
      });
    })
    .catch(err => {
      console.error("site-config.json failed to load. Aborting startup.", err);
      window.siteConfig = {};
    });
});
