// Global list of Google Fonts used across the site
const GOOGLE_FONTS = [
  "Spectral+SC",
  "Playfair+Display",
  "Scope+One"
];

// Run when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  /** Enables Google Fonts */
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

  /** Loads external HTML */
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

  /** Highlights active nav item */
  function highlightActiveMenuItem() {
    const links = document.querySelectorAll("nav ul li a");
    const path = location.pathname.replace(/\/$/, "");
    links.forEach(link => {
      const href = link.getAttribute("href").replace(/\/$/, "");
      if (
        href === path ||
        (href.endsWith("index.html") && (path === "" || path === "/index.html"))
      ) {
        link.classList.add("active");
      }
    });
  }

  /** Sets current year in footer */
  function insertFooterYear() {
    const yearSpan = document.getElementById("footer-year");
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
  }

  // Load layout
  loadHTML("site-header", "/header.html", highlightActiveMenuItem);
  loadHTML("site-footer", "/footer.html", insertFooterYear);

  /** Parse metadata depending on folder */
  function parseMetadata(html, folder) {
    const temp = document.createElement("html");
    temp.innerHTML = html;

    switch (folder) {
      case "emergency":
        return {
          title: temp.querySelector('meta[name="emergency-title"]')?.content || "Untitled Emergency",
          date: temp.querySelector('meta[name="emergency-date"]')?.content || "0000-00-00",
          id: temp.querySelector('meta[name="emergency-id"]')?.content || "",
          venue: "Emergency Registry",
          summary: temp.querySelector('meta[name="emergency-summary"]')?.content || "",
          pinned: false
        };
      case "notices":
      default:
        return {
          title: temp.querySelector('meta[name="notice-title"]')?.content || "Untitled",
          date: temp.querySelector('meta[name="notice-date"]')?.content || "0000-00-00",
          id: temp.querySelector('meta[name="notice-id"]')?.content || "",
          venue: temp.querySelector('meta[name="notice-venue"]')?.content || "",
          summary: temp.querySelector('meta[name="notice-summary"]')?.content || "",
          pinned: temp.querySelector('meta[name="notice-pinned"]')?.content?.toLowerCase() === "true"
        };
    }
  }

  // Handle dynamic notice rendering
  if (document.getElementById("live-notices")) {
    const pathParts = window.location.pathname.split("/");
    const baseFolder = pathParts.find(part => part === "notices" || part === "emergency") || "notices";

    fetch(`/${baseFolder}/manifest.json`)
      .then(res => res.json())
      .then(manifest => {
        const filtered = manifest.filter(entry =>
          entry.filename !== "index.html" &&
          entry.filename !== "Notice_Template.html" &&
          entry.filename !== "Emergency_Template.html"
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
              const meta = parseMetadata(html, baseFolder);
              const noticeData = {
                filename,
                ...meta,
                lastModified
              };
              localStorage.setItem(cacheKey, JSON.stringify(noticeData));
              return noticeData;
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
          const pinned = valid.filter(n => n.pinned).sort((a, b) => new Date(b.date) - new Date(a.date));
          const unpinned = valid.filter(n => !n.pinned).sort((a, b) => new Date(b.date) - new Date(a.date));

          const renderNotice = n => {
            const wrapper = document.createElement("div");
            wrapper.className = "notice";
            wrapper.style.position = "relative";

            if (n.pinned) {
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
            h2.textContent = n.title;

            const dateDiv = document.createElement("div");
            dateDiv.className = "date";
            dateDiv.textContent = `Published: ${new Date(n.date).toLocaleDateString(undefined, {
              year: "numeric", month: "long", day: "2-digit"
            })}${n.pinned ? " (pinned)" : ""}`;

            const venueP = document.createElement("p");
            venueP.textContent = `Recorded in: ${n.venue}`;

            const summaryP = document.createElement("p");
            summaryP.textContent = n.summary;

            const link = document.createElement("a");
            link.href = `/${baseFolder}/${n.filename}`;
            link.textContent = "View Full Document →";

            wrapper.appendChild(h2);
            wrapper.appendChild(dateDiv);
            wrapper.appendChild(venueP);
            wrapper.appendChild(summaryP);
            wrapper.appendChild(link);

            return wrapper;
          };

          pinned.forEach(n => pinnedContainer.appendChild(renderNotice(n)));
          unpinned.forEach(n => regularContainer.appendChild(renderNotice(n)));
        });
      })
      .catch(err => {
        const fallback = document.getElementById("live-notices");
        if (fallback) fallback.textContent = `Failed to load ${baseFolder} documents.`;
        console.error("Manifest load error:", err);
      });
  }
});
