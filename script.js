<script>
    const links = document.querySelectorAll("nav ul li a");
    const current = location.pathname.replace(/\/$/, "");

    links.forEach(link => {
        if (link.getAttribute("href") === current || link.getAttribute("href") === current + "/index.html") {
            link.classList.add("active");
        }
    });

    function loadHTML(id, url) {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to load ${url}`);
                return response.text();
            })
            .then(data => {
                document.getElementById(id).innerHTML = data;
            })
            .catch(error => console.error(error));
    }

    loadHTML("site-header", "/header.html");
    loadHTML("site-footer", "/footer.html");

</script>
