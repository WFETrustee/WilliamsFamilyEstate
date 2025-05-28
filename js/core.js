// =============================
// File: core.js
// =============================

const GOOGLE_FONTS = [
  "Spectral+SC",
  "Playfair+Display",
  "Scope+One"
];

const TM_MARKER = '<span class="tm">&trade;</span>';

const decodeHTML = str => {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
};

function renderValue(label, value, solo) {
  const isHTMLSafe = value.includes(TM_MARKER);
  const decoded = isHTMLSafe ? value : decodeHTML(value);
  return solo
    ? `<strong>${label}:</strong> ${decoded}`
    : `${label}: ${decoded}`;
}

function enableGoogleFonts(fonts) {
  const fontList = Array.isArray(fonts) ? fonts : [fonts];
  fontList.forEach(font_family => {
    if (!document.querySelector(`link[href*='${font_family}']`)) {
      const link = document.createElement("link");
      link.href = `https://fonts.googleapis.com/css?family=${font_family}`;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
  });
}

function loadHTML(id, url, callback, fonts = GOOGLE_FONTS) {
  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load ${url}`);
      return response.text();
    })
    .then(html => {
      const container = document.getElementById(id);
      if (container) {
        container.innerHTML = html;
        if (fonts?.length) enableGoogleFonts(fonts);
        if (callback) callback();
      }
    })
    .catch(error => console.error(`Error loading ${url}:`, error));
}

function highlightActiveMenuItem() {
  const links = document.querySelectorAll("nav ul li a");
  const path = location.pathname.replace(/\/$/, "");
  links.forEach(link => {
    const href = link.getAttribute("href").replace(/\/$/, "");
    if (href === path || (href.endsWith("index.html") && (path === "" || path === "/index.html"))) {
      link.classList.add("active");
    }
  });
}

function insertFooterYear() {
  const yearSpan = document.getElementById("footer-year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", () => {
  loadHTML("site-header", "/header.html", highlightActiveMenuItem);
  loadHTML("site-footer", "/footer.html", insertFooterYear);

  if (document.getElementById("live-notices") && typeof startPublish === "function") {
    startPublish();
  }
});
