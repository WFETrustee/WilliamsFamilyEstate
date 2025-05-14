// Run when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {

  /**
   * Loads external HTML into a container by ID.
   * Optionally runs a callback function after the content is inserted.
   *
   * @param {string} id - The ID of the container element (e.g. 'site-header').
   * @param {string} url - The URL or path to the HTML file (e.g. '/header.html').
   * @param {function} [callback] - Optional callback to run after load.
   */
  function loadHTML(id, url, callback) {
    fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load ${url}`);
        return response.text();
      })
      .then(html => {
        const container = document.getElementById(id);
        if (container) {
          container.innerHTML = html;
          if (callback) callback(); // run after DOM injection
        }
      })
      .catch(error => console.error(`Error loading ${url}:`, error));
  }

  /**
   * Highlights the currently active menu item in the nav
   * based on the page's pathname.
   */
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

  /**
   * Inserts the current year into the footer
   * by targeting the <span id="footer-year"> placeholder.
   */
  function insertFooterYear() {
    const yearSpan = document.getElementById("footer-year");
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }
  }

// --- Load header and footer and highlight the active menu item ---
  loadHTML("site-header", "/header.html", highlightActiveMenuItem);
  loadHTML("site-footer", "/footer.html", insertFooterYear);


  // --- Dynamic Notice Rendering ---
  if (document.getElementById("live-notices")) {
    fetch("/notices/manifest.json")
      .then(res => res.json())
      .then(filenames => {
        const noticePromises = filenames.map(file =>
          fetch(`/notices/${file}`)
            .then(res => res.text())
            .then(html => {
              const temp = document.createElement("html");
              temp.innerHTML = html;
              const title = temp.querySelector('meta[name="notice-title"]')?.content || "Untitled";
              const date = temp.querySelector('meta[name="notice-date"]')?.content || "0000-00-00";
              const id = temp.querySelector('meta[name="notice-id"]')?.content || "";
              const venue = temp.querySelector('meta[name="notice-venue"]')?.content || "";
              const summary = temp.querySelector('meta[name="notice-summary"]')?.content || "";
              const pinned = temp.querySelector('meta[name="notice-pinned"]')?.content === "true";

              return {
                filename: file,
                title,
                date,
                id,
                venue,
                summary,
                pinned
              };
            })
            .catch(err => {
              console.warn(`Failed to load notice: ${file}`, err);
              return null;
            })
        );

        Promise.all(noticePromises).then(notices => {
          const container = document.getElementById("live-notices");
          container.innerHTML = "";

          const validNotices = notices.filter(n => n);

          validNotices.sort((a, b) => {
            if (a.pinned !== b.pinned) return b.pinned - a.pinned;
            return new Date(b.date) - new Date(a.date);
          });

          validNotices.forEach(n => {
            const wrapper = document.createElement("div");
            wrapper.className = n.pinned ? "notice pinned" : "notice";

            const h2 = document.createElement("h2");
            h2.textContent = n.title;

            const dateDiv = document.createElement("div");
            dateDiv.className = "date";
            dateDiv.textContent = `Published: ${new Date(n.date).toLocaleDateString("en-US", {
              year: "numeric", month: "long", day: "2-digit"
            })}`;

            const venueP = document.createElement("p");
            if (n.venue) {
              venueP.textContent = `Recorded in: ${n.venue}`;
            }

            const summaryP = document.createElement("p");
            summaryP.textContent = n.summary;

            const link = document.createElement("a");
            link.href = `/notices/${n.filename}`;
            link.textContent = "View Full Notice →";

            wrapper.appendChild(h2);
            wrapper.appendChild(dateDiv);
            if (n.venue) wrapper.appendChild(venueP);
            wrapper.appendChild(summaryP);
            wrapper.appendChild(link);
            container.appendChild(wrapper);
          });
        });
      })
      .catch(err => {
        document.getElementById("live-notices").textContent = "Failed to load automated notices.";
        console.error("Manifest load error:", err);
      });
  }
});
