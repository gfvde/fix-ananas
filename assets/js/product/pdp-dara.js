/**
 * Dara product page behaviour (loaded only by templates/product.jinja).
 *  - Details tabs (desktop) / accordions (mobile) — one DOM per panel
 *  - Rating link opens the reviews tab
 *  - "N people viewing" counter drift
 *  - Gallery zoom button → PhotoSwipe lightbox
 *  - Styling & care guide dialogs with segmented tabs
 */
(function () {
  "use strict";

  const mqDesktop = window.matchMedia("(min-width: 768px)");

  /* ── Tabs / accordions ─────────────────────────────── */
  function activateTab(root, id) {
    root.querySelectorAll("[data-pdp-tab]").forEach((btn) => {
      const on = btn.dataset.pdpTab === id;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    root.querySelectorAll("[data-pdp-panel]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.pdpPanel === id);
    });
  }

  function setOpen(panel, open) {
    panel.classList.toggle("is-open", open);
    panel.querySelector("[data-pdp-acc]")?.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function initTabs() {
    document.querySelectorAll("[data-pdp-tabs]").forEach((root) => {
      if (root.dataset.pdpInit) return;
      root.dataset.pdpInit = "1";
      root.addEventListener("click", (e) => {
        const tabBtn = e.target.closest("[data-pdp-tab]");
        if (tabBtn) {
          activateTab(root, tabBtn.dataset.pdpTab);
          return;
        }
        const acc = e.target.closest("[data-pdp-acc]");
        if (acc) {
          const panel = acc.closest("[data-pdp-panel]");
          if (panel) setOpen(panel, !panel.classList.contains("is-open"));
        }
      });
    });
  }

  function openTab(id) {
    const root = document.querySelector("[data-pdp-tabs]");
    const panel = root?.querySelector(`[data-pdp-panel="${id}"]`);
    if (!root || !panel) return;
    activateTab(root, id);
    setOpen(panel, true);
    const target = mqDesktop.matches ? root : panel;
    const top = target.getBoundingClientRect().top + window.scrollY - 140;
    window.scrollTo({ top, behavior: "smooth" });
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-pdp-open-tab]");
    if (!link || link.closest("#product-quick-view-modal")) return;
    e.preventDefault();
    openTab(link.dataset.pdpOpenTab);
  });

  /* ── Viewers counter ───────────────────────────────── */
  function initViewers() {
    document.querySelectorAll("[data-pdp-viewers]").forEach((el) => {
      if (el.dataset.pdpInit) return;
      el.dataset.pdpInit = "1";
      const out = el.querySelector("[data-pdp-viewers-count]");
      const min = parseInt(el.dataset.min, 10) || 1;
      const max = Math.max(min, parseInt(el.dataset.max, 10) || min);
      if (!out || max === min) return;
      setInterval(() => {
        if (document.hidden) return;
        let n = parseInt(out.textContent, 10) || min;
        n += Math.random() < 0.5 ? -1 : 1;
        out.textContent = String(Math.min(max, Math.max(min, n)));
      }, 7000);
    });
  }

  /* ── Gallery zoom button ───────────────────────────── */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pg-zoom]");
    if (!btn) return;
    e.preventDefault();
    const wrapper = btn.closest(".pg-wrapper[data-gallery-id]");
    const inst = wrapper && window.__pgInstances?.[wrapper.dataset.galleryId];
    const slide = inst?.main?.slides?.[inst.main.activeIndex];
    const trigger = slide?.querySelector("[data-lightbox-trigger]");
    const index = trigger ? parseInt(trigger.dataset.lightboxTrigger, 10) || 0 : 0;
    if (typeof window.openImageLightbox === "function") window.openImageLightbox(index);
  });

  /* ── Guide dialogs ─────────────────────────────────── */
  function initGuides() {
    document.querySelectorAll("dialog[data-pdp-guide]").forEach((dlg) => {
      if (dlg.dataset.pdpInit) return;
      dlg.dataset.pdpInit = "1";
      // Panels can be display:none (closed tab/accordion); render dialogs from <body>
      if (dlg.parentElement !== document.body) document.body.appendChild(dlg);
      dlg.addEventListener("click", (e) => {
        if (e.target === dlg || e.target.closest("[data-pdp-guide-close]")) {
          dlg.close();
          return;
        }
        const seg = e.target.closest("[data-pdp-guide-tab]");
        if (!seg) return;
        const idx = seg.dataset.pdpGuideTab;
        dlg.querySelectorAll("[data-pdp-guide-tab]").forEach((b) => {
          const on = b === seg;
          b.classList.toggle("is-active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        dlg.querySelectorAll("[data-pdp-guide-panel]").forEach((p) => {
          const on = p.dataset.pdpGuidePanel === idx;
          p.classList.toggle("is-active", on);
          p.hidden = !on;
        });
      });
    });
  }

  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-pdp-guide-open]");
    if (!opener) return;
    const dlg = document.getElementById(opener.dataset.pdpGuideOpen);
    if (dlg && typeof dlg.showModal === "function" && !dlg.open) dlg.showModal();
  });

  function init() {
    initTabs();
    initViewers();
    initGuides();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  window.addEventListener("content:loaded", init);
})();
