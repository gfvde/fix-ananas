/**
 * Product Card behaviour (components/products/product-card.jinja)
 *
 * Bundled once instead of an inline <script> per card include.
 * - Stock info flip (sold ↔ remaining) driven by ONE global ticker; detached
 *   cards (replaced by AJAX filtering) are pruned on every tick.
 * - Tags overflow arrow visibility.
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
    group.items[group.current].classList.remove("active");
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

function initTagsArrows(root = document) {
  root.querySelectorAll(".pc-tags-container").forEach((container) => {
    const wrapper = container.querySelector(".pc-tags-wrapper");
    const btn = container.querySelector(".pc-tags-scroll-btn");
    if (!wrapper || !btn) return;
    btn.style.display = wrapper.scrollWidth > wrapper.clientWidth + 2 ? "flex" : "none";
  });
}

export function initProductCards(root = document) {
  initTagsArrows(root);
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
