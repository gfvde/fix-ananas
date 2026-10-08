/**
 * Product Card behaviour (components/products/product-card.jinja)
 *
 * Bundled once instead of an inline <script> per card include.
 * - Stock info flip (sold ↔ remaining) driven by ONE global ticker; detached
 *   cards (replaced by AJAX filtering) are pruned on every tick.
 * - Tags strip: overflow hint, ~1s delayed auto-slide loop, manual swipe/drag.
 * - GA select_item tracking on product-card link clicks (zidTracking).
 */

const FLIP_INTERVAL = 2500;
const flipGroups = new Set();
let flipTimer = null;

function tickFlip() {
  flipGroups.forEach((group) => {
    if (!group.container.isConnected) {
      flipGroups.delete(group);
      return;
    }
    const prev = group.items[group.current];
    prev.classList.remove("active");
    prev.classList.add("is-leaving");
    setTimeout(() => prev.classList.remove("is-leaving"), 460);
    group.current = (group.current + 1) % group.items.length;
    group.items[group.current].classList.add("active");
  });

  if (flipGroups.size === 0) {
    clearInterval(flipTimer);
    flipTimer = null;
  }
}

function initStockFlip(container) {
  const items = [container.querySelector(".pc-stock-sold"), container.querySelector(".pc-stock-qty")].filter(Boolean);

  if (items.length === 0) {
    container.hidden = true;
    return;
  }

  items[0].classList.add("active");
  if (items.length === 1) return;

  flipGroups.add({ container, items, current: 0 });
  if (!flipTimer) flipTimer = setInterval(tickFlip, FLIP_INTERVAL);
}

// ─────────────────────────────────────────────────────────────
// Tags strip — one row; when the tags overflow they are cut at the
// edge (chevron hint), auto-slide after ~1s in an infinite loop and
// can be swiped/dragged manually (dev note Figma 11474:25137).
// Auto-slide follows the "tags_infinite_loop" setting (body[data-pc-tags-loop]).
// ─────────────────────────────────────────────────────────────

const TAG_SPEED = 22; // px per second
const TAG_START_DELAY = 1000;
const TAG_RESUME_DELAY = 2000;
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const strips = new Set();
let stripRaf = null;
let lastTs = 0;
let stripObserver = null;

function autoplayAllowed() {
  return !reduceMotion && document.body?.dataset.pcTagsLoop !== "false";
}

function stripTick(ts) {
  const dt = lastTs ? Math.min(ts - lastTs, 64) / 1000 : 0;
  lastTs = ts;
  let active = 0;

  strips.forEach((st) => {
    if (!st.container.isConnected) {
      strips.delete(st);
      stripObserver?.unobserve(st.container);
      return;
    }
    if (!st.visible || st.paused || ts < st.resumeAt) return;
    active++;
    st.pos += TAG_SPEED * dt;
    if (st.setWidth > 0 && st.pos >= st.setWidth) st.pos -= st.setWidth;
    st.wrapper.scrollLeft = st.sign * st.pos;
  });

  if (active > 0 || [...strips].some((st) => st.visible && !st.paused)) {
    stripRaf = requestAnimationFrame(stripTick);
  } else {
    stripRaf = null;
    lastTs = 0;
  }
}

function ensureStripLoop() {
  if (!stripRaf && strips.size) {
    lastTs = 0;
    stripRaf = requestAnimationFrame(stripTick);
  }
}

function pauseStrip(st) {
  st.paused = true;
}

function resumeStripLater(st) {
  st.paused = false;
  st.pos = Math.abs(st.wrapper.scrollLeft);
  if (st.setWidth > 0 && st.pos >= st.setWidth) st.pos -= st.setWidth;
  st.resumeAt = performance.now() + TAG_RESUME_DELAY;
  ensureStripLoop();
}

function measureStrip(container) {
  const wrapper = container.querySelector(".pc-tags-wrapper");
  const track = container.querySelector(".pc-tags-track");
  const set = track?.querySelector(".pc-tags-set");
  if (!wrapper || !set) return null;
  const overflowing = set.offsetWidth > wrapper.clientWidth + 2;
  container.classList.toggle("is-overflowing", overflowing);
  return { wrapper, track, set, overflowing };
}

function initTagStrip(container) {
  if (container.dataset.tagsInit) return;
  const m = measureStrip(container);
  if (!m) return;
  container.dataset.tagsInit = "1";

  const sign = getComputedStyle(m.wrapper).direction === "rtl" ? -1 : 1;
  const btn = container.querySelector(".pc-tags-scroll-btn");
  let st = null;

  btn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (st) pauseStrip(st);
    m.wrapper.scrollBy({ left: sign * 80, behavior: "smooth" });
    if (st) setTimeout(() => resumeStripLater(st), 400);
  });

  if (!m.overflowing || !autoplayAllowed()) return;

  // Seamless loop: one clone of the set (screen readers skip it)
  const clone = m.set.cloneNode(true);
  clone.setAttribute("aria-hidden", "true");
  m.track.appendChild(clone);
  container.classList.add("is-cloned");

  st = {
    container,
    wrapper: m.wrapper,
    sign,
    pos: 0,
    setWidth: clone.offsetLeft ? Math.abs(clone.offsetLeft - m.set.offsetLeft) : m.set.offsetWidth,
    paused: false,
    visible: false,
    resumeAt: performance.now() + TAG_START_DELAY
  };

  // Manual swipe / drag / wheel pauses the auto-slide, which resumes from where the user left it
  const onStart = () => pauseStrip(st);
  const onEnd = () => resumeStripLater(st);
  m.wrapper.addEventListener("pointerdown", onStart, { passive: true });
  m.wrapper.addEventListener("touchstart", onStart, { passive: true });
  m.wrapper.addEventListener("pointerup", onEnd, { passive: true });
  m.wrapper.addEventListener("pointercancel", onEnd, { passive: true });
  m.wrapper.addEventListener("touchend", onEnd, { passive: true });
  m.wrapper.addEventListener(
    "wheel",
    () => {
      pauseStrip(st);
      clearTimeout(st.wheelTimer);
      st.wheelTimer = setTimeout(onEnd, 150);
    },
    { passive: true }
  );
  // Mouse drag-to-scroll on desktop
  let dragX = null;
  m.wrapper.addEventListener("mousedown", (e) => {
    dragX = { x: e.clientX, left: m.wrapper.scrollLeft };
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragX) return;
    m.wrapper.scrollLeft = dragX.left - (e.clientX - dragX.x);
  });
  window.addEventListener("mouseup", () => {
    if (dragX) {
      dragX = null;
      onEnd();
    }
  });

  strips.add(st);
  if (!stripObserver && "IntersectionObserver" in window) {
    stripObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        strips.forEach((s) => {
          if (s.container === entry.target) s.visible = entry.isIntersecting;
        });
      });
      ensureStripLoop();
    });
  }
  st.visible = true;
  if (stripObserver) stripObserver.observe(container);
  ensureStripLoop();
}

// Strips are initialised the first time they scroll into view, so cards in hidden
// tabs / lazy carousels are measured with their real width.
let stripInitObserver = null;

function initTagStrips(root = document) {
  const containers = root.querySelectorAll(".pc-tags-container:not([data-tags-init])");
  if (!("IntersectionObserver" in window)) {
    containers.forEach(initTagStrip);
    return;
  }
  if (!stripInitObserver) {
    stripInitObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.boundingClientRect.width === 0) return;
          stripInitObserver.unobserve(entry.target);
          initTagStrip(entry.target);
        });
      },
      { rootMargin: "100px" }
    );
  }
  containers.forEach((c) => stripInitObserver.observe(c));
}

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    document.querySelectorAll(".pc-tags-container:not(.is-cloned)").forEach((c) => measureStrip(c));
  }, 200);
});

export function initProductCards(root = document) {
  initTagStrips(root);
  root.querySelectorAll(".pc-stock:not([data-flip-init])").forEach((c) => {
    c.dataset.flipInit = "1";
    initStockFlip(c);
  });
}

// ─────────────────────────────────────────────────────────────
// select_item tracking (E_js_sdk §10.1)
// ─────────────────────────────────────────────────────────────

function parsePrice(text) {
  if (!text) return undefined;
  const normalized = text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[^\d.,]/g, "")
    .replace(/,(?=\d{3}\b)/g, "")
    .replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : undefined;
}

function handleCardLinkClick(e) {
  const tracking = window.zidTracking;
  if (!tracking?.sendGaSelectItemEvent) return;

  const link = e.target.closest?.("a[href]");
  const card = link?.closest("[data-product-card]");
  if (!card) return;

  const list = card.closest("[data-list-name], [data-products-grid], section") || document.body;
  const cards = Array.from(list.querySelectorAll("[data-product-card]"));
  const nameEl = card.querySelector(".pc-name a");
  const product = {
    id: card.dataset.productCard,
    name: nameEl?.textContent?.trim() || nameEl?.getAttribute("title") || "",
    url: link.href,
    price: parsePrice(card.querySelector(".pc-price")?.textContent)
  };
  const listName = list.dataset?.listName || document.body.dataset.template || "products";

  try {
    tracking.sendGaSelectItemEvent({
      product,
      listName,
      listId: list.id || listName,
      index: Math.max(cards.indexOf(card), 0)
    });
  } catch (err) {
    console.warn("[ProductCard] select_item tracking failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────

function initAll() {
  initProductCards(document);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAll);
} else {
  initAll();
}

document.addEventListener("click", handleCardLinkClick, true);

window.addEventListener("content:loaded", initAll);
window.addEventListener("products-appended", initAll);
window.addEventListener("products-updated", initAll);
window.addEventListener("products:updated", initAll);

window.initProductCards = initProductCards;
