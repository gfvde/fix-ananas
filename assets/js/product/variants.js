/**
 * Product Variants Module
 *
 * Handles variant selection UI updates:
 * - Price updates
 * - Product info (SKU, weight, badges)
 * - Stock status
 * - Gallery image updates
 *
 * Platform Callback (MUST KEEP):
 * - window.productOptionsChanged - Called by platform after variant API
 */

const GALLERY_ID = "product-gallery";

// ─────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────

function show(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.classList.remove("hidden", "d-none");
    el.style.display = "";
  }
}

function hide(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.classList.add("hidden");
    el.style.display = "none";
  }
}

// ─────────────────────────────────────────────────────────────
// Price Updates
// ─────────────────────────────────────────────────────────────

// Unit prices as the platform formats them; the shown price is unit × quantity.
const unitPrice = { current: null, old: null };

function getProductQuantity() {
  const input = document.querySelector('[data-qty-input="product-quantity"] [data-qty-value]');
  return Math.max(1, parseInt(input?.value, 10) || 1);
}

// Multiply the number inside a formatted price ("1,250.00 ر.س") and keep its format.
function multiplyFormattedPrice(formatted, qty) {
  if (!formatted || qty === 1) return formatted;
  const match = formatted.match(/\d[\d,]*(?:\.\d+)?/);
  if (!match) return formatted;
  const unit = parseFloat(match[0].replace(/,/g, ""));
  if (!Number.isFinite(unit)) return formatted;
  const decimals = (match[0].split(".")[1] || "").length;
  let total = (unit * qty).toFixed(decimals);
  if (match[0].includes(",")) {
    const [int, frac] = total.split(".");
    total = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (frac ? "." + frac : "");
  }
  return formatted.replace(match[0], total);
}

function renderPriceTotals() {
  if (unitPrice.current === null) return;
  const qty = getProductQuantity();
  document.querySelectorAll("[data-product-price]").forEach((priceEl) => {
    priceEl.textContent = multiplyFormattedPrice(unitPrice.current, qty);
  });
  if (unitPrice.old) {
    document.querySelectorAll("[data-product-price-old]").forEach((priceOldEl) => {
      priceOldEl.textContent = multiplyFormattedPrice(unitPrice.old, qty);
    });
  }
}

export function updatePrice(selectedProduct) {
  if (!selectedProduct) return;

  // The product page can render the price block twice (mobile + desktop layouts), so update every copy.
  const hasDiscount = !!selectedProduct.formatted_sale_price;
  unitPrice.current = hasDiscount ? selectedProduct.formatted_sale_price : selectedProduct.formatted_price;
  unitPrice.old = hasDiscount ? selectedProduct.formatted_price : null;

  document.querySelectorAll("[data-product-price-old]").forEach((priceOldEl) => {
    if (hasDiscount) {
      priceOldEl.classList.remove("hidden");
    } else {
      priceOldEl.textContent = "";
      priceOldEl.classList.add("hidden");
    }
  });
  renderPriceTotals();

  document.querySelectorAll("[data-product-discount]").forEach((discountEl) => {
    if (hasDiscount && selectedProduct.discount_percentage) {
      const discountText = window.productTranslations?.discount || "Discount";
      discountEl.textContent = `${discountText} ${selectedProduct.discount_percentage}%`;
      discountEl.classList.remove("hidden");
    } else {
      discountEl.textContent = "";
      discountEl.classList.add("hidden");
    }
  });
}

// ─────────────────────────────────────────────────────────────
// Product Info Updates
// ─────────────────────────────────────────────────────────────

export function updateProductInfo(selectedProduct) {
  if (!selectedProduct) return;

  // Update SKU
  const skuEl = document.querySelector("[data-product-sku]");
  const skuWrapper = document.querySelector("[data-product-sku-wrapper]");
  if (skuEl && skuWrapper) {
    if (selectedProduct.sku) {
      skuEl.textContent = selectedProduct.sku;
      show("[data-product-sku-wrapper]");
    } else {
      hide("[data-product-sku-wrapper]");
    }
  }

  // Update Weight
  const weightEl = document.querySelector("[data-product-weight]");
  const weightWrapper = document.querySelector("[data-product-weight-wrapper]");
  if (weightEl && weightWrapper) {
    if (selectedProduct.weight?.value) {
      weightEl.textContent = `${selectedProduct.weight.value} ${selectedProduct.weight.unit || ""}`;
      show("[data-product-weight-wrapper]");
    } else {
      hide("[data-product-weight-wrapper]");
    }
  }

  // Update Low Stock Badge
  const lowStockBadge = document.querySelector("[data-low-stock-badge]");
  let quickViewStockAlert = document.querySelector(".quick-view-stock-alert");
  if (lowStockBadge) {
    const threshold = window.storeLowStockThreshold || 5;
    if (window.storeLowStockEnabled && !selectedProduct.is_infinite && selectedProduct.quantity <= threshold) {
      const template = lowStockBadge.dataset.template || window.productTranslations?.remaining || "Remaining %s only";
      const lowStockText = lowStockBadge.querySelector("[data-low-stock-text]");
      if (lowStockText) {
        lowStockText.textContent = template.replace("%s", selectedProduct.quantity);
      } else {
        lowStockBadge.textContent = template.replace("%s", selectedProduct.quantity);
      }
      show("[data-low-stock-badge]");
    } else {
      hide("[data-low-stock-badge]");
    }
  }

  const quickViewForm = document.querySelector("#product-quick-view-modal #product-form");
  if (!quickViewStockAlert && quickViewForm) {
    quickViewStockAlert = document.createElement("div");
    quickViewStockAlert.className = "quick-view-stock-alert hidden";
    const purchaseRow = quickViewForm.querySelector(".quick-view-purchase-row") || quickViewForm.querySelector("[data-quantity-wrapper]");
    if (purchaseRow) {
      quickViewForm.insertBefore(quickViewStockAlert, purchaseRow);
    }
  }

  if (quickViewStockAlert) {
    const shouldShowQuickViewStock = !selectedProduct.is_infinite && selectedProduct.quantity > 0 && selectedProduct.quantity <= 5;
    quickViewStockAlert.classList.toggle("hidden", !shouldShowQuickViewStock);
    if (shouldShowQuickViewStock) {
      const template = window.productTranslations?.lowStockPacks || "Only %(count)s packs left in stock!";
      quickViewStockAlert.innerHTML = `<span aria-hidden="true">🔥</span><span>${template.replace("%(count)s", selectedProduct.quantity)}</span>`;
    }
  }

  // Update Sold Count Badge
  const soldBadge = document.querySelector("[data-sold-count-badge]");
  if (soldBadge && selectedProduct.sold_products_count) {
    const template = window.productTranslations?.sold || "Sold more than %s times";
    const textEl = soldBadge.querySelector("[data-sold-count-text]");
    if (textEl) {
      textEl.textContent = template.replace("%s", selectedProduct.sold_products_count);
    }
    show("[data-sold-count-badge]");
  } else if (soldBadge) {
    hide("[data-sold-count-badge]");
  }
}

// ─────────────────────────────────────────────────────────────
// Stock & Quantity Updates
// ─────────────────────────────────────────────────────────────

/**
 * Preorder state rendered on #product-main-section (data-has-preorder,
 * data-can-preorder, data-stock-behavior). Prefers the quick-view copy while
 * the quick-view dialog is showing.
 */
export function getPreorderState() {
  const qv = document.querySelector("#quick-view-content [data-can-preorder]");
  const el = (qv && qv.offsetParent !== null ? qv : null) || document.querySelector("[data-can-preorder]");
  return {
    hasPreorder: el?.getAttribute("data-has-preorder") === "true",
    canPreorder: el?.getAttribute("data-can-preorder") === "true",
    stockBehavior: el?.getAttribute("data-stock-behavior") || ""
  };
}

/**
 * Whether the selected variant can be bought (in stock, or preorderable).
 * Ports upstream deb8912/c0de952 and the Zid preorder guide: with an
 * IN_STOCK_ONLY campaign the selected variant itself must be in stock.
 */
export function isSelectedProductBuyable(selectedProduct) {
  if (!selectedProduct) return false;
  if (selectedProduct.in_stock) return true;
  const { canPreorder, stockBehavior } = getPreorderState();
  if (stockBehavior === "IN_STOCK_ONLY") return false;
  return canPreorder || selectedProduct.can_be_preordered === true;
}

export function updateStockStatus(selectedProduct) {
  if (!selectedProduct) return;

  // Update hidden product ID
  const productIdInput = document.querySelector("#product-id");
  if (productIdInput) {
    productIdInput.value = selectedProduct.id;
  }

  const inStockSection = document.querySelector("[data-in-stock]");
  const outOfStockSection = document.querySelector("[data-out-of-stock]");
  const quantityWrapper = document.querySelector("[data-quantity-wrapper]");

  // Dara PDP: "sold out" ribbon over the gallery follows the selected variant
  document.querySelectorAll("[data-pdp-soldout]").forEach((ribbon) => {
    const soldOut = !isSelectedProductBuyable(selectedProduct);
    ribbon.classList.toggle("hidden", !soldOut);
    ribbon.setAttribute("aria-hidden", soldOut ? "false" : "true");
  });

  if (selectedProduct.in_stock) {
    // Show in-stock elements
    if (inStockSection) show("[data-in-stock]");
    if (outOfStockSection) hide("[data-out-of-stock]");

    // Update quantity selector
    updateQuantitySelector(selectedProduct);
    if (quantityWrapper) show("[data-quantity-wrapper]");
  } else if (isSelectedProductBuyable(selectedProduct)) {
    // Out of stock but preorderable: keep the buy buttons, hide notify-me and quantity
    if (inStockSection) show("[data-in-stock]");
    if (outOfStockSection) hide("[data-out-of-stock]");
    if (quantityWrapper) hide("[data-quantity-wrapper]");
  } else {
    // Show out-of-stock elements
    if (inStockSection) hide("[data-in-stock]");
    if (outOfStockSection) show("[data-out-of-stock]");
    if (quantityWrapper) hide("[data-quantity-wrapper]");
  }
}

function updateQuantitySelector(selectedProduct) {
  const quantityEl = document.querySelector("#product-quantity");
  if (!quantityEl) return;

  let maxQuantity = selectedProduct.is_infinite ? 100 : selectedProduct.quantity;
  maxQuantity = Math.min(maxQuantity, 100);

  if (quantityEl.tagName === "SELECT") {
    // Rebuild select options
    let options = "";
    for (let i = 1; i <= maxQuantity; i++) {
      options += `<option value="${i}"${i === 1 ? " selected" : ""}>${i}</option>`;
    }
    quantityEl.innerHTML = options;
  } else if (quantityEl.tagName === "INPUT" && window.updateQtyMax) {
    // Delegate to qty-input.js
    window.updateQtyMax("product-quantity", maxQuantity);
  }
}

// ─────────────────────────────────────────────────────────────
// Gallery Updates
// ─────────────────────────────────────────────────────────────

function escAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function mediaKey(media) {
  return media.map((m) => m?.link || m?.image?.medium || m?.image?.full_size || "").join("|");
}

/**
 * Resolve the gallery that belongs to the product currently being edited:
 * the quick-view gallery when the quick-view dialog is showing, else the PDP one.
 */
function getActiveGalleryWrapper() {
  const qv = document.querySelector("#quick-view-content .pg-wrapper[data-gallery-id]");
  if (qv && qv.offsetParent !== null) return qv;
  return (
    document.getElementById(`${GALLERY_ID}-wrapper`) || document.querySelector(".pg-wrapper[data-gallery-id]")
  );
}

function buildMainSlide(item, index, name) {
  const isVideo = item.provider && item.link;
  const src = item.image?.medium || item.image?.full_size || "";
  const alt = escAttr(item.alt_text || `${name} - ${index + 1}`);
  const img = `<img src="${escAttr(src)}" alt="${alt}"${isVideo ? "" : ` class="cursor-zoom-in" data-lightbox-trigger="${index}"`}${
    index > 0 ? ' loading="lazy"' : ""
  } />`;

  if (!isVideo) {
    return `<div class="swiper-slide pg-main__slide" data-index="${index}">${img}</div>`;
  }

  return `<div class="swiper-slide pg-main__slide" data-index="${index}">
    ${img}
    <button class="pg-slide__video-overlay" type="button" data-video-play data-video-src="${escAttr(item.link)}" aria-label="Play video">
      <span class="pg-slide__play-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="30" height="30" style="margin-left:4px; color:#0B0A09;"><path d="M8 5.14v14l11-7-11-7z"/></svg>
      </span>
    </button>
    <div class="pg-slide__video-container hidden" data-video-container>
      <button type="button" class="pg-slide__video-close" data-video-close aria-label="Close video">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
      <iframe src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
  </div>`;
}

function buildThumbSlide(item, index, cls) {
  const isVideo = item.provider && item.link;
  const src = item.image?.thumbnail || item.image?.medium || "";
  return `<div class="swiper-slide ${cls}" role="button" tabindex="0" aria-label="Thumbnail ${index + 1}">
    <img src="${escAttr(src)}" alt="Thumbnail ${index + 1}" loading="lazy" />
    ${
      isVideo
        ? `<span class="pg-thumb__video-badge" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="16" height="16"><path d="M8 5.14v14l11-7-11-7z"/></svg></span>`
        : ""
    }
  </div>`;
}

/**
 * Update the Swiper product gallery (components/products/product-gallery.jinja)
 * when the selected variant has its own media. Rebuilds main/thumb slides and
 * the hidden PhotoSwipe list, then re-initializes the gallery.
 */
export function updateProductImages(selectedProduct) {
  if (!selectedProduct) return;

  const media = (selectedProduct.media || []).filter((m) => m && (m.image || m.link));
  if (media.length === 0) return; // keep current images

  const wrapper = getActiveGalleryWrapper();
  if (!wrapper) return;
  const galleryId = wrapper.dataset.galleryId;

  // Seed with the server-rendered media so re-selecting it is a no-op
  if (!wrapper.dataset.mediaKey) {
    const initial = window.productObj?.selected_product?.media || window.productObj?.images;
    if (Array.isArray(initial) && initial.length) wrapper.dataset.mediaKey = mediaKey(initial);
  }

  const key = mediaKey(media);
  if (wrapper.dataset.mediaKey === key) return;

  const mainWrapper = document.querySelector(`#${galleryId}-swiper-main .swiper-wrapper`);
  if (!mainWrapper) return;

  if (typeof window.destroyProductGallery === "function") {
    window.destroyProductGallery(galleryId);
  }

  const name = selectedProduct.name || window.productObj?.name || "";
  mainWrapper.innerHTML = media.map((item, i) => buildMainSlide(item, i, name)).join("");

  const thumbsV = document.querySelector(`#${galleryId}-swiper-thumbs-v .swiper-wrapper`);
  const thumbsH = document.querySelector(`#${galleryId}-swiper-thumbs-h .swiper-wrapper`);
  if (thumbsV) thumbsV.innerHTML = media.map((item, i) => buildThumbSlide(item, i, "pg-thumbs__slide")).join("");
  if (thumbsH) thumbsH.innerHTML = media.map((item, i) => buildThumbSlide(item, i, "pg-thumbs-h__slide")).join("");

  const multiple = media.length > 1;
  document.getElementById(`${galleryId}-thumbs-v`)?.classList.toggle("hidden", !multiple);
  document.getElementById(`${galleryId}-thumbs-h`)?.classList.toggle("hidden", !multiple);
  document.getElementById(`${galleryId}-progress`)?.classList.toggle("hidden", !multiple);
  document.getElementById(`${galleryId}-main-prev`)?.classList.toggle("hidden", !multiple);
  document.getElementById(`${galleryId}-main-next`)?.classList.toggle("hidden", !multiple);

  const lightboxGallery = document.getElementById(`${galleryId}-lightbox`);
  if (lightboxGallery) {
    lightboxGallery.innerHTML = media
      .filter((item) => !(item.provider && item.link))
      .map((item, index) => {
        const full = item.image?.full_size || item.image?.medium || "";
        return `<a href="${escAttr(full)}" data-pswp-width="1600" data-pswp-height="2133"><img src="${escAttr(
          item.image?.thumbnail || item.image?.medium || ""
        )}" alt="${escAttr(name)} - ${index + 1}" data-lightbox-item data-lightbox-src="${escAttr(
          full
        )}" data-lightbox-width="1600" data-lightbox-height="2133" /></a>`;
      })
      .join("");
  }

  wrapper.dataset.mediaKey = key;

  requestAnimationFrame(() => {
    if (typeof window.initProductGallery === "function") {
      window.initProductGallery(galleryId);
    }
    window.dispatchEvent(new CustomEvent("product:gallery-updated", { detail: { galleryId } }));
  });
}

// Expose for external use
window.updateProductImages = updateProductImages;

// ─────────────────────────────────────────────────────────────
// Selected Option Labels (port of upstream 01a34d2)
// Color swatches hide their choice text, so show the active value next to
// each option group's label on load and on every variant change.
// ─────────────────────────────────────────────────────────────

export function updateSelectedOptionLabels() {
  document.querySelectorAll(".product-options__group").forEach((group) => {
    const label = group.querySelector(".product-options__label");
    if (!label) return;

    const activeOption = group.querySelector(".product-options__item.active[value]");
    const selectedValue = activeOption?.getAttribute("value");
    let selectedValueElement = label.querySelector("[data-selected-option-value]");

    if (!selectedValue) {
      selectedValueElement?.remove();
      return;
    }

    if (!selectedValueElement) {
      selectedValueElement = document.createElement("span");
      selectedValueElement.setAttribute("data-selected-option-value", "");
      label.append(selectedValueElement);
    }

    selectedValueElement.textContent = `: ${selectedValue}`;
  });
}

// ─────────────────────────────────────────────────────────────
// Main Callback (Called by platform's product.js)
// ─────────────────────────────────────────────────────────────

/**
 * Called by platform's product.js after variant selection changes
 * @param {Object} selectedProduct - The selected variant data from API
 */
window.productOptionsChanged = function (selectedProduct) {
  updateSelectedOptionLabels();

  if (!selectedProduct) {
    // Variant doesn't exist - show out of stock
    hide("[data-in-stock]");
    show("[data-out-of-stock]");
    hide("[data-quantity-wrapper]");
    return;
  }

  // Update all UI sections
  updatePrice(selectedProduct);
  updateProductInfo(selectedProduct);
  updateStockStatus(selectedProduct);
  updateProductImages(selectedProduct);

  // Dispatch custom event for other scripts
  window.dispatchEvent(
    new CustomEvent("product:variant-changed", {
      detail: { selectedProduct }
    })
  );
};

// ─────────────────────────────────────────────────────────────
// Quantity Sync with productObj
// ─────────────────────────────────────────────────────────────

function initProductObjSync() {
  // Update productObj.selected_quantity when quantity changes
  // Button handlers are managed by qty-input.js
  document.addEventListener("qty:change", (e) => {
    if (e.detail?.id === "product-quantity" && window.productObj?.selected_product) {
      window.productObj.selected_product.selected_quantity = Number(e.detail.value) || 1;
    }
    if (e.detail?.id === "product-quantity" || e.detail?.id === "sticky-qty") {
      // The sticky bar syncs its value into the main input; read it after that runs
      requestAnimationFrame(renderPriceTotals);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────

function initUnitPrice() {
  // Before any variant change, the unit price is what the page rendered
  const priceEl = document.querySelector("[data-product-price]");
  if (!priceEl) return;
  unitPrice.current = priceEl.textContent.trim();
  const oldEl = document.querySelector("[data-product-price-old]");
  unitPrice.old = oldEl && !oldEl.classList.contains("hidden") ? oldEl.textContent.trim() || null : null;
}

export function init() {
  initUnitPrice();
  initProductObjSync();
  updateSelectedOptionLabels();
  window.addEventListener("content:loaded", updateSelectedOptionLabels);
  // Instant feedback: the platform toggles .active on click, before the variant API returns
  document.addEventListener("click", (e) => {
    if (e.target.closest?.(".product-options__item")) requestAnimationFrame(updateSelectedOptionLabels);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
