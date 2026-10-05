/**
 * Quick View Module
 *
 * Fetches product page content and displays in a modal with caching and prefetching.
 * Uses in-memory LRU cache for optimal performance.
 *
 * Usage:
 * - Include in main bundle via import
 * - Add quick-view-modal component to your page
 * - Call window.quickViewManager.open(productSlug, productUrl)
 */

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const CONFIG = {
  maxCacheSize: 15,
  hoverDelay: 200,
  productSectionId: "product-main-section"
};

const QV_FORM_ID = "qv-product-form";

const ELEMENTS = {
  dialog: "quick-view-dialog",
  modal: "product-quick-view-modal",
  skeleton: "quick-view-skeleton",
  content: "quick-view-content",
  footer: "quick-view-footer",
  productLink: "quick-view-product-link"
};

// ─────────────────────────────────────────────────────────────
// Quick View Manager Class
// ─────────────────────────────────────────────────────────────

class QuickViewManager {
  constructor() {
    // LRU Cache using Map (maintains insertion order)
    this.cache = new Map();

    // Prefetch state
    this.prefetchController = null;
    this.hoverTimeout = null;
    this.currentHoveredCard = null;
    this.currentPrefetchUrl = null;

    // SDK script state
    this.sdkScriptLoaded = false;
    this.sdkScriptUrl = null;

    // Snapshot of window.productObj before quick-view mutates it (restored on close)
    this.originalProductObj = undefined;
    this.hasOriginalProductObj = false;

    // Bound methods for event listeners
    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.handleMouseOut = this.handleMouseOut.bind(this);
    this.handleCartUpdated = this.handleCartUpdated.bind(this);
    this.handleDialogClose = this.handleDialogClose.bind(this);
  }

  // ─────────────────────────────────────────────────────────────
  // Cache Methods (LRU using Map)
  // ─────────────────────────────────────────────────────────────

  cacheGet(url) {
    const data = this.cache.get(url);
    if (!data) return null;

    // Move to end for LRU ordering
    this.cache.delete(url);
    this.cache.set(url, data);
    return data;
  }

  cacheSet(url, html, productObj) {
    this.cache.delete(url);

    if (this.cache.size >= CONFIG.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(url, { html, productObj });
  }

  cacheHas(url) {
    return this.cache.has(url);
  }

  cacheClear() {
    this.cache.clear();
  }

  // ─────────────────────────────────────────────────────────────
  // URL Helpers
  // ─────────────────────────────────────────────────────────────

  buildFetchUrl(productUrl) {
    const urlParams = new URLSearchParams(window.location.search);
    const themeParam = urlParams.get("theme");

    if (!themeParam) return productUrl;

    const separator = productUrl.includes("?") ? "&" : "?";
    return `${productUrl}${separator}theme=${encodeURIComponent(themeParam)}`;
  }

  extractProductSection(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const section = doc.getElementById(CONFIG.productSectionId);
    return section ? section.outerHTML : null;
  }

  extractProductObj(html) {
    const match = html.match(/window\.productObj\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        console.warn("[QuickView] Failed to parse productObj:", e);
      }
    }
    return null;
  }

  extractSdkScriptUrl(html) {
    const match = html.match(/<script[^>]+src="([^"]*theme-statics\/product\.js[^"]*)"/);
    return match ? match[1] : null;
  }

  escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  extractTags(productObj) {
    const candidates = [
      productObj?.keywords,
      productObj?.tags,
      productObj?.product?.keywords,
      productObj?.product?.tags,
      productObj?.selected_product?.keywords,
      productObj?.selected_product?.tags
    ];

    const source = candidates.find((items) => Array.isArray(items) && items.length > 0) || [];
    const seen = new Set();

    return source
      .map((tag) => tag?.name || tag?.title || tag?.label || tag?.value || tag)
      .map((tag) => String(tag || "").trim())
      .filter((tag) => {
        if (!tag || seen.has(tag)) return false;
        seen.add(tag);
        return true;
      })
      .slice(0, 3);
  }

  t(key, fallback) {
    return window.ananasTranslations?.[key] || window.productTranslations?.[key] || fallback;
  }

  formatTemplate(template, values) {
    return Object.entries(values).reduce(
      (text, [key, value]) => text.replace(new RegExp(`%\\(${key}\\)s`, "g"), value),
      template
    );
  }

  createPaymentStrip() {
    const template = document.getElementById("quick-view-payment-template");
    if (template?.content?.firstElementChild) {
      return template.content.firstElementChild.cloneNode(true);
    }

    const fallbackLabels = ["Western Union", "BANK", "PayPal", "tabby", this.t("tamara", "Tamara"), "VISA", "mada", "MasterCard", "valu", "Apple Pay"];
    const strip = document.createElement("div");
    strip.className = "quick-view-payments";
    strip.setAttribute("aria-label", this.t("paymentMethods", "Payment methods"));
    strip.innerHTML = `
      <div class="quick-view-payments__track">
        ${[1, 2]
          .map(
            (repeat) => `
              <div class="quick-view-payments__group"${repeat === 2 ? ' aria-hidden="true"' : ""}>
                ${fallbackLabels.map((label) => `<span class="quick-view-payment quick-view-payment--text">${this.escapeHtml(label)}</span>`).join("")}
              </div>
            `
          )
          .join("")}
      </div>
    `;
    return strip;
  }

  loadSdkScript() {
    if (this.sdkScriptLoaded || !this.sdkScriptUrl) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.type = "module";
      script.src = this.sdkScriptUrl;
      script.onload = () => {
        this.sdkScriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error("[QuickView] Failed to load SDK script"));
      document.head.appendChild(script);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Prefetch Methods
  // ─────────────────────────────────────────────────────────────

  async prefetch(productUrl) {
    if (!productUrl || this.cacheHas(productUrl)) return;

    this.cancelPrefetch();
    this.prefetchController = new AbortController();

    try {
      const fetchUrl = this.buildFetchUrl(productUrl);
      const response = await fetch(fetchUrl, {
        signal: this.prefetchController.signal,
        priority: "low"
      });

      if (!response.ok) return;

      const html = await response.text();
      const sectionHtml = this.extractProductSection(html);
      const productObj = this.extractProductObj(html);

      if (!this.sdkScriptUrl) {
        this.sdkScriptUrl = this.extractSdkScriptUrl(html);
      }

      if (sectionHtml) {
        this.cacheSet(productUrl, sectionHtml, productObj);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.warn("[QuickView] Prefetch failed:", err);
      }
    } finally {
      this.prefetchController = null;
    }
  }

  cancelPrefetch() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

    if (this.prefetchController) {
      this.prefetchController.abort();
      this.prefetchController = null;
    }

    this.currentPrefetchUrl = null;
  }

  setupPrefetchListeners() {
    document.addEventListener("mouseover", this.handleMouseOver);
    document.addEventListener("mouseout", this.handleMouseOut);
  }

  handleMouseOver(event) {
    if (!(event.target instanceof Element)) return;

    const card = event.target.closest("[data-product-card]");
    if (!card) return;
    if (card === this.currentHoveredCard) return;

    this.cancelPrefetch();
    this.currentHoveredCard = card;

    const link = card.querySelector("a[href]");
    const productUrl = link?.getAttribute("href");

    if (!productUrl || this.cacheHas(productUrl)) return;
    if (productUrl === this.currentPrefetchUrl) return;

    this.currentPrefetchUrl = productUrl;

    this.hoverTimeout = setTimeout(() => {
      this.prefetch(productUrl);
    }, CONFIG.hoverDelay);
  }

  handleMouseOut(event) {
    if (!(event.target instanceof Element)) return;

    const card = event.target.closest("[data-product-card]");
    if (!card) return;

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Element) {
      const toCard = relatedTarget.closest("[data-product-card]");
      if (toCard === card) return;
    }

    this.cancelPrefetch();
    this.currentHoveredCard = null;
  }

  // ─────────────────────────────────────────────────────────────
  // Modal Methods
  // ─────────────────────────────────────────────────────────────

  getElements() {
    const elements = {};

    for (const [key, id] of Object.entries(ELEMENTS)) {
      elements[key] = document.getElementById(id);
      if (!elements[key]) {
        console.error(`[QuickView] Element not found: #${id}`);
        return null;
      }
    }

    return elements;
  }

  getMessages(modal) {
    return {
      errorMessage: modal?.dataset.errorMessage || "Failed to load product. Please try again.",
      goToProduct: modal?.dataset.goToProduct || "Go to product page"
    };
  }

  setModalState(elements, state) {
    const { skeleton, content, footer } = elements;

    skeleton.classList.toggle("hidden", state !== "loading");
    content.classList.toggle("hidden", state === "loading");
    footer.classList.toggle("hidden", state !== "content");
  }

  renderError(content, message, linkText, url) {
    content.innerHTML = "";

    const container = document.createElement("div");
    container.className = "py-8 text-center";

    const text = document.createElement("p");
    text.className = "text-secondary";
    text.textContent = message;

    const link = document.createElement("a");
    link.href = url;
    link.className = "text-primary mt-2 inline-block underline";
    link.textContent = linkText;

    container.append(text, link);
    content.appendChild(container);
  }

  dispatchContentLoaded() {
    window.dispatchEvent(new CustomEvent("content:loaded"));
  }

  /**
   * When quick view opens on a page that already has a product form/gallery
   * (e.g. related products on a PDP), the injected section would duplicate
   * `#product-form` and the `product-gallery-*` ids. `zid.cart.addProduct({form_id})`
   * reads the first match, i.e. the wrong product. Rename the injected copies.
   */
  isolateIds(section) {
    const outside = (id) => {
      const el = document.getElementById(id);
      return el && !section.contains(el);
    };

    const form = section.querySelector("#product-form");
    if (form && outside("product-form")) {
      form.id = QV_FORM_ID;
      section.querySelectorAll('[data-add-to-cart-form="product-form"]').forEach((el) => {
        el.dataset.addToCartForm = QV_FORM_ID;
      });
      section.querySelectorAll('[data-buy-now-form="product-form"]').forEach((el) => {
        el.dataset.buyNowForm = QV_FORM_ID;
      });
      section.querySelectorAll('[form="product-form"]').forEach((el) => el.setAttribute("form", QV_FORM_ID));
    }

    const galleryWrapper = section.querySelector(".pg-wrapper[data-gallery-id]");
    const galleryId = galleryWrapper?.dataset.galleryId;
    if (galleryId && outside(`${galleryId}-wrapper`)) {
      const newId = `qv-${galleryId}`;
      section.querySelectorAll(`[id^="${galleryId}-"]`).forEach((el) => {
        el.id = newId + el.id.slice(galleryId.length);
      });
      galleryWrapper.dataset.galleryId = newId;
    }
  }

  enhanceContent(content, productObj) {
    const section = content.querySelector(`#${CONFIG.productSectionId}`);
    if (!section) return;

    section.classList.add("quick-view-product-section");
    this.isolateIds(section);

    const galleryColumn = section.querySelector(".product-gallery-column");
    const galleryShell = galleryColumn?.querySelector(":scope > div");
    const galleryMain = galleryShell?.querySelector(":scope > .flex-1 > .relative, :scope > .relative");
    const detailsColumn = section.querySelector(".product-details-column");
    const productForm = section.querySelector(`#product-form, #${QV_FORM_ID}`);
    const inStockActions = section.querySelector("[data-in-stock]");
    const addToCartButton = section.querySelector("[data-add-to-cart-form]");
    const quantityWrapper = section.querySelector("[data-quantity-wrapper]");
    const wishlistButton = inStockActions?.querySelector("[data-wishlist-btn]");

    if (galleryMain && !galleryMain.querySelector(".quick-view-gallery-badge")) {
      const badgeText = section.querySelector("#product-badges .badge")?.textContent?.trim();
      if (badgeText) {
        const badge = document.createElement("span");
        badge.className = "quick-view-gallery-badge";
        badge.textContent = badgeText;
        galleryMain.appendChild(badge);
      }
    }

    if (productForm && quantityWrapper && !section.querySelector(".quick-view-purchase-row")) {
      const purchaseRow = document.createElement("div");
      purchaseRow.className = "quick-view-purchase-row";
      productForm.insertBefore(purchaseRow, quantityWrapper);

      if (wishlistButton) {
        purchaseRow.appendChild(wishlistButton);
      }

      purchaseRow.appendChild(quantityWrapper);
    }

    if (detailsColumn && productForm && !detailsColumn.querySelector(".quick-view-tags")) {
      const tags = this.extractTags(productObj);
      if (tags.length) {
        const tagsEl = document.createElement("div");
        tagsEl.className = "quick-view-tags";
        tagsEl.innerHTML = tags.map((tag) => `<span class="quick-view-tag">${this.escapeHtml(tag)}</span>`).join("");
        detailsColumn.insertBefore(tagsEl, productForm);
      }
    }

    if (detailsColumn && productForm && !detailsColumn.querySelector(".quick-view-stock-alert")) {
      const selectedQuantity = Number(productObj?.selected_product?.quantity ?? productObj?.quantity);
      const isInfinite = productObj?.selected_product?.is_infinite ?? productObj?.is_infinite;
      const configuredLowStockQty = Number(productObj?.selected_product?.low_stock_quantity ?? productObj?.low_stock_quantity);
      const lowStockBadge = section.querySelector("[data-low-stock-badge]");
      const lowStockText = lowStockBadge?.querySelector("[data-low-stock-text]")?.textContent?.trim();
      const lowStockTextQty = Number(lowStockText?.match(/\d+/)?.[0]);
      const displayQty = Number.isFinite(selectedQuantity)
        ? selectedQuantity
        : Number.isFinite(configuredLowStockQty)
          ? configuredLowStockQty
          : lowStockTextQty;
      const shouldShowLowStock = !isInfinite && Number.isFinite(displayQty) && displayQty > 0 && displayQty <= 5;

      if (shouldShowLowStock) {
        const stockAlert = document.createElement("div");
        stockAlert.className = "quick-view-stock-alert";
        const lowStockMessage = displayQty
          ? this.formatTemplate(this.t("lowStockPacks", "Only %(count)s packs left in stock!"), { count: displayQty })
          : lowStockText || this.t("limitedStock", "Limited quantity in stock!");
        stockAlert.innerHTML = `<span aria-hidden="true">🔥</span><span>${this.escapeHtml(lowStockMessage)}</span>`;
        const purchaseRow = section.querySelector(".quick-view-purchase-row") || quantityWrapper;
        if (purchaseRow) productForm.insertBefore(stockAlert, purchaseRow);
      }
    }

    if (inStockActions && addToCartButton && !inStockActions.querySelector("[data-buy-now-form]")) {
      const buyNowButton = document.createElement("button");
      buyNowButton.type = "button";
      buyNowButton.dataset.buyNowForm = addToCartButton.dataset.addToCartForm || "product-form";
      buyNowButton.className = "quick-view-buy-now";
      buyNowButton.innerHTML = `
        <span>${this.escapeHtml(this.t("buyNow", "Buy now"))}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7.5C4 6.12 5.12 5 6.5 5H17.5C18.88 5 20 6.12 20 7.5V16.5C20 17.88 18.88 19 17.5 19H6.5C5.12 19 4 17.88 4 16.5V7.5Z" stroke="currentColor" stroke-width="1.5"/>
          <path d="M16 9H20V13H16C14.9 13 14 12.1 14 11C14 9.9 14.9 9 16 9Z" stroke="currentColor" stroke-width="1.5"/>
          <path d="M16.5 11H16.51" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;
      inStockActions.insertBefore(buyNowButton, addToCartButton);
    }

    if (addToCartButton) {
      addToCartButton.classList.add("quick-view-add-to-cart");
      if (!addToCartButton.querySelector(".quick-view-btn-icon")) {
        addToCartButton.insertAdjacentHTML(
          "beforeend",
          `<svg class="quick-view-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 8V6.5C7 3.46 9.02 2 12 2C14.98 2 17 3.46 17 6.5V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M5.4 8H18.6L19.5 20H4.5L5.4 8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>`
        );
      }
    }

    // if (detailsColumn && productForm && !detailsColumn.querySelector(".quick-view-payments")) {
    //   const actionContainer = productForm.querySelector("[data-product-actions]");
    //   const payments = this.createPaymentStrip();
    //   if (actionContainer) {
    //     actionContainer.insertAdjacentElement("afterend", payments);
    //   } else {
    //     productForm.appendChild(payments);
    //   }
    // }
  }

  async open(productSlug, productUrl) {
    const elements = this.getElements();
    if (!elements) return;

    const { dialog, modal, content, productLink } = elements;
    const baseUrl = productUrl || `/p/${productSlug}`;
    const messages = this.getMessages(modal);

    if (!this.hasOriginalProductObj) {
      this.originalProductObj = window.productObj;
      this.hasOriginalProductObj = true;
    }

    const cachedData = this.cacheGet(baseUrl);

    if (cachedData) {
      if (cachedData.productObj) window.productObj = cachedData.productObj;
      await this.loadSdkScript();

      content.innerHTML = cachedData.html;
      this.enhanceContent(content, cachedData.productObj);
      productLink.href = baseUrl;
      this.setModalState(elements, "content");
      dialog.show();

      requestAnimationFrame(() => this.dispatchContentLoaded());
      return;
    }

    content.innerHTML = "";
    this.setModalState(elements, "loading");
    dialog.show();

    try {
      const fetchUrl = this.buildFetchUrl(baseUrl);
      const response = await fetch(fetchUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const sectionHtml = this.extractProductSection(html);
      const productObj = this.extractProductObj(html);

      if (!sectionHtml) {
        throw new Error("Product section not found");
      }

      if (!this.sdkScriptUrl) {
        this.sdkScriptUrl = this.extractSdkScriptUrl(html);
      }

      if (productObj) window.productObj = productObj;

      await this.loadSdkScript();

      this.cacheSet(baseUrl, sectionHtml, productObj);

      content.innerHTML = sectionHtml;
      this.enhanceContent(content, productObj);
      productLink.href = baseUrl;
      this.setModalState(elements, "content");

      requestAnimationFrame(() => this.dispatchContentLoaded());
    } catch (err) {
      console.error("[QuickView] Failed to load product:", err);
      this.setModalState(elements, "error");
      this.renderError(content, messages.errorMessage, messages.goToProduct, baseUrl);
    }
  }

  close() {
    const dialog = document.getElementById(ELEMENTS.dialog);
    if (dialog?.hasAttribute("open")) {
      dialog.hide();
    }
  }

  isOpen() {
    return !!document.getElementById(ELEMENTS.dialog)?.hasAttribute("open");
  }

  /**
   * Clear injected content and restore the page's own productObj (upstream 2b73b27:
   * prevents stuck variant selection on iOS and a wrong productObj on the PDP).
   */
  /**
   * Close the quick view first, then run `fn` (e.g. zid.cart.buyNow, which opens
   * the checkout dialog — F §1: never stack platform popups over theme overlays).
   * Injected content stays in the DOM until `fn` settles so the SDK can still
   * read the form.
   */
  async closeThen(fn) {
    this.deferCleanup = true;
    this.close();
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 50)));
    try {
      return await fn();
    } finally {
      this.deferCleanup = false;
      if (!this.isOpen()) this.handleDialogClose();
    }
  }

  handleDialogClose() {
    if (this.deferCleanup) return;
    const content = document.getElementById(ELEMENTS.content);
    if (content) content.innerHTML = "";

    if (this.hasOriginalProductObj) {
      window.productObj = this.originalProductObj;
      this.originalProductObj = undefined;
      this.hasOriginalProductObj = false;
    }

    const elements = this.getElements();
    if (elements) this.setModalState(elements, "loading");

    // Drop gallery instances whose DOM was just removed
    window.initAllProductGalleries?.();
  }

  // ─────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────

  setupCartListener() {
    // add-to-cart.js dispatches "cart:updated" (colon)
    window.addEventListener("cart:updated", this.handleCartUpdated);
  }

  setupDialogCloseListener() {
    const modal = document.getElementById(ELEMENTS.modal);
    if (modal) modal.addEventListener("close", this.handleDialogClose);
  }

  handleCartUpdated(event) {
    const action = event?.detail?.action;
    if (action && action !== "add") return;
    if (this.isOpen()) this.close();
  }

  // ─────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────

  init() {
    this.setupPrefetchListeners();
    this.setupCartListener();
    this.setupDialogCloseListener();
  }

  destroy() {
    document.removeEventListener("mouseover", this.handleMouseOver);
    document.removeEventListener("mouseout", this.handleMouseOut);
    window.removeEventListener("cart:updated", this.handleCartUpdated);

    const modal = document.getElementById(ELEMENTS.modal);
    if (modal) modal.removeEventListener("close", this.handleDialogClose);

    this.cancelPrefetch();
    this.cacheClear();
    this.currentHoveredCard = null;
  }
}

// ─────────────────────────────────────────────────────────────
// Global Instance & Legacy Support
// ─────────────────────────────────────────────────────────────

const quickViewManager = new QuickViewManager();

// Expose globally
window.quickViewManager = quickViewManager;

// Legacy support
window.openQuickViewModal = function (productId, productSlug, productUrl) {
  quickViewManager.open(productSlug, productUrl);
};

// ─────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────

export function init() {
  quickViewManager.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

(function () {

  const normalize = (str) => (str || "").toLowerCase().trim();

  const colorMap = {
    red: "#ef4444",
    green: "#22c55e",
    blue: "#3b82f6",
    black: "#111827",
    white: "#ffffff",
    yellow: "#eab308",
    orange: "#f97316",
    purple: "#a855f7",
    pink: "#ec4899",
    gray: "#6b7280",
  };

  function getContrastColor(hex) {
    if (!hex?.startsWith("#")) return "#fff";

    const c = hex.slice(1);
    const rgb = parseInt(
      c.length === 3
        ? c.split("").map(x => x + x).join("")
        : c,
      16
    );

    const r = (rgb >> 16) & 255;
    const g = (rgb >> 8) & 255;
    const b = rgb & 255;

    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    return brightness > 150 ? "#000" : "#fff";
  }

  function applyColors(root = document) {
    root.querySelectorAll("#quick-view-content .product-options__item").forEach(el => {

      let value =
        el.getAttribute("value") ||
        el.querySelector("#quick-view-content .product-options__item-text")?.textContent ||
        "";

      value = normalize(value);

      let color = null;

      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
        color = value;
      } else if (value.startsWith("rgb")) {
        color = value;
      } else if (colorMap[value]) {
        color = colorMap[value];
      }

      if (color) {
        el.style.backgroundColor = color;
        el.style.color = getContrastColor(color);
        el.classList.add("colorized");
      }
    });
  }

  // Colorize option swatches whenever quick-view content is (re)injected.
  // Observe only the quick-view container, not the whole document.
  function observeQuickView() {
    const target = document.getElementById("quick-view-content");
    if (!target) return;
    applyColors(target);
    new MutationObserver(() => applyColors(target)).observe(target, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeQuickView);
  } else {
    observeQuickView();
  }

})();

export { quickViewManager };
export default QuickViewManager;

