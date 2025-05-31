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

function processDate(rawValue, formatHint = "") {
  // Try ISO parse first
  const inputDate = new Date(rawValue);
  if (isNaN(inputDate)) return rawValue;

  // Try technical format string
  if (/y{2,4}|M{1,4}|d{1,2}/i.test(formatHint)) {
    return applyFormat(inputDate, formatHint); // see below
  }

  // Try sample-based format inference
  const locale = guessLocaleFromExample(formatHint) || 'en-US';

  return inputDate.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function applyFormat(date, formatStr) {
  const map = {
    yyyy: date.getFullYear(),
    yy: String(date.getFullYear()).slice(-2),
    MMMM: date.toLocaleString('default', { month: 'long' }),
    MMM: date.toLocaleString('default', { month: 'short' }),
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    M: date.getMonth() + 1,
    dd: String(date.getDate()).padStart(2, '0'),
    d: date.getDate()
  };

  return formatStr.replace(/yyyy|yy|MMMM|MMM|MM|M|dd|d/g, token => map[token] ?? token);
}

function guessLocaleFromExample(example) {
  if (/May\s+\d{1,2},\s+\d{4}/i.test(example)) return 'en-US';     // May 21, 2025
  if (/\d{1,2}\s+May\s+\d{4}/i.test(example)) return 'en-GB';       // 21 May 2025
  if (/\d{2}\/\d{2}\/\d{4}/.test(example)) return 'en-US';          // 05/21/2025
  return null;
}

function renderValue(label, value, solo = false, style = "", metaFormat = "") {
  let formattedValue = value;

  if (style === "date") {
    formattedValue = processDate(value, metaFormat);
  }

  const isHTMLSafe = formattedValue.includes(TM_MARKER);
  const decoded = isHTMLSafe ? formattedValue : decodeHTML(formattedValue);

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
