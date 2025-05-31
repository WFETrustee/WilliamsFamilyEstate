// =============================
// File: core.js
// Purpose: Shared utility and rendering logic for Williams Family Estate frontend,
// including safe HTML rendering, smart date formatting, Google Fonts injection,
// header/footer loading, and menu highlighting.
// =============================

const TM_MARKER = '<span class="tm">&trade;</span>';
const DEFAULT_FONTS = ["Spectral+SC", "Playfair+Display", "Scope+One"];

const decodeHTML = str => {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
};

function processDate(rawValue, formatHint = "") {
  const inputDate = new Date(rawValue);
  if (isNaN(inputDate)) return rawValue;

  if (/y{2,4}|M{1,4}|d{1,2}/i.test(formatHint)) {
    return applyFormat(inputDate, formatHint);
  }

  const locale = guessLocaleFromExample(formatHint) || (window.siteConfig?.defaultLocale ?? "en-US");
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
  if (/May\s+\d{1,2},\s+\d{4}/i.test(example)) return 'en-US';
  if (/\d{1,2}\s+May\s+\d{4}/i.test(example)) return 'en-GB';
  if (/\d{2}\/\d{2}\/\d{4}/.test(example)) return 'en-US';
  return null;
}

function renderValue(label, value, solo = false, style = "", formatHint = "") {
  let formattedValue = value;
  if (style === "date") {
    formattedValue = processDate(value, formatHint || window.siteConfig?.defaultDateFormat);
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

function loadHTML(id, url, callback, fonts) {
  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load ${url}`);
      return response.text();
    })
    .then(html => {
      const container = document.getElementById(id);
      if (container) {
        container.innerHTML = html;
        if (fonts?.length && window.siteConfig?.loadGoogleFonts !== false) {
          enableGoogleFonts(fonts);
        }
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

// ⬇️ Load settings FIRST, then init DOM
fetch("/site-config.json")
  .then(res => res.json())
  .then(config => {
    window.siteConfig = config;

    document.addEventListener("DOMContentLoaded", () => {
      loadHTML("site-header", "/header.html", highlightActiveMenuItem, config.googleFonts ?? DEFAULT_FONTS);
      loadHTML("site-footer", "/footer.html", insertFooterYear);

      if (document.getElementById("live-notices") && typeof startPublish === "function") {
        startPublish();
      }
    });
  })
  .catch(err => {
    console.warn("site-config.json not found or invalid. Using defaults.");
    window.siteConfig = {}; // fallback

    document.addEventListener("DOMContentLoaded", () => {
      loadHTML("site-header", "/header.html", highlightActiveMenuItem, DEFAULT_FONTS);
      loadHTML("site-footer", "/footer.html", insertFooterYear);

      if (document.getElementById("live-notices") && typeof startPublish === "function") {
        startPublish();
      }
    });
  });
