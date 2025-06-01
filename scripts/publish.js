// ==========================================================
// File: publish.js
// Purpose: Dynamically render document content blocks on index.html
// by reading pre-built JSON files and corresponding meta templates.
// - Respects site-wide configuration via `siteConfig`
// - Supports folder-specific date formats and pinned documents
// - Avoids runtime parsing of HTML content files
// - Allows meta-data to define date formats for each content location.
// ==========================================================

function parseTemplateMetadata(templateHTML) {
  const templateDoc = document.createElement("html");
  templateDoc.innerHTML = templateHTML;

  const metaElements = Array.from(templateDoc.querySelectorAll('meta[name^="doc-"]'));
  const groupedMeta = {};

  metaElements.forEach(meta => {
    const key = meta.getAttribute("name");
    const group = meta.getAttribute("data-group") || null;
    const style = meta.getAttribute("data-style") || null;
    const label = meta.getAttribute("data-label") ||
      key.replace("doc-", "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    const formatHint = meta.getAttribute("content") || "";

    const metaDef = { key, group, style, label, formatHint };
    const target = group || "__solo__";

    if (!groupedMeta[target]) groupedMeta[target] = [];
    groupedMeta[target].push(metaDef);
  });

  return { groupedMeta };
}

/**
 * Renders a single entry block using template definitions and folder context.
 */
function renderContentEntry(entry, groupedMeta, baseFolder) {
  const wrapper = document.createElement("div");
  wrapper.className = "content";
  wrapper.style.position = "relative";

  const enablePin = siteConfig?.display?.enablePushpinIcon ?? true;
  if (enablePin && (entry["doc-pinned"] === "true" || entry["doc-pinned"] === true)) {
    const pin = document.createElement("img");
    pin.src = "/images/pushpin.png";
    pin.alt = "Pinned";
    pin.className = "pinned";
    wrapper.appendChild(pin);
  }

  if (entry["doc-image"]) {
    const img = document.createElement("img");
    img.src = entry["doc-image"];
    img.alt = entry["doc-title"] || "Document Image";
    img.className = "entry-image"; // You can style this
    wrapper.appendChild(img);
  }

  const h2 = document.createElement("h2");
  h2.textContent = entry["doc-title"] || "Untitled";
  wrapper.appendChild(h2);

  // Filter and organize groups
  const filteredGroups = {};
  for (const [group, metas] of Object.entries(groupedMeta)) {
    const subset = metas.filter(({ key }) => key !== "doc-title");
    if (subset.length) filteredGroups[group] = subset;
  }

  Object.entries(filteredGroups).forEach(([groupKey, metas]) => {
    if (groupKey === "__solo__") {
      metas.forEach(({ key, label, style, formatHint }) => {
        if (entry[key]) {
          const p = document.createElement("p");
          p.className = "meta";
          if (style) p.classList.add(style);
          p.innerHTML = renderValue(label, entry[key], true, style, formatHint);
          wrapper.appendChild(p);
        }
      });
    } else {
      const group = document.createElement("div");
      group.className = "meta-group";
      metas.forEach(({ key, label, style, formatHint }) => {
        if (entry[key]) {
          const span = document.createElement("span");
          span.className = "meta";
          if (style) span.classList.add(style);
          span.innerHTML = renderValue(label, entry[key], false, style, formatHint);
          group.appendChild(span);
        }
      });
      wrapper.appendChild(group);
    }
  });

  const link = document.createElement("a");
  link.href = `/${baseFolder}/${entry.filename}`;
  link.textContent = "View Full Document →";
  wrapper.appendChild(link);

  return wrapper;
}

/**
 * Starts the content publishing process by loading the template and entries JSON.
 * Applies filters based on doc-status and siteConfig.mode.publish.
 */
function startPublish(config = siteConfig) {
  const live = document.getElementById("live-content");
  if (!live) return;

  const baseFolder = window.location.pathname.split("/").find(p => p && p !== "index.html") || "content";
  const templatePath = `/${baseFolder}/${baseFolder}_template.html`;
  const jsonPath = `/${baseFolder}/${baseFolder}.json`;

  fetch(templatePath)
    .then(res => res.text())
    .then(templateHTML => {
      const { groupedMeta } = parseTemplateMetadata(templateHTML);
      return fetch(jsonPath)
        .then(res => res.json())
        .then(entries => {
          const mode = config?.mode?.publish || "live";
          let filtered;

          if (mode === "live") {
            filtered = entries.filter(e => e["doc-status"]?.toLowerCase() === "active");
          } else if (mode === "draft") {
            filtered = entries.filter(e => e["doc-status"]?.toLowerCase() === "draft");
          } else {
            filtered = entries; // publish: all
          }

          return { groupedMeta, baseFolder, entries: filtered };
        });
    })
    .then(({ groupedMeta, baseFolder, entries }) => {
      const pinnedContainer = document.getElementById("pinned-content");
      const regularContainer = document.getElementById("regular-content");

      const pinned = entries
        .filter(e => e["doc-pinned"] === "true" || e["doc-pinned"] === true)
        .sort((a, b) => new Date(b["doc-date"]) - new Date(a["doc-date"]));

      const unpinned = entries
        .filter(e => !(e["doc-pinned"] === "true" || e["doc-pinned"] === true))
        .sort((a, b) => new Date(b["doc-date"]) - new Date(a["doc-date"]));

      pinned.forEach(e => pinnedContainer.appendChild(renderContentEntry(e, groupedMeta, baseFolder)));
      unpinned.forEach(e => regularContainer.appendChild(renderContentEntry(e, groupedMeta, baseFolder)));
    })
    .catch(err => {
      live.textContent = "Failed to load content.";
      console.error("startPublish error:", err);
    });
}

