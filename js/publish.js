// =============================
// File: publish.js
// =============================

function parseTemplateMeta(templateHTML) {
  const templateDoc = document.createElement("html");
  templateDoc.innerHTML = templateHTML;

  const metaElements = Array.from(templateDoc.querySelectorAll('meta[name^="doc-"]'));
  const groupedMeta = {};

  metaElements.forEach(meta => {
    const name = meta.getAttribute("name");
    const key = name.replace("doc-", "");
    const line = meta.getAttribute("data-line") || null;
    const style = meta.getAttribute("data-style") || null;
    const label = meta.getAttribute("data-label") || key.charAt(0).toUpperCase() + key.slice(1);
    const metaDef = { key, name, line, style, label };

    const target = line || "__solo__";
    if (!groupedMeta[target]) groupedMeta[target] = [];
    groupedMeta[target].push(metaDef);
  });

  return { metaElements, groupedMeta };
}

function loadManifestEntries(baseFolder) {
  return fetch(`/${baseFolder}/manifest.json`)
    .then(res => res.json())
    .then(manifest =>
      manifest.filter(entry =>
        entry.filename !== "index.html" &&
        entry.filename !== `${baseFolder}_template.html`
      )
    );
}

function loadNoticeMetadata(entry, baseFolder, metaElements) {
  const { filename, lastModified } = entry;
  const cacheKey = `${baseFolder}:${filename}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      const cachedData = JSON.parse(cached);
      if (cachedData.lastModified === lastModified) return Promise.resolve(cachedData);
    } catch (e) {
      console.warn(`Invalid cache for ${cacheKey}`, e);
    }
  }

  return fetch(`/${baseFolder}/${filename}`)
    .then(res => res.text())
    .then(html => {
      const temp = document.createElement("div");
      temp.innerHTML = html;

      const data = { filename, lastModified };
      metaElements.forEach(meta => {
        const name = meta.getAttribute("name");
        const key = name.replace("doc-", "");
        const el = temp.querySelector(`meta[name='${name}']`);
        if (el) {
          let content = el.getAttribute("content");
          if (content?.trim()) data[key] = content;
        }
      });

      if (data.status?.toLowerCase() !== "active") return null;
      localStorage.setItem(cacheKey, JSON.stringify(data));
      return data;
    })
    .catch(err => {
      console.warn(`Failed to load ${filename}`, err);
      return null;
    });
}

function renderNotice(n, groupedMeta, baseFolder) {
  const wrapper = document.createElement("div");
  wrapper.className = "notice";
  wrapper.style.position = "relative";

  if (n.pinned === "true" || n.pinned === true) {
    const pin = document.createElement("img");
    pin.src = "/images/pushpin.png";
    pin.alt = "Pinned";
    pin.style.position = "absolute";
    pin.style.top = "0.5em";
    pin.style.right = "0.5em";
    pin.style.height = "1.25em";
    pin.style.opacity = "0.75";
    wrapper.appendChild(pin);
  }

  const h2 = document.createElement("h2");
  h2.textContent = n.title || "Untitled";
  wrapper.appendChild(h2);

  // Filter 'title' from display
  const filteredGroups = {};
  for (const [line, metas] of Object.entries(groupedMeta)) {
    const subset = metas.filter(({ key }) => key !== "title");
    if (subset.length) filteredGroups[line] = subset;
  }

  Object.entries(filteredGroups).forEach(([lineKey, metas]) => {
    if (lineKey === "__solo__") {
      metas.forEach(({ key, label, style }) => {
        if (n[key]) {
          const p = document.createElement("p");
          if (style) p.className = style;
          p.innerHTML = renderValue(label, n[key], true);
          wrapper.appendChild(p);
        }
      });
    } else {
      const group = document.createElement("div");
      group.className = "meta-group";
      metas.forEach(({ key, label, style }) => {
        if (n[key]) {
          const span = document.createElement("span");
          if (style) span.className = style;
          span.style.marginRight = "1.5em";
          span.innerHTML = renderValue(label, n[key]);
          group.appendChild(span);
        }
      });
      wrapper.appendChild(group);
    }
  });

  const link = document.createElement("a");
  link.href = `/${baseFolder}/${n.filename}`;
  link.textContent = "View Full Document →";
  wrapper.appendChild(link);

  return wrapper;
}

function startPublish() {
  const live = document.getElementById("live-notices");
  if (!live) return;

  const baseFolder = window.location.pathname.split("/").find(p => p && p !== "index.html") || "notices";
  const templatePath = `/${baseFolder}/${baseFolder}_template.html`;

  fetch(templatePath)
    .then(res => res.text())
    .then(templateHTML => {
      const { metaElements, groupedMeta } = parseTemplateMeta(templateHTML);
      return loadManifestEntries(baseFolder).then(entries =>
        Promise.all(entries.map(e => loadNoticeMetadata(e, baseFolder, metaElements)))
          .then(notices => ({ groupedMeta, baseFolder, notices: notices.filter(n => n) }))
      );
    })
    .then(({ groupedMeta, baseFolder, notices }) => {
      const pinnedContainer = document.getElementById("pinned-notices");
      const regularContainer = document.getElementById("regular-notices");

      const pinned = notices.filter(n => n.pinned === "true" || n.pinned === true)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      const unpinned = notices.filter(n => !(n.pinned === "true" || n.pinned === true))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      pinned.forEach(n => pinnedContainer.appendChild(renderNotice(n, groupedMeta, baseFolder)));
      unpinned.forEach(n => regularContainer.appendChild(renderNotice(n, groupedMeta, baseFolder)));
    })
    .catch(err => {
      live.textContent = "Failed to load notice data.";
      console.error("startPublish error:", err);
    });
}
