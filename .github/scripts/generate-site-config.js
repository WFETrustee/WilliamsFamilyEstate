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
const path = require("path");
const { execSync } = require("child_process");

const CONFIG_PATH = path.join(__dirname, "../../site-config.json");

// Step 1: Load existing config or fallback to empty
let config = {};
if (fs.existsSync(CONFIG_PATH)) {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch (err) {
    console.warn("Failed to parse existing site-config.json. Starting fresh.");
  }
}

// Step 2: Inject Git hash and timestamp
let buildHash = "unknown";
try {
  buildHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch (err) {
  console.warn("Git not available. Using fallback version hash.");
}

config.buildHash = buildHash;
config.buildDate = new Date().toISOString();

// Step 3: Write back updated config
fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
console.log(`site-config.json updated with version ${buildHash}`);
