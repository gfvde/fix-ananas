/**
 * Wishlist Module
 *
 * Handles all wishlist functionality with a single-button approach.
 * Updates button content (SVG icon) dynamically based on state.
 */

// ─────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────

const ICONS = {
  // Figma fav button 11459:21677 (unactive = outline, active = espresso fill)
  EMPTY_HEART: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M17.6169 11.0143C19.461 9.20412 19.461 6.26929 17.6169 4.45913C16.1508 3.02006 14.3811 2.57943 12.5955 3.43467C11.8867 3.77413 10.9575 4.45913 10.5 5.35393C10.0425 4.45913 9.11325 3.77413 8.40452 3.43467C6.61887 2.57943 4.8492 3.02006 3.38311 4.45913C1.53896 6.26929 1.53896 9.20412 3.38311 11.0143L9.7995 17.3124C10.1885 17.6942 10.8115 17.6942 11.2005 17.3124L17.6169 11.0143Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  FILLED_HEART: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M17.6169 4.45913C19.461 6.26929 19.461 9.20412 17.6169 11.0143L11.2005 17.3124C10.8115 17.6942 10.1885 17.6942 9.7995 17.3124L3.38311 11.0143C1.53896 9.20412 1.53896 6.26929 3.38311 4.45913C4.8492 3.02006 6.61887 2.57943 8.40452 3.43467C9.11325 3.77413 10.0425 4.45913 10.5 5.35393C10.9575 4.45913 11.8867 3.77413 12.5955 3.43467C14.3811 2.57943 16.1508 3.02006 17.6169 4.45913Z" fill="#6B4A39" stroke="#6B4A39" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  SPINNER: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 animate-spin text-primary" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`
};

// ─────────────────────────────────────────────────────────────
// Wishlist Manager Class
// ─────────────────────────────────────────────────────────────

class WishlistManager {
  constructor() {
    const labels = window.wishlistConfig?.labels || {};
    this.LABELS = {
      addToWishlist: labels.addToWishlist || "",
      removeFromWishlist: labels.removeFromWishlist || "",
      loading: labels.loading || "",
      addedToWishlist: labels.addedToWishlist || "",
      removedFromWishlist: labels.removedFromWishlist || "",
      alreadyInWishlist: labels.alreadyInWishlist || "",
      wishlistTitle: labels.wishlistTitle || "",
      products: labels.products || "",
      loginRequired: labels.loginRequired || "",
      login: labels.login || "",
      wishlistEmpty: labels.wishlistEmpty || "",
      continueShopping: labels.continueShopping || "",
      remove: labels.remove || "",
      close: labels.close || "",
      quickView: labels.quickView || "",
      review: labels.review || "",
      addToCart: labels.addToCart || ""
    };

    this.wishlistProductIds = new Set();
    this.wishlistProducts = [];
    this.isLoggedIn = false;
    this.isInitialized = false;
    this.isZidReady = false;
    this.modal = null;
    this.modalItems = null;
    this.isModalOpen = false;
    this.wishlistPageUrl = window.wishlistConfig?.pageUrl || "/account/wishlist";

    this.handleWishlistClick = this.handleWishlistClick.bind(this);
    this.handleModalClick = this.handleModalClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  async waitForZidSDK() {
    const MAX_RETRIES = 20;
    const INITIAL_DELAY = 100;
    const MAX_DELAY = 2000;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (window.zid) {
        this.isZidReady = true;
        return true;
      }
      const delay = Math.min(INITIAL_DELAY * Math.pow(1.5, attempt), MAX_DELAY);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.isZidReady = false;
    return false;
  }

  async initialize() {
    if (this.isInitialized) return;

    await this.waitForZidSDK();

    if (this.isZidReady) {
      await this.syncWishlistState();
    } else {
      this.isLoggedIn = false;
      this.updateAllButtons();
      this.renderWishlistPage();
    }

    document.addEventListener("click", this.handleWishlistClick);
    document.addEventListener("click", this.handleModalClick);
    document.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("products-updated", () => this.updateAllButtons());
    window.addEventListener("content:loaded", () => this.updateAllButtons());
    // Re-sync after a popup login (customerAuthState is updated by layout.js)
    window.addEventListener("vitrin:auth:success", () => setTimeout(() => this.syncWishlistState(), 0));
    this.createWishlistModal();
    this.renderWishlistPage();

    this.isInitialized = true;
  }

  async handleWishlistClick(event) {
    const openPopupButton = event.target.closest("[data-open-wishlist-popup]");
    if (openPopupButton) {
      event.preventDefault();
      event.stopPropagation();
      this.goToWishlistPage();
      return;
    }

    const button = event.target.closest("[data-wishlist-btn]");
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    const productId = button.dataset.productId;
    if (!productId) return;

    if (!this.isLoggedIn) {
      this.redirectToLogin();
      return;
    }

    if (this.wishlistProductIds.has(productId)) {
      await this.removeFromWishlist(productId);
      this.showToast(this.LABELS.removedFromWishlist, "success");
    } else {
      await this.addToWishlist(productId);
      this.showToast(this.LABELS.addedToWishlist, "success");
    }
    this.renderWishlistPage();
  }

  async handleProductCardWishlist(productId) {
    if (!productId) return;

    if (!this.isLoggedIn) {
      this.redirectToLogin();
      return;
    }

    const normalizedProductId = String(productId);

    if (this.wishlistProductIds.has(normalizedProductId)) {
      await this.removeFromWishlist(normalizedProductId);
      this.showToast(this.LABELS.removedFromWishlist, "success");
    } else {
      await this.addToWishlist(normalizedProductId);
      this.showToast(this.LABELS.addedToWishlist, "success");
    }
  }

  async handleModalClick(event) {
    const closeButton = event.target.closest("[data-wishlist-modal-close]");
    const overlay = event.target.closest("[data-wishlist-modal-overlay]");
    if (closeButton || overlay) {
      this.closeWishlistPopup();
      return;
    }

    const removeButton = event.target.closest("[data-wishlist-remove-id]");
    if (!removeButton) return;

    event.preventDefault();
    const productId = removeButton.dataset.wishlistRemoveId;
    if (!productId) return;

    await this.removeFromWishlist(productId);
    this.showToast(this.LABELS.removedFromWishlist, "success");
    this.renderWishlistItems();
    this.renderWishlistPage();
  }

  handleKeyDown(event) {
    if (event.key === "Escape" && this.isModalOpen) {
      this.closeWishlistPopup();
    }
  }

  async syncWishlistState() {
    // Guests: zid.account.wishlists() is a guaranteed 401 — skip the request.
    const isGuest = window.customerAuthState && !window.customerAuthState.isAuthenticated;
    if (!window.zid?.account?.wishlists || isGuest) {
      this.isLoggedIn = false;
      this.updateAllButtons();
      this.renderWishlistPage();
      return;
    }

    try {
      const response = await window.zid.account.wishlists();
      this.isLoggedIn = true;

      let productIds = [];
      let products = [];
      if (response?.results && Array.isArray(response.results)) {
        products = response.results;
        productIds = products
          .map((item) => this.getProductId(item))
          .filter(Boolean);
      } else if (Array.isArray(response)) {
        products = response;
        productIds = products
          .map((item) => this.getProductId(item) || String(item || ""))
          .filter(Boolean);
      }

      this.wishlistProductIds = new Set(productIds);
      this.wishlistProducts = products;
      this.updateAllButtons();
      this.renderWishlistPage();

      if (this.isModalOpen) {
        this.renderWishlistItems();
      }
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        this.isLoggedIn = false;
        this.updateAllButtons();
        this.renderWishlistPage();
      }
    }
  }

  async addToWishlist(productId) {
    const button = this.getButton(productId);
    if (button) {
      this.setButtonState(button, "loading");
    }

    try {
      const response = await window.zid.account.addToWishlists(
        { product_ids: [productId] },
        { showErrorNotification: true }
      );

      if (response) {
        this.wishlistProductIds.add(String(productId));
        await this.syncWishlistState();
        if (button) {
          this.setButtonState(button, "filled");
        }
      }
    } catch (error) {
      console.error("Failed to add product to wishlist", error);
      if (button) {
        this.setButtonState(button, "empty");
      }
    }
  }

  async removeFromWishlist(productId) {
    const button = this.getButton(productId);
    if (button) {
      this.setButtonState(button, "loading");
    }

    try {
      await window.zid.account.removeFromWishlist(productId, { showErrorNotification: true });
      this.wishlistProductIds.delete(String(productId));
      this.wishlistProducts = this.wishlistProducts.filter((item) => {
        const id = this.getProductId(item);
        return id !== String(productId);
      });
      this.updateAllButtons();
      this.renderWishlistPage();
      if (button) {
        this.setButtonState(button, "empty");
      }
    } catch (error) {
      console.error("Failed to remove product from wishlist", error);
      if (button) {
        this.setButtonState(button, "filled");
      }
    }
  }

  updateAllButtons() {
    const buttons = document.querySelectorAll("[data-wishlist-btn]");

    buttons.forEach((button) => {
      const productId = button.dataset.productId;
      if (!productId) return;

      if (!this.isLoggedIn) {
        this.setButtonState(button, "guest");
      } else if (this.wishlistProductIds.has(productId)) {
        this.setButtonState(button, "filled");
      } else {
        this.setButtonState(button, "empty");
      }
    });
  }

  setButtonState(button, state) {
    switch (state) {
      case "guest":
      case "empty":
        button.innerHTML = ICONS.EMPTY_HEART;
        button.setAttribute("aria-label", this.LABELS.addToWishlist);
        button.disabled = false;
        break;
      case "filled":
        button.innerHTML = ICONS.FILLED_HEART;
        button.setAttribute("aria-label", this.LABELS.removeFromWishlist);
        button.disabled = false;
        break;
      case "loading":
        button.innerHTML = ICONS.SPINNER;
        button.setAttribute("aria-label", this.LABELS.loading);
        button.disabled = true;
        break;
    }
  }

  getButton(productId) {
    return document.querySelector(`[data-wishlist-btn][data-product-id="${productId}"]`);
  }

  getWishlistPageContainer() {
    return document.querySelector("[data-wishlist-page-items]");
  }

  goToWishlistPage() {
    window.location.href = this.wishlistPageUrl;
  }

  showToast(message, type = "success") {
    if (window.toastr?.[type]) {
      window.toastr[type](message);
      return;
    }

    window.dispatchEvent(
      new CustomEvent("toast:show", {
        detail: { message, type }
      })
    );
  }

  getProductId(product) {
    return String(product?.id || product?.product_id || product?.product?.id || product?.product?.product_id || "");
  }

  getProductName(product) {
    return product?.name || product?.title || product?.product?.name || product?.product?.title || "Product";
  }

  getProductUrl(product) {
    const slug = product?.slug || product?.product?.slug;
    return product?.url || product?.product_url || product?.html_url || product?.product?.url || product?.product?.product_url || (slug ? `/products/${slug}` : "#");
  }

  getProductSlug(product) {
    const url = this.getProductUrl(product);
    return product?.slug || product?.product?.slug || url.split("/p/")[1]?.split("?")[0] || url.split("/products/")[1]?.split("?")[0] || "";
  }

  getProductImage(product) {
    const images = product?.images || product?.product?.images || [];
    return product?.image?.medium?.url ||
      product?.image?.medium ||
      product?.image?.url ||
      product?.main_image?.image?.medium ||
      product?.main_image?.image?.url ||
      product?.product?.image?.medium?.url ||
      product?.product?.image?.url ||
      product?.product?.main_image?.image?.medium ||
      product?.product?.main_image?.image?.url ||
      images?.[0]?.image?.medium?.url ||
      images?.[0]?.image?.medium ||
      images?.[0]?.image?.url ||
      images?.[0]?.url ||
      "";
  }

  getProductPrice(product) {
    return product?.formatted_sale_price ||
      product?.formatted_price ||
      product?.price_string ||
      product?.sale_price_string ||
      product?.product?.formatted_sale_price ||
      product?.product?.formatted_price ||
      product?.product?.price_string ||
      product?.price ||
      "";
  }

  getProductOriginalPrice(product) {
    return product?.formatted_price ||
      product?.regular_price_string ||
      product?.product?.formatted_price ||
      product?.product?.regular_price_string ||
      "";
  }

  getProductSalePrice(product) {
    return product?.formatted_sale_price ||
      product?.sale_price_string ||
      product?.product?.formatted_sale_price ||
      product?.product?.sale_price_string ||
      "";
  }

  getProductDiscount(product) {
    return product?.discount_percentage || product?.product?.discount_percentage || "";
  }

  getProductTags(product) {
    const tags = product?.tags || product?.product?.tags || [];
    if (!Array.isArray(tags)) return [];
    return tags
      .map((tag) => tag?.name || tag?.title || tag)
      .filter(Boolean)
      .slice(0, 3);
  }

  getProductRating(product) {
    const rating = product?.rating || product?.product?.rating || {};
    const score = rating?.average || product?.rating_average || product?.product?.rating_average || "";
    const count = rating?.total_count || product?.rating_count || product?.product?.rating_count || "";
    return { score, count };
  }

  hasProductOptions(product) {
    return Boolean(product?.has_options || product?.has_fields || product?.product?.has_options || product?.product?.has_fields);
  }

  createWishlistModal() {
    if (document.getElementById("wishlist-popup-modal")) {
      this.modal = document.getElementById("wishlist-popup-modal");
      this.modalItems = this.modal.querySelector("[data-wishlist-items]");
      return;
    }

    const modal = document.createElement("div");
    modal.id = "wishlist-popup-modal";
    modal.className = "fixed inset-0 z-[120] hidden";
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black/60" data-wishlist-modal-overlay></div>
      <div class="absolute inset-0 p-2 sm:p-4">
        <div class="mx-auto flex h-full w-full max-w-7xl flex-col rounded-2xl bg-background shadow-2xl">
          <div class="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-4 sm:px-6">
            <h3 class="text-lg font-semibold sm:text-xl">${this.escapeHtml(this.LABELS.wishlistTitle)}</h3>
            <button type="button" class="btn btn-icon btn-sm" data-wishlist-modal-close aria-label="${this.escapeHtml(this.LABELS.close)}">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6 6L18 18M6 18L18 6" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-4 sm:p-6">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-wishlist-items></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;
    this.modalItems = modal.querySelector("[data-wishlist-items]");
  }

  async openWishlistPopup() {
    if (!this.isLoggedIn) {
      await this.syncWishlistState();
    }
    if (!this.isLoggedIn) {
      this.redirectToLogin();
      return;
    }

    if (!this.modal) this.createWishlistModal();
    await this.syncWishlistState();
    this.renderWishlistItems();
    this.modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
    this.isModalOpen = true;
  }

  closeWishlistPopup() {
    if (!this.modal) return;
    this.modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
    this.isModalOpen = false;
  }

  renderWishlistPage() {
    const container = this.getWishlistPageContainer();
    if (!container) return;
    const countLabel = document.querySelector("[data-wishlist-count]");
    if (countLabel) {
      countLabel.textContent = `( ${this.wishlistProducts.length} ${this.LABELS.products} )`;
    }

    if (!this.isZidReady) {
      container.innerHTML = `
        <div class="wishlist-page__notice">
          ${this.escapeHtml(this.LABELS.loading)}
        </div>
      `;
      return;
    }

    if (!this.isLoggedIn) {
      container.innerHTML = `
        <div class="wishlist-page__empty">
          <p>${this.escapeHtml(this.LABELS.loginRequired)}</p>
          <a href="/auth/login?redirect_to=${encodeURIComponent(window.location.pathname)}" class="wishlist-page__login">
            ${this.escapeHtml(this.LABELS.login)}
          </a>
        </div>
      `;
      return;
    }

    if (!this.wishlistProducts.length) {
      container.innerHTML = `
        <div class="wishlist-page__empty">
          <p>${this.escapeHtml(this.LABELS.wishlistEmpty)}</p>
          <a href="/products/" class="wishlist-page__login">
            ${this.escapeHtml(this.LABELS.continueShopping)}
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="wishlist-page__grid">
        ${this.wishlistProducts.map((product) => this.renderWishlistPageCard(product)).join("")}
      </div>
    `;
    window.dispatchEvent(new CustomEvent("content:loaded"));
  }

  renderWishlistPageCard(product) {
    const id = this.getProductId(product);
    const name = this.getProductName(product);
    const url = this.getProductUrl(product);
    const slug = this.getProductSlug(product);
    const image = this.getProductImage(product);
    const fallbackPrice = this.getProductPrice(product);
    const salePrice = this.getProductSalePrice(product);
    const originalPrice = this.getProductOriginalPrice(product);
    const discount = this.getProductDiscount(product);
    const tags = this.getProductTags(product);
    const rating = this.getProductRating(product);
    const badge = product?.badge?.name || product?.badge?.body || product?.badge || product?.product?.badge?.name || product?.product?.badge?.body || product?.product?.badge || "";
    const hasOptions = this.hasProductOptions(product);
    const priceMarkup = salePrice ? `
      <div class="pc-price-wrap">
        <span class="pc-price">${this.escapeHtml(salePrice)}</span>
        ${originalPrice ? `<span class="pc-price--old">${this.escapeHtml(originalPrice)}</span>` : ""}
        ${discount ? `<span class="pc-discount">${this.escapeHtml(discount)}%</span>` : ""}
      </div>
    ` : fallbackPrice ? `
      <div class="pc-price-wrap">
        <span class="pc-price">${this.escapeHtml(fallbackPrice)}</span>
      </div>
    ` : "";

    const esc = (v) => this.escapeHtml(v);
    const ctaAttrs = hasOptions
      ? `data-open-quick-view="true" data-product-id="${esc(id)}"`
      : `data-add-to-cart="${esc(id)}"`;
    const starSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="#B59A70" stroke="none" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"></path></svg>`;

    return `
      <article class="pc-card wishlist-page-product-card" data-product-card="${esc(id)}" data-product-slug="${esc(slug)}">
        <div class="pc-img-wrap">
          <a href="${esc(url)}" class="pc-img-link" tabindex="-1" aria-hidden="true">
            ${image ? `<img src="${esc(image)}" alt="${esc(name)}" class="pc-img" loading="lazy">` : `<span class="pc-img wishlist-page-product-card__placeholder"></span>`}
          </a>
          <div class="pc-badges">
            ${badge && typeof badge === "string" ? `<span class="pc-badge-pill">${esc(badge)}</span>` : ""}
          </div>
          <div class="pc-actions">
            ${id ? `
              <button type="button" class="pc-action-btn pc-action-btn--wishlist-remove" data-wishlist-remove-id="${esc(id)}" aria-label="${esc(this.LABELS.removeFromWishlist)}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M6 6L18 18M18 6L6 18"></path>
                </svg>
              </button>
            ` : ""}
            <button type="button" class="pc-action-btn pc-action-btn--quick-view" data-open-quick-view="true" data-product-id="${esc(id)}" aria-label="${esc(this.LABELS.quickView)}">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M19 10.1041C19 10.1041 16.984 16.1034 10.5 15.9986C4.01603 15.8939 2 10.1041 2 10.1041C2 10.1041 3.93429 4 10.5 4C17.0657 4 19 10.1041 19 10.1041ZM12.625 10.0255C12.625 11.1541 11.6736 12.069 10.5 12.069C9.32639 12.069 8.375 11.1541 8.375 10.0255C8.375 8.89696 9.32639 7.98208 10.5 7.98208C11.6736 7.98208 12.625 8.89696 12.625 10.0255Z" stroke="currentColor" stroke-width="1.5"></path>
              </svg>
            </button>
          </div>
          <div class="pc-cta-wrap">
            <button type="button" class="pc-cta" ${ctaAttrs}>${esc(this.LABELS.addToCart)}</button>
          </div>
        </div>
        <div class="pc-info">
          <h3 class="pc-name"><a href="${esc(url)}">${esc(name)}</a></h3>
          ${tags.length ? `
            <div class="pc-tags-container" data-pc-tags>
              <div class="pc-tags-wrapper"><div class="pc-tags-track"><span class="pc-tags-set">${tags.map((tag) => `<span class="pc-tag">${esc(tag)}</span>`).join("")}</span></div></div>
              <button type="button" class="pc-tags-scroll-btn" tabindex="-1" aria-hidden="true"><svg width="16" height="24" viewBox="0 0 16 24" fill="none"><path d="M10 17L5 12L10 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            </div>
          ` : ""}
          ${(rating.score || rating.count) ? `
            <div class="pc-rating">
              <span class="pc-rating__stars">${starSvg}${rating.score ? `<span class="pc-rating__score">${esc(rating.score)}</span>` : ""}</span>
              ${rating.count ? `<span class="pc-rating__count">(${esc(rating.count)})</span>` : ""}
            </div>
          ` : ""}
          ${priceMarkup}
          <div class="pc-cta-wrap-mb-card">
            <button type="button" class="pc-cta" ${ctaAttrs}>${esc(this.LABELS.addToCart)}</button>
          </div>
        </div>
      </article>
    `;
  }

  renderWishlistItems() {
    if (!this.modalItems) return;

    if (!this.wishlistProducts.length) {
      this.modalItems.innerHTML = `
        <div class="col-span-full rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
          ${this.escapeHtml(this.LABELS.wishlistEmpty)}
        </div>
      `;
      return;
    }

    this.modalItems.innerHTML = this.wishlistProducts
      .map((product) => {
        const id = String(product?.id || product?.product_id || "");
        const name = this.escapeHtml(product?.name || product?.title || "Product");
        const image = product?.image?.medium?.url ||
          product?.image?.url ||
          product?.images?.[0]?.image?.medium ||
          product?.images?.[0]?.image?.url ||
          product?.images?.[0]?.url ||
          "";
        const url = product?.url || product?.product_url || "#";
        const price = this.escapeHtml(product?.price_string || product?.price || "");

        return `
          <article class="group overflow-hidden rounded-xl border border-border bg-background">
            <a href="${this.escapeHtml(url)}" class="block aspect-square overflow-hidden bg-muted">
              ${image ? `<img src="${this.escapeHtml(image)}" alt="${name}" class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy">` : ""}
            </a>
            <div class="space-y-3 p-3">
              <a href="${this.escapeHtml(url)}" class="line-clamp-2 text-sm font-medium">${name}</a>
              <div class="flex items-center justify-between gap-2">
                ${price ? `<p class="text-sm text-primary">${price}</p>` : `<span></span>`}
                <button type="button" class="btn btn-sm btn-outline" data-wishlist-remove-id="${id}">
                  ${this.escapeHtml(this.LABELS.remove)}
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  redirectToLogin() {
    // Prefer the platform login popup (auth_dialog) via the shared handler
    if (typeof window.handleLoginAction === "function") {
      window.handleLoginAction("", false);
      return;
    }
    const currentPath = window.location.pathname;
    window.location.href = `/auth/login?redirect_to=${encodeURIComponent(currentPath)}`;
  }

  isInWishlist(productId) {
    return this.wishlistProductIds.has(productId);
  }

  async refresh() {
    if (!this.isZidReady) {
      await this.waitForZidSDK();
    }
    if (this.isZidReady) {
      await this.syncWishlistState();
    }
  }

  destroy() {
    document.removeEventListener("click", this.handleWishlistClick);
    document.removeEventListener("click", this.handleModalClick);
    document.removeEventListener("keydown", this.handleKeyDown);
    this.wishlistProductIds.clear();
    this.wishlistProducts = [];
    this.isInitialized = false;
  }
}

// ─────────────────────────────────────────────────────────────
// Global Instance
// ─────────────────────────────────────────────────────────────

const wishlistManager = new WishlistManager();
window.wishlistManager = wishlistManager;

// ─────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────

export function init() {
  wishlistManager.initialize();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

export { wishlistManager };
export default WishlistManager;
