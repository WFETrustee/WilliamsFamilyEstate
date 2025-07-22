// ==========================================================
// File: publish.js
// Purpose: Dynamically render document content blocks on index.html
// by reading pre-built JSON files and corresponding meta templates.
// - Respects site-wide configuration via `siteConfig`
// - Supports folder-specific date formats and pinned documents
// - Avoids runtime parsing of HTML content files
// - Allows meta-data to define date formats for each content location.
// - Respects the declarative metadata defined in each template,
// - Allows us to keep document rendering structured, predictable, and
//     easily styled later via CSS without hardcoding anything.
// - Busts cache issues when publishing new content
// ==========================================================

function parseTemplateMetadata(templateHTML) {
  // Parse the template into a DOM object so we can extract all metadata <meta> tags
  const templateDoc = document.createElement("html");
  templateDoc.innerHTML = templateHTML;

  // Look for all meta fields that follow our custom doc-* naming convention
  const metaElements = Array.from(templateDoc.querySelectorAll('meta[name^="doc-"]'));
  const groupedMeta = {};

  metaElements.forEach(meta => {
    const key = meta.getAttribute("name");                   // actual field name (e.g., doc-author)
    const group = meta.getAttribute("data-group") || null;   // optional visual grouping for layout
    const style = meta.getAttribute("data-style") || null;   // optional style hint
    const label = meta.getAttribute("data-label") ||         // human-readable label override
      key.replace("doc-", "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    const formatHint = meta.getAttribute("content") || "";   // used for date formats etc.

    // This is the magic line that creates a CSS-friendly class from our doc-* field
    const className = key.replace("doc-", "meta-").toLowerCase();

    const metaDef = { key, group, style, label, formatHint, className };
    const target = group || "__solo__";

    if (!groupedMeta[target]) groupedMeta[target] = [];
    groupedMeta[target].push(metaDef); // push each field into its logical display group
  });

  return { groupedMeta };
}

function renderContentEntry(entry, groupedMeta, baseFolder) {
  // Start assembling the visual block
  const wrapper = document.createElement("div");
  wrapper.className = "content";
  wrapper.style.position = "relative";

  // If this doc is pinned, show a pushpin icon
  const enablePin = siteConfig?.display?.enablePushpinIcon ?? true;
  if (enablePin && (entry["doc-pinned"] === "true" || entry["doc-pinned"] === true)) {
    const pin = document.createElement("img");
    pin.src = "/images/pushpin.png";
    pin.alt = "Pinned";
    pin.className = "pinned";
    wrapper.appendChild(pin);
  }

  // Optional document image (e.g. a preview or illustration)
  if (entry["doc-image"]) {
    const img = document.createElement("img");
    img.src = entry["doc-image"];
    img.alt = entry["doc-title"] || "Document Image";
    img.className = "content-image"; // styling handled in CSS
    wrapper.appendChild(img);
  }

  // Main title of the document
  const h2 = document.createElement("h2");
  h2.textContent = entry["doc-title"] || "Untitled";
  wrapper.appendChild(h2);

  // Now prepare all the meta fields (besides title) and group them accordingly
  const filteredGroups = {};
  for (const [group, metas] of Object.entries(groupedMeta)) {
    const subset = metas.filter(({ key }) => key !== "doc-title");
    if (subset.length) filteredGroups[group] = subset;
  }

  // Render all metadata fields into either grouped spans or standalone paragraphs
  Object.entries(filteredGroups).forEach(([groupKey, metas]) => {
    if (groupKey === "__solo__") {
      // Fields that stand on their own (not in a group container)
      metas.forEach(({ key, label, style, formatHint, className }) => {
        if (entry[key]) {
          const p = document.createElement("p");
          p.classList.add("meta", className); // Assign both default + unique CSS class
          if (style) p.classList.add(style);  // Extra class if template requested it
          p.innerHTML = renderValue(label, entry[key], true, style, formatHint);
          wrapper.appendChild(p);
        }
      });
    } else {
      // Fields grouped into horizontal lines (spans inside div)
      const group = document.createElement("div");
      group.className = "meta-group";
      metas.forEach(({ key, label, style, formatHint, className }) => {
        if (entry[key]) {
          const span = document.createElement("span");
          span.classList.add("meta", className);
          if (style) span.classList.add(style);
          span.innerHTML = renderValue(label, entry[key], false, style, formatHint);
          group.appendChild(span);
        }
      });
      wrapper.appendChild(group);
    }
  });

  // Link to the full document file (HTML version)
  const link = document.createElement("a");
  link.href = `/${baseFolder}/${entry.filename}`;
  link.textContent = "View Full Document →";
  wrapper.appendChild(link);

  return wrapper;
}

/**
 * ============================================================================
 * Function: startPublish
 * Purpose: Dynamically loads the site config and uses its version hash to
 *          cache-bust fetches for manifest and template files. Ensures that
 *          the content index reflects the correct Git build version and avoids
 *          serving stale JSON or templates from browser or CDN cache.
 * ============================================================================
 */
function startPublish(config = siteConfig) {
  const live = document.getElementById("live-content");
  if (!live) return;

  // Determine which folder we're currently viewing (e.g. "notices", "minutes", etc.)
  const baseFolder = window.location.pathname.split("/").find(p => p && p !== "index.html") || "content";

  // Step 1: Load site-config.json to get buildHash (used for cache-busting)
  fetch("/site-config.json")
    .then(res => res.json())
    .then(siteCfg => {
      const version = siteCfg.buildHash || Date.now(); // fallback to timestamp if Git hash missing

      // Construct full paths to manifest and template files with cache-busting query param
      const templatePath = `/${baseFolder}/${baseFolder}_template.html?v=${version}`;
      const jsonPath = `/${baseFolder}/${baseFolder}.json?v=${version}`;

      // Step 2: Fetch both template and manifest JSON in parallel
      return Promise.all([
        fetch(templatePath).then(res => res.text()),
        fetch(jsonPath).then(res => res.json()),
        Promise.resolve(version) // pass version down for optional future use
      ]);
    })
    .then(([templateHTML, entries, version]) => {
      const { groupedMeta } = parseTemplateMetadata(templateHTML);

      // Only show documents matching the current publish mode
      const mode = config?.mode?.publish || "live";
      let filtered;

      if (mode === "live") {
        filtered = entries.filter(e => e["doc-status"]?.toLowerCase() === "active");
      } else if (mode === "draft") {
        filtered = entries.filter(e => e["doc-status"]?.toLowerCase() === "draft");
      } else {
        filtered = entries; // fallback: publish everything
      }

      return { groupedMeta, baseFolder, entries: filtered };
    })
    .then(({ groupedMeta, baseFolder, entries }) => {
      const pinnedContainer = document.getElementById("pinned-content");
      const regularContainer = document.getElementById("regular-content");

      const pinned = entries
        .filter(e => e["doc-pinned"] === "true" || e["doc-pinned"] === true)
        //this new sort logic is to avoid the UTC date calculation which was printing the previous day's date
        .sort((a, b) => {
          const parseLocalDate = str => {
            const [y, m, d] = str.split("-").map(Number);
            return new Date(y, m - 1, d); // Local midnight
          };
          return parseLocalDate(b["doc-date"]) - parseLocalDate(a["doc-date"]);
        });


      const unpinned = entries
        .filter(e => !(e["doc-pinned"] === "true" || e["doc-pinned"] === true))
        .sort((a, b) => {
          const parseLocalDate = str => {
            const [y, m, d] = str.split("-").map(Number);
            return new Date(y, m - 1, d); // Local midnight
          };
          return parseLocalDate(b["doc-date"]) - parseLocalDate(a["doc-date"]);
        });

      pinned.forEach(e => pinnedContainer.appendChild(renderContentEntry(e, groupedMeta, baseFolder)));
      unpinned.forEach(e => regularContainer.appendChild(renderContentEntry(e, groupedMeta, baseFolder)));
    })
    .catch(err => {
      live.textContent = "Failed to load content.";
      console.error("startPublish error:", err);
    });
}
