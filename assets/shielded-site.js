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
    button.referrerPolicy = "no-referrer";
    button.setAttribute("aria-label", "Open Women's Refuge Shielded Site help in a new tab");
    button.setAttribute("title", "Open Shielded Site");

    const image = document.createElement("img");
    image.src = "https://shielded.co.nz/img/custom-logo.png";
    image.width = 60;
    image.height = 60;
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.alt = "";

    const label = document.createElement("span");
    label.className = "shielded-site-button__text";
    label.textContent = "Open Women's Refuge Shielded Site help in a new tab";

    button.append(image, label);
    document.body.append(button);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureButton);
  } else {
    ensureButton();
  }
})();
