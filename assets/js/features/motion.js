/**
 * Motion & animations (layout.schema.json, group "motion").
 *
 * Every effect is a theme setting passed in window.themeSettings.motion by
 * layout.jinja, and each one adds an html.mo-<name> class that the CSS in
 * assets/css/motion.css keys off. Rules of the road:
 * - nothing runs for prefers-reduced-motion;
 * - effects use the individual translate/scale/rotate properties, so they
 *   never overwrite a transform an element already has;
 * - hidden "before" states only exist once this script has added the class,
 *   and anything in the viewport band is revealed even when a carousel keeps
 *   it off-screen sideways (an IntersectionObserver alone never fires there);
 * - pointer-only effects (cursor, magnetic, tilt, swap) need a fine pointer.
 */
import Lenis from "lenis";

const motion = window.themeSettings?.motion || {};
const html = document.documentElement;
const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
const inFrame = window.top !== window; // theme editor preview

const flag = (name) => html.classList.add(`mo-${name}`);
const mainEl = () => document.getElementById("main") || document.querySelector("main");
const sections = () => {
  const main = mainEl();
  return main ? [...main.querySelectorAll(":scope > section, :scope > div > section")] : [];
};
const ownTransformFree = (el) => {
  const cs = getComputedStyle(el);
  return cs.transform === "none" && cs.position !== "absolute" && cs.position !== "fixed";
};

// ── Shared reveal: IntersectionObserver + viewport-band fallback ─────────

const REVEAL_STYLES = ["fade-up", "fade", "zoom", "sides"];
const STAGGER_MS = 70;
const MAX_STAGGER_MS = 420;
const pending = new Set();
let observer = null;

function reveal(el, i = 0) {
  el.style.setProperty("--reveal-delay", `${Math.min(i * STAGGER_MS, MAX_STAGGER_MS)}ms`);
  el.classList.add("is-revealed");
  pending.delete(el);
  observer?.unobserve(el);
}

function watch(el, attr = "data-reveal") {
  if (!el || el.hasAttribute(attr)) return;
  el.setAttribute(attr, "");
  pending.add(el);
  observer.observe(el);
}

function onIntersect(entries) {
  const byParent = new Map();
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const list = byParent.get(entry.target.parentElement) || [];
    list.push(entry.target);
    byParent.set(entry.target.parentElement, list);
  });
  byParent.forEach((list) => list.forEach((el, i) => reveal(el, i)));
}

// Carousels clip their slides sideways and hidden tabs have no height: reveal
// whatever sits in the vertical viewport band
function revealBand() {
  const limit = innerHeight * 0.92;
  pending.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.top < limit && r.bottom > 0) reveal(el);
  });
}

function initRevealCore() {
  observer = new IntersectionObserver(onIntersect, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  let ticking = false;
  addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        revealBand();
        ticking = false;
      });
    },
    { passive: true }
  );
  // Tabs and drawers change layout without scrolling
  document.addEventListener("click", () => setTimeout(revealBand, 60), true);
  setTimeout(revealBand, 400);
}

// Sections after the first, and listing cards outside an animated section
function prepSectionsAndCards(root) {
  const all = sections();
  all.slice(1).forEach((s, i) => {
    if (s.hasAttribute("data-no-reveal")) return;
    s.style.setProperty("--reveal-x", `${i % 2 ? -48 : 48}px`);
    watch(s);
  });
  (root || document).querySelectorAll(".pc-card").forEach((card) => {
    if (!card.closest("main") || card.closest("[data-reveal]")) return;
    watch(card);
  });
}

function prepTitles() {
  sections()
    .slice(1)
    .forEach((s) =>
      s.querySelectorAll("h2, h3[class*='title']").forEach((h) => {
        if (h.hasAttribute("data-mo-words") || h.children.length || !h.textContent.trim()) return;
        const parts = h.textContent.trim().split(/(\s+)/);
        let n = 0;
        h.innerHTML = parts
          .map((w) => (/^\s+$/.test(w) ? w : `<span class="mo-word" style="--i:${n++}">${w}</span>`))
          .join("");
        h.setAttribute("data-mo-words", "");
        watch(h, "data-mo-reveal");
      })
    );
}

function sectionImages() {
  const hero = sections()[0];
  const out = [];
  sections().forEach((s) => {
    if (s === hero) return;
    s.querySelectorAll("img").forEach((img) => {
      if (img.closest(".pc-card") || img.classList.contains("pc-img-alt")) return;
      if (!ownTransformFree(img)) return;
      out.push(img);
    });
  });
  return out;
}

function prepImageReveal(imgs) {
  imgs.forEach((img) => {
    if (img.hasAttribute("data-mo-img")) return;
    if ((img.parentElement?.getBoundingClientRect().width || 0) < 100) return;
    img.setAttribute("data-mo-img", "");
    const parent = img.parentElement;
    if (parent && getComputedStyle(parent).overflow === "visible") parent.style.overflow = "hidden";
    watch(img, "data-mo-reveal");
  });
}

// ── Scroll-driven effects ────────────────────────────────────────────────

function initScrollEffects() {
  const bar = motion.scrollProgress ? document.createElement("div") : null;
  if (bar) {
    bar.className = "mo-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
  }
  const header = motion.headerAutohide ? document.getElementById("ananas-header") : null;
  const parallaxImgs = motion.imageParallax ? sectionImages() : [];
  parallaxImgs.forEach((img) => img.setAttribute("data-mo-par", ""));
  const skewImgs = motion.scrollSkew ? sectionImages() : [];
  skewImgs.forEach((img) => img.setAttribute("data-mo-skew", ""));

  if (!bar && !header && !parallaxImgs.length && !skewImgs.length) return;

  let lastY = scrollY;
  let skew = 0;
  let queued = false;

  function frame() {
    queued = false;
    const y = scrollY;
    if (bar) {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty("--mo-progress", max > 0 ? (y / max).toFixed(4) : "0");
    }
    if (header) {
      const menuOpen = document.querySelector("dialog[open], el-dialog [open]");
      header.classList.toggle("mo-header-scrolled", y > 20);
      if (!menuOpen && y > 220 && y > lastY + 2) header.classList.add("mo-header-hidden");
      else if (y < lastY - 2 || y <= 220) header.classList.remove("mo-header-hidden");
    }
    parallaxImgs.forEach((img) => {
      const r = img.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      img.style.setProperty("--mo-py", `${(p * -36).toFixed(1)}px`);
    });
    lastY = y;
  }
  addEventListener(
    "scroll",
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(frame);
      }
    },
    { passive: true }
  );
  frame();

  if (skewImgs.length) {
    let prev = scrollY;
    (function tick() {
      const v = scrollY - prev;
      prev = scrollY;
      skew += (Math.max(-5, Math.min(5, v * 0.12)) - skew) * 0.15;
      html.style.setProperty("--mo-skew", `${skew.toFixed(2)}deg`);
      requestAnimationFrame(tick);
    })();
  }
}

// ── Smooth scroll ────────────────────────────────────────────────────────

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
  const htmlOverflow = getComputedStyle(document.documentElement).overflow;
  const bodyOverflow = getComputedStyle(document.body).overflow;
  return htmlOverflow === "hidden" || bodyOverflow === "hidden" || document.querySelector("dialog[open]") !== null;
}

// Any element that scrolls on its own (drawers, mega menus, filter lists,
// quick view) keeps native scrolling, whatever its class names are
function inScrollableArea(node) {
  for (let el = node; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    if (el.nodeType !== 1) continue;
    const cs = getComputedStyle(el);
    if (
      /(auto|scroll|overlay)/.test(cs.overflowY + cs.overflowX) &&
      (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
    ) {
      return true;
    }
  }
  return false;
}

function initSmoothScroll() {
  window.themeLenis = new Lenis({
    autoRaf: true,
    lerp: 0.1,
    anchors: true,
    prevent: (node) => isScrollLocked() || Boolean(node?.closest?.(NATIVE_SCROLL_SELECTOR)) || inScrollableArea(node)
  });
}

// ── Small effects ────────────────────────────────────────────────────────

function initImageShimmer() {
  document.querySelectorAll("main img").forEach((img) => {
    if (img.complete) return;
    img.classList.add("mo-loading");
    const done = () => img.classList.remove("mo-loading");
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });
}

function initCountUp() {
  document.querySelectorAll("main [class*='rating-value'], main [data-count-up]").forEach((el) => {
    const match = el.textContent.match(/(\d+(?:\.\d+)?)/);
    if (!match) return;
    const target = parseFloat(match[1]);
    const decimals = (match[1].split(".")[1] || "").length;
    const template = el.textContent;
    const once = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      once.disconnect();
      const t0 = performance.now();
      (function step(t) {
        const p = Math.min(1, (t - t0) / 1100);
        el.textContent = template.replace(match[1], (target * (1 - Math.pow(1 - p, 3))).toFixed(decimals));
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
    once.observe(el);
  });
}

function loadAltImage(card) {
  const alt = card.querySelector(".pc-img-alt[data-alt-src]");
  if (!alt) return;
  alt.src = alt.dataset.altSrc;
  alt.removeAttribute("data-alt-src");
}

function initImageSwap() {
  document.addEventListener(
    "pointerover",
    (e) => {
      const card = e.target.closest?.(".pc-card");
      if (card) loadAltImage(card);
    },
    { passive: true }
  );
}

function restart(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function initHeartPop() {
  document.addEventListener(
    "click",
    (e) => {
      const heart = e.target.closest?.(".pc-action-btn--wishlist, .pc-action-btn--wishlist-remove, [data-wishlist-btn], [data-wishlist-toggle]");
      if (heart) restart(heart, "mo-pop");
    },
    true
  );
}

function initCartBounce() {
  const badges = document.querySelectorAll("[data-cart-badge]");
  if (!badges.length) return;
  const bounce = () => badges.forEach((b) => b.parentElement && restart(b.parentElement, "mo-bounce"));
  const mo = new MutationObserver(bounce);
  badges.forEach((b) => mo.observe(b, { childList: true, characterData: true, subtree: true }));
}

const BUTTON_SELECTOR =
  "main a[class*='btn'], main button[class*='btn'], main [class*='__cta'], main .pdp-btn, .cart-summary__checkout, .ananas-side-cart__btn";

function initButtonSheen(root) {
  (root || document).querySelectorAll(BUTTON_SELECTOR).forEach((b) => {
    if (b.querySelector(":scope > .mo-shine") || b.closest(".pc-actions")) return;
    const shine = document.createElement("span");
    shine.className = "mo-shine";
    shine.setAttribute("aria-hidden", "true");
    b.classList.add("mo-sheen-host");
    b.appendChild(shine);
  });
}

function initMagnetic() {
  document.querySelectorAll(`${BUTTON_SELECTOR}, .ananas-nav__icon-btn`).forEach((b) => {
    b.addEventListener("pointermove", (e) => {
      const r = b.getBoundingClientRect();
      b.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px`;
    });
    b.addEventListener("pointerleave", () => {
      b.style.translate = "";
    });
    b.classList.add("mo-magnetic");
  });
}

function initTilt() {
  document
    .querySelectorAll("main [class*='category'] a, main [class*='mood'] a, main [class*='sbm'] a")
    .forEach((tile) => {
      if (tile.getBoundingClientRect().width < 140 || !ownTransformFree(tile)) return;
      tile.classList.add("mo-tilt-tile");
      tile.addEventListener("pointermove", (e) => {
        const r = tile.getBoundingClientRect();
        tile.style.setProperty("--mo-ry", `${(((e.clientX - r.left) / r.width - 0.5) * 9).toFixed(2)}deg`);
        tile.style.setProperty("--mo-rx", `${(-((e.clientY - r.top) / r.height - 0.5) * 9).toFixed(2)}deg`);
      });
      tile.addEventListener("pointerleave", () => {
        tile.style.setProperty("--mo-rx", "0deg");
        tile.style.setProperty("--mo-ry", "0deg");
      });
    });
}

function initCursor() {
  const ring = document.createElement("div");
  const dot = document.createElement("div");
  ring.className = "mo-cursor-ring";
  dot.className = "mo-cursor-dot";
  [ring, dot].forEach((el) => el.setAttribute("aria-hidden", "true"));
  document.body.append(ring, dot);
  let mx = -100;
  let my = -100;
  let rx = mx;
  let ry = my;
  addEventListener(
    "pointermove",
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.translate = `${mx}px ${my}px`;
      ring.classList.toggle("is-big", Boolean(e.target.closest?.("a, button, .pc-card")));
    },
    { passive: true }
  );
  document.addEventListener("pointerleave", () => ring.classList.add("is-out"));
  document.addEventListener("pointerenter", () => ring.classList.remove("is-out"));
  (function loop() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.translate = `${rx.toFixed(1)}px ${ry.toFixed(1)}px`;
    requestAnimationFrame(loop);
  })();
}

function initPageTransition() {
  // Bubble phase: links the theme handles in JS (side cart, quick view) have
  // already called preventDefault by then
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
    e.preventDefault();
    html.classList.add("mo-leaving");
    setTimeout(() => {
      location.href = a.href;
    }, 280);
  });
  // Back/forward cache restores the faded page
  addEventListener("pageshow", () => html.classList.remove("mo-leaving"));
}

// ── Init ─────────────────────────────────────────────────────────────────

function init() {
  if (reducedMotion) return;

  if (motion.smoothScroll) initSmoothScroll();

  const needsReveal = motion.scrollAnimations || motion.titleWords || motion.imageReveal;
  if (needsReveal && "IntersectionObserver" in window) {
    initRevealCore();
    if (motion.scrollAnimations) {
      const style = REVEAL_STYLES.includes(motion.animationStyle) ? motion.animationStyle : "fade-up";
      html.style.setProperty("--reveal-duration", `${Number(motion.animationDuration) || 700}ms`);
      html.classList.add("reveal-on", `reveal-${style}`);
      prepSectionsAndCards();
    }
    if (motion.titleWords) {
      flag("title-words");
      prepTitles();
    }
    if (motion.imageReveal) {
      flag("image-reveal");
      prepImageReveal(sectionImages());
    }
    // Sections re-rendered by the theme editor, cards from infinite scroll
    const main = mainEl();
    if (main) {
      new MutationObserver((mutations) => {
        if (!mutations.some((m) => m.addedNodes.length)) return;
        if (motion.scrollAnimations) prepSectionsAndCards();
        if (motion.titleWords) prepTitles();
        if (motion.imageReveal) prepImageReveal(sectionImages());
        if (motion.buttonSheen) initButtonSheen(main);
        revealBand();
      }).observe(main, { childList: true, subtree: true });
    }
  }

  if (motion.heroKenburns) flag("hero");
  if (motion.scrollProgress || motion.headerAutohide || motion.imageParallax || motion.scrollSkew) {
    if (motion.headerAutohide) flag("header-autohide");
    if (motion.imageParallax) flag("parallax");
    if (motion.scrollSkew) flag("skew");
    initScrollEffects();
  }
  if (motion.imageShimmer) {
    flag("shimmer");
    initImageShimmer();
  }
  if (motion.countUp && "IntersectionObserver" in window) initCountUp();
  if (motion.cardHover) flag("card-hover");
  if (motion.badgePulse) flag("badge-pulse");
  if (motion.heartPop) initHeartPop();
  if (motion.cartBounce) initCartBounce();
  if (motion.buttonSheen) {
    flag("sheen");
    initButtonSheen();
  }
  if (motion.navUnderline) flag("nav-underline");

  if (finePointer) {
    if (motion.imageSwap) {
      flag("image-swap");
      initImageSwap();
    }
    if (motion.magneticButtons) initMagnetic();
    if (motion.tiltTiles) {
      flag("tilt");
      initTilt();
    }
    if (motion.customCursor && !inFrame) {
      flag("cursor");
      initCursor();
    }
  }
  if (motion.pageTransition && !inFrame) {
    flag("page-transition");
    initPageTransition();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
