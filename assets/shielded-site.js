(function () {
  const buttonId = "shielded-logo";
  const buttonSelector = `#${buttonId}`;
  const embedScriptSrc = "https://staticcdn.co.nz/embed/embed.js";
  let embedRequested = false;
  let initAttempts = 0;

  function ensureButton() {
    if (document.getElementById(buttonId) || !document.body) return;

    const button = document.createElement("a");
    button.id = buttonId;
    button.className = "shielded-site-button";
    button.href = "#";
    button.setAttribute("aria-label", "Open Women's Refuge Shielded Site help");
    button.setAttribute("title", "Open Shielded Site");

    const image = document.createElement("img");
    image.src = "https://shielded.co.nz/img/custom-logo.png";
    image.width = 60;
    image.height = 60;
    image.decoding = "async";
    image.alt = "";

    const label = document.createElement("span");
    label.className = "shielded-site-button__text";
    label.textContent = "Open Women's Refuge Shielded Site help";

    button.append(image, label);
    button.addEventListener("click", function (event) {
      event.preventDefault();
    });
    document.body.append(button);
  }

  function ensureEmbedScript() {
    if (typeof window.ds07o6pcmkorn === "function") return;
    if (embedRequested || document.querySelector(`script[src="${embedScriptSrc}"]`)) return;

    embedRequested = true;
    const script = document.createElement("script");
    script.src = embedScriptSrc;
    script.async = true;
    script.addEventListener("load", initShieldedSite);
    document.head.append(script);
  }

  function initShieldedSite() {
    ensureButton();

    if (window.__careFinderShieldedSiteReady) return;
    ensureEmbedScript();
    if (typeof window.ds07o6pcmkorn !== "function") {
      initAttempts += 1;
      if (initAttempts < 20) window.setTimeout(initShieldedSite, 500);
      return;
    }

    window.__careFinderShieldedSiteReady = true;
    const shieldedSite = new window.ds07o6pcmkorn({
      openElementId: buttonSelector,
      modalID: "modal"
    });
    shieldedSite.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initShieldedSite);
  } else {
    initShieldedSite();
  }

  window.addEventListener("load", initShieldedSite);
})();
