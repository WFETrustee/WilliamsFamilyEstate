// Global list of Google Fonts used across the site
const GOOGLE_FONTS = [
  "Spectral+SC",
  "Playfair+Display",
  "Scope+One"
];

const TM_MARKER = '<span class="tm">&trade;</span>';

// Helper to render values, preserving raw HTML if *tm is detected
function renderValue(label, value) {
  const isHTMLSafe = value.includes(TM_MARKER);
  return `${label}: ${isHTMLSafe ? value : decodeHTML(value)}`;
}

document.addEventListener("DOMContentLoaded", () => {
  function enableGoogleFonts(fonts) {
    const fontList = Array.isArray(fonts) ? fonts : [fonts];
    fontList.forEach(font_family => {
      if (!document.querySelector(`link[href*='${font_family}']`)) {
        const link = document.createElement("link");
        link.href = `https://fonts.googleapis.com/css?family=${font_family}`;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
    });
  }

  function loadHTML(id, url, callback, googleFonts = GOOGLE_FONTS) {
    fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load ${url}`);
        return response.text();
      })
      .then(html => {
        const container = document.getElementById(id);
        if (container) {
          container.innerHTML = html;
          if (googleFonts?.length) enableGoogleFonts(googleFonts);
          if (callback) callback();
        }
      })
      .catch(error => console.error(`Error loading ${url}:`, error));
  }

  function highlightActiveMenuItem() {
    const links = document.querySelectorAll("nav ul li a");
    const path = location.pathname.replace(/\/$/, "");
    links.forEach(link => {
      const href = link.getAttribute("href").replace(/\/$/, "");
      if (href === path || (href.endsWith("index.html") && (path === "" || path === "/index.html"))) {
        link.classList.add("active");
      }
    });
  }

  function insertFooterYear() {
    const yearSpan = document.getElementById("footer-year");
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
  }

  loadHTML("site-header", "/header.html", highlightActiveMenuItem);
  loadHTML("site-footer", "/footer.html", insertFooterYear);

  if (document.getElementById("live-notices")) {
    const pathParts = window.location.pathname.split("/");
    const baseFolder = pathParts.find(part => part && part !== "index.html") || "notices";
    const templatePath = `/${baseFolder}/${baseFolder}_template.html`;

    fetch(templatePath)
      .then(res => res.text())
      .then(templateHTML => {
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

          if (line) {
            // Use actual line value (e.g., "1", "summary", etc.)
            if (!groupedMeta[line]) groupedMeta[line] = [];
            groupedMeta[line].push(metaDef);
          } else {
            // Use fallback "__solo__" if line is missing - means it is the only item in a group
            if (!groupedMeta["__solo__"]) groupedMeta["__solo__"] = [];
            groupedMeta["__solo__"].push(metaDef);
          }
        });

        fetch(`/${baseFolder}/manifest.json`)
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
                  const temp = document.createElement("html");
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

                  localStorage.setItem(cacheKey, JSON.stringify(data));
                  return data;
                })
                .catch(err => {
                  console.warn(`Failed to load ${filename}`, err);
                  return null;
                });
            });

            Promise.all(noticePromises).then(notices => {
              const pinnedContainer = document.getElementById("pinned-notices");
              const regularContainer = document.getElementById("regular-notices");

              const valid = notices.filter(n => n);
              const pinned = valid.filter(n => n.pinned === "true" || n.pinned === true)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
              const unpinned = valid.filter(n => !(n.pinned === "true" || n.pinned === true))
                .sort((a, b) => new Date(b.date) - new Date(a.date));

              const decodeHTML = str => {
                const txt = document.createElement("textarea");
                txt.innerHTML = str;
                return txt.value;
              };

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

                // Filter out the 'title' key from all groupings first
                const filteredMetaGroups = {};
                for (const [lineKey, metas] of Object.entries(groupedMeta)) {
                  const filtered = metas.filter(({ key }) => key !== "title");
                  if (filtered.length) {
                    filteredMetaGroups[lineKey] = filtered;
                  }
                }
                
                // Now render each group
                Object.entries(filteredMetaGroups).forEach(([lineKey, metas]) => {
                  if (lineKey === "__solo__") {
                    // Solo items rendered as separate <p> elements
                    metas.forEach(({ key, label, style }) => {
                      if (n[key]) {
                        const p = document.createElement("p");
                        if (style) p.className = style;
                        //p.innerHTML = `${label}: ${decodeHTML(n[key])}`;
                        p.innerHTML = renderValue(label, n[key]);
                        wrapper.appendChild(p);
                      }
                    });
                  } else {
                    // Grouped items rendered inside a single <div>
                    const group = document.createElement("div");
                    group.className = "meta-group";
                    metas.forEach(({ key, label, style }) => {
                      if (n[key]) {
                        const span = document.createElement("span");
                        //span.innerHTML = `${label}: ${decodeHTML(n[key])}`;
                        span.innerHTML = renderValue(label, n[key]);
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
});
