// =============================
// File: core.js
// =============================

// Global list of Google Fonts used across the site
const GOOGLE_FONTS = [
  "Spectral+SC",
  "Playfair+Display",
  "Scope+One"
];

// Decode HTML entities
const decodeHTML = str => {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
};

// Helper to render values with optional TM decoding
function renderValue(label, value, solo) {
  const TM_MARKER = '<span class="tm">&trade;</span>';
  const isHTMLSafe = value.includes(TM_MARKER);

  if (solo) {
    return `<strong>${label}:</strong> ${isHTMLSafe ? value : decodeHTML(value)}`;
  } else {
    return `${label}: ${isHTMLSafe ? value : decodeHTML(value)}`;
  }
}

// Load Google Fonts dynamically
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

// Load external HTML and insert it into a target container
function loadHTML(id, url, callback, googleFonts = GOOGLE_FONTS) {
  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load ${url}`);
      return response.text();
    })
    .then(html => {
      const container = document.getElementById(id);
      if (container) {
        container.innerHTML = html;
        if (googleFonts?.length) enableGoogleFonts(googleFonts);
        if (callback) callback();
      }
    })
    .catch(error => console.error(`Error loading ${url}:`, error));
}

// Highlight the current nav item based on URL
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

// Inject the current year in the footer
function insertFooterYear() {
  const yearSpan = document.getElementById("footer-year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
}

// Entry point for general page setup
function startCore() {
  loadHTML("site-header", "/header.html", highlightActiveMenuItem);
  loadHTML("site-footer", "/footer.html", insertFooterYear);
}
