const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { getAllContentFolders } = require("./utils/template-metadata");

const BASE_URL = "https://williamsfamilyestate.org";
const ARCHIVE_URL = "https://web.archive.org/save/";

const folders = getAllContentFolders('.');

(async () => {
  let count = 0;

  for (const folder of folders) {
    const manifestPath = path.join(folder, `${folder}.json`);
    if (!fs.existsSync(manifestPath)) {
      console.warn(`Missing manifest for ${folder}`);
      continue;
    }

    const entries = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    for (const entry of entries) {
      const fullUrl = `${BASE_URL}/${folder}/${entry.filename}`;
      console.log(`📡 Archiving: ${fullUrl}`);

      try {
        const res = await fetch(`${ARCHIVE_URL}${fullUrl}`, { method: "GET" });
        if (res.ok) {
          console.log(`Archived: ${fullUrl}`);
          count++;
        } else {
          console.warn(`Failed to archive ${fullUrl}: ${res.statusText}`);
        }
        // Respect polite usage: Wait 1 sec between calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`Error archiving ${fullUrl}: ${err.message}`);
      }
    }
  }

})();
