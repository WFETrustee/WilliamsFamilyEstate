// =============================
// File: main.js
// =============================

document.addEventListener("DOMContentLoaded", () => {
  loadHTML("site-header", "/header.html", highlightActiveMenuItem);
  loadHTML("site-footer", "/footer.html", insertFooterYear);

  if (document.getElementById("live-notices")) {
    // Now delegated to publish.js
    if (typeof initPublishing === 'function') {
      initPublishing();
    } else {
      console.warn("Publishing module not loaded.");
    }
  }
});
