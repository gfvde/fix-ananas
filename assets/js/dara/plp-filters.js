/**
 * Dara PLP filters (Figma 11150:17839, dev note 11571:29595).
 *
 * - The toolbar "Filter" arrow collapses / expands the filters like Free People:
 *   desktop sidebar layout → sidebar slides away and the grid widens;
 *   desktop drawer layout  → opens the filters drawer;
 *   mobile, and the desktop "topbar" layout → shows / hides the filter chips row.
 * - Sidebar checkboxes and toggles apply right away.
 * - Filter chips: one dropdown open at a time, × clears that filter.
 *
 * State lives on [data-plp], which sits outside #products-content, so it
 * survives the AJAX swaps done by assets/js/features/product-filter.js.
 */
(function () {
  if (window.__daraPlpFiltersBound) return;
  window.__daraPlpFiltersBound = true;

  var desktop = window.matchMedia("(min-width: 1024px)");
  var STORE_KEY = "dara-plp-filters-open";

  function getRoot(el) {
    return (el && el.closest && el.closest("[data-plp]")) || document.querySelector("[data-plp]");
  }

  function readStored() {
    try {
      return window.sessionStorage.getItem(STORE_KEY);
    } catch (e) {
      return null;
    }
  }

  function store(value) {
    try {
      window.sessionStorage.setItem(STORE_KEY, value);
    } catch (e) {
      /* storage unavailable: state just isn't remembered */
    }
  }

  function mode(root) {
    var layout = root.dataset.plpLayout || "sidebar";
    if (!desktop.matches) return "chips";
    if (layout === "sidebar") return "sidebar";
    if (layout === "drawer") return "drawer";
    return "chips";
  }

  function sync(root) {
    if (!root) return;
    var current = mode(root);
    var expanded =
      current === "sidebar"
        ? root.dataset.plpFiltersOpen !== "false"
        : current === "chips"
          ? root.dataset.plpChipsOpen === "true"
          : false;
    root.querySelectorAll("[data-plp-filter-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-expanded", expanded ? "true" : "false");
      if (current === "sidebar") {
        btn.setAttribute("aria-controls", "plp-filter-sidebar");
      } else {
        btn.removeAttribute("aria-controls");
      }
    });
    var sidebar = root.querySelector(".products-filter-sidebar");
    if (sidebar) {
      var hidden = current === "sidebar" && root.dataset.plpFiltersOpen === "false";
      if (hidden) sidebar.setAttribute("inert", "");
      else sidebar.removeAttribute("inert");
    }
  }

  function openDrawer(root) {
    var trigger = root.querySelector("[data-plp-drawer-source] > button");
    if (trigger) {
      trigger.click();
      return;
    }
    var dialog = document.getElementById("filters-drawer");
    if (dialog && typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
  }

  function closeChips(except) {
    document.querySelectorAll("[data-plp-chip][open]").forEach(function (details) {
      if (details !== except) details.removeAttribute("open");
    });
  }

  function init() {
    document.querySelectorAll("[data-plp]").forEach(function (root) {
      var stored = readStored();
      if (stored === "true" || stored === "false") {
        root.dataset.plpFiltersOpen = stored;
      }
      sync(root);
    });
  }

  document.addEventListener("click", function (event) {
    var toggle = event.target.closest("[data-plp-filter-toggle]");
    if (toggle) {
      var root = getRoot(toggle);
      if (!root) return;
      var current = mode(root);
      if (current === "sidebar") {
        var open = root.dataset.plpFiltersOpen !== "false";
        root.dataset.plpFiltersOpen = open ? "false" : "true";
        store(root.dataset.plpFiltersOpen);
      } else if (current === "drawer") {
        openDrawer(root);
      } else {
        root.dataset.plpChipsOpen = root.dataset.plpChipsOpen === "true" ? "false" : "true";
        if (root.dataset.plpChipsOpen === "false") closeChips(null);
      }
      sync(root);
      return;
    }

    var all = event.target.closest("[data-plp-open-drawer]");
    if (all) {
      closeChips(null);
      openDrawer(getRoot(all));
      return;
    }

    var clear = event.target.closest("[data-plp-chip-clear]");
    if (clear && window.productFilter) {
      var params = {};
      clear.dataset.plpChipClear.split(",").forEach(function (key) {
        params[key.trim()] = null;
      });
      window.productFilter.applyFilter(params);
      return;
    }

    // Click outside an open chip dropdown closes it
    if (!event.target.closest("[data-plp-chip]")) closeChips(null);
  });

  // One chip dropdown open at a time
  document.addEventListener(
    "toggle",
    function (event) {
      var details = event.target;
      if (details && details.matches && details.matches("[data-plp-chip]") && details.open) {
        closeChips(details);
        if (typeof window.initPriceSliders === "function") window.initPriceSliders();
      }
    },
    true
  );

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeChips(null);
  });

  // Sidebar: checkboxes / toggles apply immediately (price and search keep Apply / Enter)
  document.addEventListener("change", function (event) {
    var input = event.target;
    if (!input || !input.matches || !input.matches('input[type="checkbox"]')) return;
    if (!input.closest(".products-filter-sidebar")) return;
    var form = input.form;
    if (!form) return;
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  });

  desktop.addEventListener("change", function () {
    document.querySelectorAll("[data-plp]").forEach(sync);
  });
  window.addEventListener("products-updated", function () {
    document.querySelectorAll("[data-plp]").forEach(sync);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
