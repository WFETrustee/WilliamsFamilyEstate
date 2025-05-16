// Run when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  /**
   * Loads external HTML into a container by ID.
   * Optionally runs a callback after insertion.
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
          if (callback) callback();
        }
      })
      .catch(error => console.error(`Error loading ${url}:`, error));
  }

  /**
   * Highlights the current page in the main nav menu.
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
   * Replaces span#footer-year with the current year.
   */
  function insertFooterYear() {
    const yearSpan = document.getElementById("footer-year");
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }
  }

  // Load header/footer and activate menu
  loadHTML("site-header", "/header.html", highlightActiveMenuItem);
  loadHTML("site-footer", "/footer.html", insertFooterYear);

  // Handle dynamic rendering of public notices
  if (document.getElementById("live-notices")) {
    fetch("/notices/manifest.json")
      .then(res => res.json())
      .then(filenames => {
        const filtered = filenames.filter(f => f !== "index.html" && f !== "Notice_Template.html");

        const noticePromises = filtered.map(file =>
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
              const pinnedContent = temp.querySelector('meta[name="notice-pinned"]')?.content || "false";
              const pinned = pinnedContent.toLowerCase() === "true";

              return {
                filename: file,
                title,
                date,
                id,
                venue,
                summary,
                pinned,
                lastModified: new Date().toISOString() // Replace with real hash or timestamp in manifest
              };
            })
            .catch(err => {
              console.warn(`Failed to load notice: ${file}`, err);
              return null;
            })
        );

        Promise.all(noticePromises).then(notices => {
          const pinnedContainer = document.getElementById("pinned-notices");
          const regularContainer = document.getElementById("regular-notices");

          const valid = notices.filter(n => n);
          const pinned = valid.filter(n => n.pinned).sort((a, b) => new Date(b.date) - new Date(a.date));
          const unpinned = valid.filter(n => !n.pinned).sort((a, b) => new Date(b.date) - new Date(a.date));

          const renderNotice = n => {
            const wrapper = document.createElement("div");
            wrapper.className = "notice";
            wrapper.style.position = "relative"; // make sure child pin icon can absolutely position
            
            if (n.pinned) {
              const pin = document.createElement("img");
              pin.src = "pushpin.png";
              pin.alt = "Pinned";
              pin.style.position = "absolute";
              pin.style.top = "0.5em";
              pin.style.right = "0.5em";
              pin.style.height = "1.25em";
              pin.style.opacity = "0.75"; // optional styling
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
            link.href = `/notices/${n.filename}`;
            link.textContent = "View Full Notice →";

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
        document.getElementById("live-notices").textContent = "Failed to load automated notices.";
        console.error("Manifest load error:", err);
      });
  }
});
