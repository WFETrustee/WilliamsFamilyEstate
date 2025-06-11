/**
 * ==============================================================================
 * File: generate-site-config.js
 * Purpose: Generates a fresh site-config.json file at build time, embedding
 *          the Git commit hash and timestamp. This enables cache-busting,
 *          versioning, audit trails, and runtime awareness across the Trust system.
 *
 * Usage: Called from update-site.yml as part of the site metadata automation.
 * Output: site-config.json written to the root directory of the repo.
 * Dependencies:
 *   - Assumes Git is available in the environment (for commit hash)
 * ==============================================================================
 */

const fs = require("fs");
const { execSync } = require("child_process");

// Attempt to get current short Git commit hash for tracking + caching
let buildHash = "unknown";
try {
  buildHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch (err) {
  console.warn("Could not resolve Git hash. Using fallback.");
}

// Compose site-wide configuration object
const config = {
  siteName: "Williams Family Estate",
  domain: "williamsfamilyestate.org",
  buildHash,
  buildDate: new Date().toISOString(),
  automation: {
    generateSitemap: true // can be toggled off by workflows or override logic
  }
};

// Write to root-level config file
fs.writeFileSync("site-config.json", JSON.stringify(config, null, 2));
console.log(`site-config.json written with version ${buildHash}`);
