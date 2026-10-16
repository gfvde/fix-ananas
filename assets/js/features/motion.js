/**
 * Motion: smooth scrolling (Lenis) and scroll-reveal animations.
 *
 * Both are theme settings (layout.schema.json, group "motion"), passed in
 * window.themeSettings.motion by layout.jinja. Both turn off for
 * prefers-reduced-motion. Content stays visible without JS: the hidden
 * "before" state only applies once html.reveal-on is set here.
 */
import Lenis from "lenis";

const motion = window.themeSettings?.motion || {};
const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ── Smooth scroll ─────────────────────────────────────────────────────────

// Dialogs, drawers, popovers and inner scroll areas keep native scrolling
const NATIVE_SCROLL_SELECTOR = [
  "dialog",
  "el-dialog",
  "[popover]",
  "[data-lenis-prevent]",
  ".overflow-y-auto",
  ".overflow-auto",
  ".overflow-x-auto"
].join(",");

function isScrollLocked() {
  const html = getComputedStyle(document.documentElement).overflow;
  const body = getComputedStyle(document.body).overflow;
  return html === "hidden" || body === "hidden" || document.querySelector("dialog[open]") !== null;
}

function initSmoothScroll() {
  const lenis = new Lenis({
    autoRaf: true,
    lerp: 0.1,
    anchors: true,
    // Lenis checks this per wheel/touch target; also bail while a modal locks the page
    prevent: (node) => isScrollLocked() || Boolean(node?.closest?.(NATIVE_SCROLL_SELECTOR))
  });
  window.themeLenis = lenis;
}

// ── Scroll reveal ─────────────────────────────────────────────────────────

const REVEAL_STYLES = ["fade-up", "fade", "zoom"];
const STAGGER_MS = 70;
const MAX_STAGGER_MS = 420;

let observer = null;

function revealTargets(root) {
  const scope = root || document;
  // Every home/landing section after the first (the first is above the fold)
  const sections = [...scope.querySelectorAll("main > section, main > div > section")].filter(
    (el, i) => !(root ? false : i === 0) && !el.hasAttribute("data-no-reveal")
  );
  // Product cards outside an animated section (listing grids, infinite scroll)
  const cards = [...scope.querySelectorAll(".pc-card")].filter((el) => !el.closest("[data-reveal]"));
  return [...sections, ...cards];
}

function prepare(el) {
  if (el.hasAttribute("data-reveal")) return;
  el.setAttribute("data-reveal", "");
  observer.observe(el);
}

function onIntersect(entries) {
  // Stagger siblings that enter together (a row of cards)
  const byParent = new Map();
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const list = byParent.get(entry.target.parentElement) || [];
    list.push(entry.target);
    byParent.set(entry.target.parentElement, list);
  });
  byParent.forEach((list) => {
    list.forEach((el, i) => {
      el.style.setProperty("--reveal-delay", `${Math.min(i * STAGGER_MS, MAX_STAGGER_MS)}ms`);
      el.classList.add("is-revealed");
      observer.unobserve(el);
    });
  });
}

function initReveal() {
  const style = REVEAL_STYLES.includes(motion.animationStyle) ? motion.animationStyle : "fade-up";
  const duration = Number(motion.animationDuration) || 700;
  const html = document.documentElement;
  html.classList.add("reveal-on", `reveal-${style}`);
  html.style.setProperty("--reveal-duration", `${duration}ms`);

  observer = new IntersectionObserver(onIntersect, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  revealTargets().forEach(prepare);

  // Sections re-rendered by the theme editor, cards added by infinite scroll / quick filters
  const main = document.getElementById("main");
  if (main) {
    new MutationObserver((mutations) => {
      mutations.forEach((m) =>
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches?.("section, .pc-card")) prepare(node);
          revealTargets(node).forEach(prepare);
        })
      );
    }).observe(main, { childList: true, subtree: true });
  }
}

function init() {
  if (reducedMotion) return;
  if (motion.smoothScroll) initSmoothScroll();
  if (motion.scrollAnimations && "IntersectionObserver" in window) initReveal();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
