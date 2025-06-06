/**
 * ROUTER MODULE: QR-based redirection via ?id=XYZ
 * Uses: /page-routes.json
 */
async function handleQrRedirect() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    console.warn("No ID provided in query string.");
    return;
  }

  try {
    const res = await fetch('/page-routes.json');
    const routes = await res.json();

    if (routes[id]) {
      window.location.href = "/" + routes[id];
    } else {
      document.body.innerText = "Document not found or not certified.";
    }
  } catch (e) {
    console.error("Error loading QR routing table:", e);
    document.body.innerText = "Error loading routing table.";
  }
}

/**
 * ROUTER MODULE: Clean path routing via /folder/ID/
 * Uses: /[folder]/[folder].json
 */
async function handleCleanPathRedirect(folderName) {
  const pathParts = window.location.pathname.split('/').filter(Boolean);

  if (pathParts.length !== 2 || pathParts[0] !== folderName) {
    return; // Not a routed subpath like /notices/ABC123/
  }

  const id = pathParts[1];

  try {
    const res = await fetch(`/${folderName}/${folderName}.json`);
    const manifest = await res.json();

    const entry = manifest.find(doc => doc.identifier === id);

    if (entry) {
      window.location.href = `/${folderName}/${entry.filename}`;
    } else {
      document.body.innerText = "Document not found.";
    }
  } catch (e) {
    console.error(`Failed to load ${folderName} manifest:`, e);
    document.body.innerText = "Error loading manifest.";
  }
}
