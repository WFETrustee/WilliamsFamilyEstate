// =============================
// File: publish.js
// =============================

function initPublishing() {
  const pathParts = window.location.pathname.split("/");
  const baseFolder = pathParts.find(part => part && part !== "index.html") || "notices";
  const templatePath = `/${baseFolder}/${baseFolder}_template.html`;

  fetch(templatePath)
    .then(res => res.text())
    .then(templateHTML => {
      const tempDoc = document.createElement("div");
      tempDoc.innerHTML = templateHTML;

      const metaElements = Array.from(tempDoc.querySelectorAll('meta[name^="doc-"]'));
      const groupedMeta = {};

      metaElements.forEach(meta => {
        const name = meta.getAttribute("name");
        const key = name.replace("doc-", "");
        const line = meta.getAttribute("data-line") || null;
        const style = meta.getAttribute("data-style") || null;
        const label = meta.getAttribute("data-label") || key.charAt(0).toUpperCase() + key.slice(1);
        const metaDef = { key, name, line, style, label };

        if (line) {
          if (!groupedMeta[line]) groupedMeta[line] = [];
          groupedMeta[line].push(metaDef);
        } else {
          if (!groupedMeta["__solo__"]) groupedMeta["__solo__"] = [];
          groupedMeta["__solo__"].push(metaDef);
        }
      });

      return fetch(`/${baseFolder}/manifest.json`)
        .then(res => res.json())
        .then(manifest => {
          const filtered = manifest.filter(entry =>
            entry.filename !== "index.html" && entry.filename !== `${baseFolder}_template.html`
          );

          const noticePromises = filtered.map(({ filename, lastModified }) => {
            const cacheKey = `${baseFolder}:${filename}`;
            const cached = localStorage.getItem(cacheKey);
            let cachedData = null;

            if (cached) {
              try {
                cachedData = JSON.parse(cached);
              } catch (e) {
                console.warn(`Failed to parse cached ${cacheKey}`, e);
              }
            }

            if (cachedData && cachedData.lastModified === lastModified) {
              return Promise.resolve(cachedData);
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
                    if (content?.trim()) {
                      data[key] = content;
                    }
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
          });

          return Promise.all(noticePromises).then(notices => {
            const pinnedContainer = document.getElementById("pinned-notices");
            const regularContainer = document.getElementById("regular-notices");

            const valid = notices.filter(n => n);
            const pinned = valid.filter(n => n.pinned === "true" || n.pinned === true)
              .sort((a, b) => new Date(b.date) - new Date(a.date));
            const unpinned = valid.filter(n => !(n.pinned === "true" || n.pinned === true))
              .sort((a, b) => new Date(b.date) - new Date(a.date));

            const renderNotice = n => {
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

              const filteredMetaGroups = {};
              for (const [lineKey, metas] of Object.entries(groupedMeta)) {
                const filtered = metas.filter(({ key }) => key !== "title");
                if (filtered.length) filteredMetaGroups[lineKey] = filtered;
              }

              Object.entries(filteredMetaGroups).forEach(([lineKey, metas]) => {
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
                      span.innerHTML = renderValue(label, n[key], false);
                      if (style) span.className = style;
                      span.style.marginRight = "1.5em";
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
            };

            pinned.forEach(n => pinnedContainer.appendChild(renderNotice(n)));
            unpinned.forEach(n => regularContainer.appendChild(renderNotice(n)));
          });
        });
    })
    .catch(err => {
      const fallback = document.getElementById("live-notices");
      if (fallback) fallback.textContent = `Failed to load ${baseFolder} documents.`;
      console.error("Manifest load error:", err);
    });
}
