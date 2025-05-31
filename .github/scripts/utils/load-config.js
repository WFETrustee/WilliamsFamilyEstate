// utils/load-config.js
const fs = require('fs');

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
    }
  };

  try {
    const raw = fs.readFileSync('site-config.json', 'utf-8');
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('[CONFIG] site-config.json not found or invalid. Using defaults.');
    return defaultConfig;
  }
}

module.exports = { loadSiteConfig };
