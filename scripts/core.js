// ==========================================================
// File: core.js
// Purpose: Provides foundational utility functions for rendering,
// formatting, loading shared layouts, and injecting dynamic assets.
// This script supports dynamic Google Fonts, HTML decoding,
// date formatting, and shared layout includes.
// It integrates with the global `siteConfig` object (from site-config.json)
// to respect site-wide preferences and behaviors.
// ==========================================================
(() => {
  if (typeof console.log !== "function") {
    alert("🚨 console.log is missing!");
  } else {
    try {
      const testStr = "🧪 console.log test";
      console.log(testStr);
      if (!window.consoleHistory) window.consoleHistory = [];
      window.consoleHistory.push(testStr);
    } catch (e) {
      alert("🚨 console.log failed silently");
    }
  }
})();

const TM_MARKER = '<span class="tm">&trade;</span>';

const decodeHTML = str => {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
};

/**
 * Formats a date based on a raw value and optional hint.
 * Supports ISO, custom formats (e.g. "MMMM d, yyyy"), or locale inference from example string.
 */
function processDate(rawValue, formatHint = "") {
  let inputDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    // Manually parse as local time to avoid UTC offset
    const [y, m, d] = rawValue.split("-").map(Number);
    inputDate = new Date(y, m - 1, d);
  } else {
    inputDate = new Date(rawValue);
  }

  if (isNaN(inputDate)) return rawValue;

  if (/y{2,4}|M{1,4}|d{1,2}/i.test(formatHint)) {
    return applyFormat(inputDate, formatHint);
  }

  const locale = guessLocaleFromExample(formatHint) || siteConfig?.display?.defaultLocale || 'en-US';
  return inputDate.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Apply custom format string (e.g. "MMMM d, yyyy") to a Date object.
 */
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

/**
 * Applies different formsat rules for printing
 */
function printSection(type) {
  // Clear any previous print class
  document.body.classList.remove('printing-notice', 'printing-instructions');

  // Add the correct one
  document.body.classList.add(`printing-${type}`);

  // Wait until next paint, then another small frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
      // Remove print class after print completes
      setTimeout(() => {
        document.body.classList.remove(`printing-${type}`);
      }, 1000);
    });
  });
}


/**
 * Attempts to infer locale formatting style from a sample string.
 */
function guessLocaleFromExample(example) {
  if (/May\s+\d{1,2},\s+\d{4}/i.test(example)) return 'en-US';     // May 21, 2025
  if (/\d{1,2}\s+May\s+\d{4}/i.test(example)) return 'en-GB';       // 21 May 2025
  if (/\d{2}\/\d{2}\/\d{4}/.test(example)) return 'en-US';          // 05/21/2025
  return null;
}

/**
 * Renders a metadata value with optional formatting.
 */
function renderValue(label, value, solo = false, style = "", metaFormat = "") {
  let formattedValue = value;

  if (style === "date") {
    formattedValue = processDate(value, metaFormat || siteConfig?.display?.defaultDateFormat);
  }

  const isHTMLSafe = formattedValue.includes(TM_MARKER);
  const decoded = isHTMLSafe ? formattedValue : decodeHTML(formattedValue);

  return solo
    ? `<strong>${label}:</strong> ${decoded}`
    : `${label}: ${decoded}`;
}

/**
 * Injects Google Fonts based on the config.fonts.googleFonts array.
 */
function enableGoogleFonts(config = siteConfig) {
  if (!config?.fonts?.loadGoogleFonts) return;

  const fonts = config.fonts.googleFonts || [];
  fonts.forEach(font_family => {
    if (!document.querySelector(`link[href*='${font_family}']`)) {
      const link = document.createElement("link");
      link.href = `https://fonts.googleapis.com/css?family=${font_family}`;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
  });
}

/**
 * Dynamically loads an external HTML file into the given DOM element.
 */
function loadHTML(id, url, callback, config = siteConfig) {
  console.log(`Fetching HTML for #${id} from ${url}`);
  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load ${url}`);
      return response.text();
    })
    .then(html => {
      const container = document.getElementById(id);
      if (container) {
        console.log(`Injecting into #${id}`);
        container.innerHTML = html;
        enableGoogleFonts(config);
        if (callback) callback();
      } else {
        console.warn(`No element with id "${id}" found for ${url}`);
      }
    })
    .catch(error => console.error(`Error loading ${url}:`, error));
}


/**
 * Highlights current menu item in header navigation.
 */
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

/**
 * Auto-inserts current year into #footer-year span
 */
function insertFooterYear() {
  const yearSpan = document.getElementById("footer-year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
}

/**
 * Injects build version + timestamp into #build-meta using the provided config.
 * This avoids re-fetching site-config.json unnecessarily.
 */
function insertBuildMetadata(config = siteConfig) {
  const buildMeta = document.getElementById("build-meta");
  if (!buildMeta || !config) return;

  const version = config.buildHash || "(dev)";
  const date = new Date(config.buildDate || Date.now()).toLocaleString();
  buildMeta.textContent = `Version: ${version} – Published: ${date}`;
}

/**
 * Supports dynamic loading of fully responsive site logo
 */
function loadLogoJS() {
  console.log("loadLogoJS() called");
  const logoScript = document.createElement("script");
  logoScript.src = "/scripts/logo.js";
  logoScript.onload = () => console.log("logo.js loaded and running.");
  logoScript.onerror = () => console.warn("Failed to load logo.js");
  document.head.appendChild(logoScript);
}

// ===========================================
// Main bootstrapping entry point
// ===========================================
document.addEventListener("DOMContentLoaded", () => {
  fetch('/site-config.json')
    .then(res => res.json())
    .then(config => {
      window.siteConfig = config;

      console.log("calling loadHTML()");
      loadHTML("site-header", "/header.html", () => {
        highlightActiveMenuItem();
        console.log("calling loadLogoJS() from inside header callback");
        loadLogoJS();
      }, config);

      loadHTML("site-footer", "/footer.html", insertFooterYear, config);

      if (document.getElementById("live-content") && typeof startPublish === "function") {
        startPublish(config);
      }
    })
    .catch(err => {
      console.warn("site-config.json not found or invalid. Using defaults.");
      window.siteConfig = {};
    });
});
