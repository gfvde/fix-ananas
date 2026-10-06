/*
 * sections/products.jinja behaviour (moved from an inline <script>).
 * Loaded with <script defer> once per section instance, so it must be idempotent:
 * a second copy only calls the registered initAll() again, and each section root is
 * initialised only once (data-section-ready). Re-runs on `content:loaded` for
 * sections injected later (theme editor / AJAX).
 */
(function () {
  // A second copy of this file (section added twice) only re-scans the page.
  if (typeof window.__ananasSection_products === "function") {
    window.__ananasSection_products();
    return;
  }

  function init(section) {
    if (!section || section.getAttribute("data-section-ready") === "true")
      return;
    section.setAttribute("data-section-ready", "true");

    var tabs = section.querySelectorAll("[data-fp-tab]");
    var panels = section.querySelectorAll("[data-fp-panel]");
    var mobileLabel = section.querySelector("[data-fp-mobile-tab-label]");
    var mobilePrev = section.querySelector("[data-fp-mobile-prev]");
    var mobileNext = section.querySelector("[data-fp-mobile-next]");
    var tabOrder = [];

    tabs.forEach(function (tab) {
      var id = tab.getAttribute("data-fp-tab");
      if (id && tabOrder.indexOf(id) === -1) {
        tabOrder.push(id);
      }
    });

    function alignCarousel(panel) {
      var viewport = panel && panel.querySelector(".fp-carousel__viewport");
      if (!viewport) return;

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          // The viewport follows the page direction, so 0 is the start in RTL and LTR
          viewport.scrollLeft = 0;
          updateProgress(panel);
          viewport.classList.add("is-ready");
        });
      });
    }

    function updateProgress(panel) {
      var currentPanel =
        panel || section.querySelector("[data-fp-panel]:not(.is-hidden)");
      if (!currentPanel) return;

      var viewport = currentPanel.querySelector(".fp-carousel__viewport");
      var progress = currentPanel.querySelector(".fp-progress");
      var bar = progress && progress.querySelector(".fp-progress__bar");
      if (!viewport || !progress || !bar) return;

      var maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      var trackWidth = progress.clientWidth;

      if (!trackWidth) return;

      if (maxScroll <= 1) {
        bar.style.width = trackWidth + "px";
        bar.style.transform = "translateX(0px)";
        return;
      }

      var visibleRatio = Math.max(
        0,
        Math.min(1, viewport.clientWidth / viewport.scrollWidth),
      );
      var barWidth = Math.max(32, Math.round(trackWidth * visibleRatio));
      // RTL scrollLeft runs from 0 to -maxScroll; the bar starts at the right
      var scrollRatio = Math.max(
        0,
        Math.min(1, Math.abs(viewport.scrollLeft) / maxScroll),
      );
      var maxTravel = Math.max(0, trackWidth - barWidth);
      var isRTL = getComputedStyle(viewport).direction === "rtl";
      var offset = isRTL ? maxTravel * (1 - scrollRatio) : maxTravel * scrollRatio;

      bar.style.width = barWidth + "px";
      bar.style.transform = "translateX(" + Math.round(offset) + "px)";
    }

    function bindCarouselProgress(panel) {
      var viewport = panel && panel.querySelector(".fp-carousel__viewport");
      if (!viewport || viewport.dataset.fpProgressBound === "true") return;

      viewport.dataset.fpProgressBound = "true";
      viewport.addEventListener(
        "scroll",
        function () {
          updateProgress(panel);
        },
        { passive: true },
      );
    }

    function initDragToScroll(viewport) {
      if (!viewport || viewport.dataset.dragInitialized === "true") return;
      viewport.dataset.dragInitialized = "true";

      var isDown = false;
      var startX;
      var scrollLeft;
      var moved = false;

      viewport.addEventListener("mousedown", function (e) {
        if (e.target.closest("button, a")) return;
        isDown = true;
        moved = false;
        viewport.classList.add("is-dragging");
        startX = e.pageX - viewport.offsetLeft;
        scrollLeft = viewport.scrollLeft;
      });

      viewport.addEventListener("mouseleave", function () {
        if (!isDown) return;
        isDown = false;
        moved = false;
        viewport.classList.remove("is-dragging");
      });

      viewport.addEventListener("mouseup", function (e) {
        if (!isDown) return;
        isDown = false;
        viewport.classList.remove("is-dragging");
        setTimeout(function () {
          moved = false;
        }, 0);
      });

      viewport.addEventListener("mousemove", function (e) {
        if (!isDown) return;
        e.preventDefault();
        var x = e.pageX - viewport.offsetLeft;
        var walk = x - startX;
        if (Math.abs(walk) > 5) {
          moved = true;
        }
        viewport.scrollLeft = scrollLeft - walk;
      });

      // Prevent clicks on links/buttons if we dragged
      viewport.addEventListener(
        "click",
        function (e) {
          if (moved) {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        true,
      );
    }

    panels.forEach(function (panel) {
      var viewport = panel.querySelector(".fp-carousel__viewport");
      if (viewport) {
        initDragToScroll(viewport);
      }
      bindCarouselProgress(panel);
      if (!panel.classList.contains("is-hidden")) {
        alignCarousel(panel);
        updateProgress(panel);
      }
    });

    function setActiveTab(target) {
      tabs.forEach(function (item) {
        var isActive = item.getAttribute("data-fp-tab") === target;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-selected", isActive ? "true" : "false");

        if (isActive && mobileLabel) {
          mobileLabel.textContent = item.textContent.trim();
        }
      });

      panels.forEach(function (panel) {
        var isActive = panel.getAttribute("data-fp-panel") === target;
        panel.classList.toggle("is-hidden", !isActive);
        if (isActive) {
          alignCarousel(panel);
          updateProgress(panel);
        }
      });
    }

    function getActiveIndex() {
      for (var index = 0; index < tabOrder.length; index += 1) {
        var activeTab = section.querySelector(
          '[data-fp-tab="' + tabOrder[index] + '"].is-active',
        );
        if (activeTab) return index;
      }
      return 0;
    }

    function moveMobileTab(step) {
      if (!tabOrder.length) return;
      var isRTL = document.documentElement.dir === "rtl";
      var dir = isRTL ? -step : step;
      var nextIndex =
        (getActiveIndex() + dir + tabOrder.length) % tabOrder.length;
      setActiveTab(tabOrder[nextIndex]);
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        setActiveTab(tab.getAttribute("data-fp-tab"));
      });
    });

    if (mobilePrev) {
      mobilePrev.addEventListener("click", function () {
        moveMobileTab(-1);
      });
    }

    if (mobileNext) {
      mobileNext.addEventListener("click", function () {
        moveMobileTab(1);
      });
    }

    window.addEventListener(
      "resize",
      function () {
        updateProgress();
      },
      { passive: true },
    );

    setTimeout(function () {
      section.querySelectorAll(".fp-carousel__viewport").forEach(function (v) {
        v.classList.add("is-ready");
      });
    }, 600);
  }

  function initAll() {
    document
      .querySelectorAll('[data-section="products"][data-fp-section]')
      .forEach(init);
  }

  window.__ananasSection_products = initAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  window.addEventListener("content:loaded", initAll);
})();
