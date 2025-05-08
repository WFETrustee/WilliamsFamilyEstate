// Wait until the entire DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    /**
     * Dynamically load HTML into a given element ID
     * @param {string} id - The ID of the element to inject into
     * @param {string} url - The relative path to the HTML file to load
     */
    function loadHTML(id, url) {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to load ${url}`);
                return response.text();
            })
            .then(html => {
                const container = document.getElementById(id);
                if (container) {
                    container.innerHTML = html;
                    // After inserting the header, apply menu highlighting if applicable
                    if (id === "site-header") {
                        highlightActiveMenuItem();
                    }
                }
            })
            .catch(error => console.error(`Error loading ${url}:`, error));
    }

    /**
     * Highlights the current menu item based on URL
     */
    function highlightActiveMenuItem() {
        const links = document.querySelectorAll("nav ul li a");
        const path = location.pathname.replace(/\/$/, ""); // Strip trailing slash

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

    // Load shared header and footer
    loadHTML("site-header", "/header.html");
    loadHTML("site-footer", "/footer.html");
});
