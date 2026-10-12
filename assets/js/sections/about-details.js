/*
 * sections/about-details.jinja behaviour (moved from an inline <script>).
 * Loaded with <script defer> once per section instance, so it must be idempotent:
 * a second copy only calls the registered initAll() again, and each section root is
 * initialised only once (data-section-ready). Re-runs on `content:loaded` for
 * sections injected later (theme editor / AJAX).
 */
(function () {
  // A second copy of this file (section added twice) only re-scans the page.
  if (typeof window.__ananasSection_about_details === "function") {
    window.__ananasSection_about_details();
    return;
  }

  function init(section) {
    if (!section || section.getAttribute("data-section-ready") === "true")
      return;
    section.setAttribute("data-section-ready", "true");

    var content = section.querySelector(".about-details__content");
    var viewport = section.querySelector("[data-about-details-viewport]");
    var track = section.querySelector("[data-about-details-track]");
    var nextBtn = section.querySelector("[data-about-details-next]");
    var prevBtn = section.querySelector("[data-about-details-prev]");

    function isDesktop() {
      return window.matchMedia("(min-width: 992px)").matches;
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    /*
     * Dara (note 11423:22480): on desktop the section pins to the top of the screen
     * (sticky) while its product column scrolls; once the products end, the page
     * continues to the next section. The section is made as tall as the pinned
     * frame + the product overflow, the frame is position:sticky, and the page
     * scroll drives the product column. Works with wheel, touchpad, keys and the
     * scrollbar (no wheel hijacking). With "fit screen height" the frame is the
     * viewport height under the header.
     */
    var sticky = section.querySelector(".about-details__sticky");
    var fitScreen = section.getAttribute("data-fit-screen") === "true";
    var pinTop = 0;
    var maxScroll = 0;
    var ticking = false;

    function headerOffset() {
      var header = document.querySelector("header");
      if (!header) return 0;
      var pos = window.getComputedStyle(header).position;
      if (pos !== "sticky" && pos !== "fixed") return 0;
      return Math.max(0, header.getBoundingClientRect().bottom);
    }

    function resetPin() {
      section.classList.remove("is-pinned");
      section.style.height = "";
      if (sticky) {
        sticky.style.height = "";
        sticky.style.top = "";
      }
      if (content) content.scrollTop = 0;
      maxScroll = 0;
    }

    function layoutPin() {
      if (!content || !sticky || !isDesktop()) {
        resetPin();
        return;
      }
      pinTop = headerOffset();
      var frameH = fitScreen
        ? Math.max(480, window.innerHeight - pinTop)
        : parseFloat(window.getComputedStyle(section).getPropertyValue("--about-details-height")) || 650;
      section.classList.add("is-pinned");
      sticky.style.top = pinTop + "px";
      sticky.style.height = frameH + "px";
      maxScroll = Math.max(0, content.scrollHeight - content.clientHeight);
      section.style.height = frameH + maxScroll + "px";
      syncPin();
    }

    function syncPin() {
      ticking = false;
      if (!maxScroll || !section.classList.contains("is-pinned")) return;
      var progress = clamp(pinTop - section.getBoundingClientRect().top, 0, maxScroll);
      content.scrollTop = progress;
    }

    function requestSync() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(syncPin);
    }

    function scrollMobileProduct(direction) {
      if (!track || isDesktop()) return;
      var cards = Array.prototype.slice.call(
        track.querySelectorAll(".about-details__product"),
      );
      if (!cards.length) return;

      var current = cards.findIndex(function (card) {
        return card.getBoundingClientRect().top > 80;
      });
      if (current < 0) current = cards.length - 1;
      var target = clamp(current + direction, 0, cards.length - 1);
      cards[target].scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (nextBtn)
      nextBtn.addEventListener("click", function () {
        scrollMobileProduct(1);
      });
    if (prevBtn)
      prevBtn.addEventListener("click", function () {
        scrollMobileProduct(-1);
      });

    function setHeaderOffset() {
      var header = document.querySelector("header");
      var h = header ? header.getBoundingClientRect().bottom : 96;
      document.documentElement.style.setProperty("--header-height", h + "px");
    }
    setHeaderOffset();
    window.addEventListener("resize", setHeaderOffset);

    layoutPin();
    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", layoutPin);
    window.addEventListener("load", layoutPin);
    // Product images load late and change the column height
    section.querySelectorAll("img").forEach(function (img) {
      if (!img.complete) img.addEventListener("load", layoutPin, { once: true });
    });
  }

  function initAll() {
    document
      .querySelectorAll(
        '[data-section="about-details"][data-about-details-sticky]',
      )
      .forEach(init);
  }

  window.__ananasSection_about_details = initAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  window.addEventListener("content:loaded", initAll);
})();
