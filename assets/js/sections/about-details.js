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

    function shouldLockPageScroll(event) {
      if (!content || !isDesktop()) return false;

      var maxScroll = content.scrollHeight - content.clientHeight;
      if (maxScroll <= 0) return false;

      var goingDown = event.deltaY > 0;
      var goingUp = event.deltaY < 0;
      var canScrollDown = content.scrollTop < maxScroll - 1;
      var canScrollUp = content.scrollTop > 1;

      return (goingDown && canScrollDown) || (goingUp && canScrollUp);
    }

    function handleDesktopWheel(event) {
      if (!shouldLockPageScroll(event)) return;
      event.preventDefault();
      content.scrollTop += event.deltaY;
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

    section.addEventListener("wheel", handleDesktopWheel, { passive: false });
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
