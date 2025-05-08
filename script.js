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

  // --- Load header and highlight the active menu item ---
  loadHTML("site-header", "/header.html", highlightActiveMenuItem);

  // --- Load footer and insert the current year ---
  loadHTML("site-footer", "/footer.html", insertFooterYear);
});
