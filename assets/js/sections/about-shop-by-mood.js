/*
 * sections/about-shop-by-mood.jinja behaviour (moved from an inline <script>).
 * Loaded with <script defer> once per section instance, so it must be idempotent:
 * a second copy only calls the registered initAll() again, and each section root is
 * initialised only once (data-section-ready). Re-runs on `content:loaded` for
 * sections injected later (theme editor / AJAX).
 */
(function () {
  // A second copy of this file (section added twice) only re-scans the page.
  if (typeof window.__ananasSection_about_shop_by_mood === "function") {
    window.__ananasSection_about_shop_by_mood();
    return;
  }

  function init(s) {
    if (!s || s.getAttribute("data-section-ready") === "true") return;
    s.setAttribute("data-section-ready", "true");
    var track = s.querySelector("[data-sbm-track]"),
      thumb = s.querySelector("[data-sbm-thumb]"),
      prev = s.querySelector("[data-sbm-prev]"),
      next = s.querySelector("[data-sbm-next]");
    if (!track) return;
    var cards = track.querySelectorAll(".sbm-mob-card");
    if (!cards.length) return;
    function updateThumb() {
      if (!thumb) return;
      var max = track.scrollWidth - track.clientWidth;
      if (max <= 0) {
        thumb.style.width = "100%";
        thumb.style.right = "0";
        return;
      }
      var pos = Math.abs(track.scrollLeft),
        ratio = pos / max,
        tw = (track.clientWidth / track.scrollWidth) * 100;
      thumb.style.width = tw + "%";
      thumb.style.right = ratio * (100 - tw) + "%";
    }
    function scroll(dir) {
      var w = cards[0].offsetWidth + 16;
      var isRTL = document.documentElement.dir === "rtl";
      var amount = isRTL ? (dir === "next" ? -w : w) : dir === "next" ? w : -w;
      track.scrollBy({ left: amount, behavior: "smooth" });
    }
    if (prev)
      prev.addEventListener("click", function () {
        scroll("prev");
      });
    if (next)
      next.addEventListener("click", function () {
        scroll("next");
      });
    track.addEventListener("scroll", updateThumb, { passive: true });
    window.addEventListener("resize", updateThumb);
    setTimeout(updateThumb, 100);
  }

  function initAll() {
    document
      .querySelectorAll('[data-section="about-shop-by-mood"].sbm-section')
      .forEach(init);
  }

  window.__ananasSection_about_shop_by_mood = initAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  window.addEventListener("content:loaded", initAll);
})();
