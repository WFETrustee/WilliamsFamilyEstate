// utils/load-config.js
const fs = require('fs');

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      typeof source[key] === 'object' &&
      source[key] !== null &&
      !Array.isArray(source[key])
    ) {
      target[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

function loadSiteConfig() {
  const defaultConfig = {
    css: {
      autoOrganize: true,
      allowInlineOverrides: true
    },
    display: {
      defaultDateFormat: "MMMM d, yyyy",
      defaultLocale: "en-US",
      enablePushpinIcon: true
    },
    fonts: {
      loadGoogleFonts: true,
      googleFonts: ["Spectral+SC", "Playfair+Display", "Scope+One"]
    },
    performance: {
      manifestCaching: true
    },
    mode: {
      debug: false,
      publish: "live"
    },
    automation: {
      generateSitemap: true,
      archiveToInternetArchive: true
    }
  };

  try {
    const raw = fs.readFileSync('site-config.json', 'utf-8');
    const parsed = JSON.parse(raw);
    return deepMerge(defaultConfig, parsed);
  } catch (err) {
    console.warn('[CONFIG] site-config.json not found or invalid. Using defaults.');
    return defaultConfig;
  }
}

module.exports = { loadSiteConfig };
