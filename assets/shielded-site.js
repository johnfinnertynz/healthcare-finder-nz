(function () {
  const buttonId = "shielded-logo";
  const shieldedSiteUrl = "https://shielded.co.nz/";

  function ensureButton() {
    if (document.getElementById(buttonId) || !document.body) return;

    const button = document.createElement("a");
    button.id = buttonId;
    button.className = "shielded-site-button";
    button.href = shieldedSiteUrl;
    button.target = "_blank";
    button.rel = "noopener noreferrer";
    button.setAttribute("aria-label", "Open Women's Refuge Shielded Site help");
    button.setAttribute("title", "Open Shielded Site");

    const label = document.createElement("span");
    label.className = "shielded-site-button__text";
    label.textContent = "Shielded Site";

    button.append(label);
    document.body.append(button);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureButton);
  } else {
    ensureButton();
  }
})();
