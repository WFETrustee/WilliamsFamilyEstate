// =============================
// File: publish.js 
// Purpose: Dynamically render document content blocks on index.html by reading pre-built JSON
// files generated from corresponding *_template.html meta definitions. This avoids live HTML parsing and
// speeds up page loads while maintaining a dynamic, data-driven architecture. Allows meta-data to define
// date formats for each content location.
// =============================

function parseTemplateMetadata(templateHTML) {
  const templateDoc = document.createElement("html");
  templateDoc.innerHTML = templateHTML;

  const metaElements = Array.from(templateDoc.querySelectorAll('meta[name^="doc-"]'));
  const groupedMeta = {};

  metaElements.forEach(meta => {
    const name = meta.getAttribute("name"); // e.g. doc-title
    const key = name; // Keep "doc-title" as-is for direct match with JSON
    const group = meta.getAttribute("data-group") || null;
    const style = meta.getAttribute("data-style") || null;
    const label = meta.getAttribute("data-label") || key.replace("doc-", "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

    const formatHint = meta.getAttribute("content") || "";
    const metaDef = { key, name, group, style, label, formatHint };

    const target = group || "__solo__";
    if (!groupedMeta[target]) groupedMeta[target] = [];
    groupedMeta[target].push(metaDef);
  });

  return { groupedMeta };
}

function renderContentEntry(entry, groupedMeta, baseFolder) {
  const wrapper = document.createElement("div");
  wrapper.className = "notice";
  wrapper.style.position = "relative";

  if (entry["doc-pinned"] === "true" || entry["doc-pinned"] === true) {
    const pin = document.createElement("img");
    pin.src = "/images/pushpin.png";
    pin.alt = "Pinned";
    pin.className = "pinned";
    wrapper.appendChild(pin);
  }

  const h2 = document.createElement("h2");
  h2.textContent = entry["doc-title"] || "Untitled";
  wrapper.appendChild(h2);

  // Exclude doc-title from the metadata display
  const filteredGroups = {};
  for (const [group, metas] of Object.entries(groupedMeta)) {
    const subset = metas.filter(({ key }) => key !== "doc-title");
    if (subset.length) filteredGroups[group] = subset;
  }

  // Render each group of metadata
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

function startPublish() {
  const live = document.getElementById("live-notices");
  if (!live) return;

  const baseFolder = window.location.pathname.split("/").find(p => p && p !== "index.html") || "notice";
  const templatePath = `/${baseFolder}/${baseFolder}_template.html`;
  const jsonPath = `/${baseFolder}/${baseFolder}.json`;

  fetch(templatePath)
    .then(res => res.text())
    .then(templateHTML => {
      const { groupedMeta } = parseTemplateMetadata(templateHTML);
      return fetch(jsonPath)
        .then(res => res.json())
        .then(entries => {
          const mode = (window.siteConfig?.publishMode || "live").toLowerCase();
          const filtered = entries.filter(e => {
            const status = (e["doc-status"] || "").toLowerCase();
            if (mode === "all") return true;
            if (mode === "draft") return status === "draft";
            return status === "active";
          });

          return { groupedMeta, baseFolder, entries: filtered };
        });
    })
    .then(({ groupedMeta, baseFolder, entries }) => {
      const pinnedContainer = document.getElementById("pinned-notices");
      const regularContainer = document.getElementById("regular-notices");

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

}
