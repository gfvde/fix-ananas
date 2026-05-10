/**
 * Search Module
 *
 * Handles search dialog with live results.
 * Uses el-dialog for modal behavior.
 */

class SearchManager {
  constructor() {
    this.dialog = null;
    this.input = null;
    this.clearBtn = null;
    this.resultsContainer = null;
    this.productsContainer = null;
    this.loadingContainer = null;
    this.emptyContainer = null;
    this.searchAllLink = null;
    this.searchAllText = null;
    this.featuredTrack = null;
    this.featuredLoaded = false;

    this.debounceTimeout = null;
    this.debounceDelay = 300;
    this.minQueryLength = 2;
    this.maxResults = 8;
  }

  init() {
    this.dialog = document.getElementById("search-dialog-wrapper");
    this.input = document.getElementById("nav-search-input") || document.querySelector("[data-search-input]");
    this.clearBtn = document.querySelector("[data-search-clear]");
    this.resultsContainer = document.querySelector("[data-search-results]");
    this.productsContainer = document.querySelector("[data-search-products]");
    this.loadingContainer = document.querySelector("[data-search-loading]");
    this.emptyContainer = document.querySelector("[data-search-empty]");
    this.searchAllLink = document.querySelector("[data-search-all-link]");
    this.searchAllText = document.querySelector("[data-search-all-text]");
    this.featuredTrack = document.getElementById("search-track");

    this.bindEvents();
  }

  bindEvents() {
    if (this.input) {
      this.input.addEventListener("input", () => this.handleInput());
      this.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const query = this.input.value.trim();
          if (query.length >= this.minQueryLength) {
            this.navigateToSearch(query);
          }
        }
      });
    }

    const panel = document.getElementById("nav-search-panel");
    if (panel) {
      new MutationObserver(() => {
        if (panel.classList.contains("is-open")) {
          this.loadFeaturedProducts();
        }
      }).observe(panel, { attributes: true, attributeFilter: ["class"] });
    }

    if (this.clearBtn) {
      this.clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.clearInput();
        if (this.input) this.input.focus();
      });
    }

    if (this.dialog) {
      this.dialog.addEventListener("open", () => {
        requestAnimationFrame(() => this.input && this.input.focus());
      });

      this.dialog.addEventListener("close", () => {
        this.clearInput();
        this.hideAllStates();
      });
    }
  }

  async loadFeaturedProducts() {
    if (this.featuredLoaded || !this.featuredTrack) return;
    if (this.featuredTrack.children.length > 0) {
      this.featuredLoaded = true;
      return;
    }

    try {
      if (!window.zid || !window.zid.products) return;

      const response = await window.zid.products.list({ page_size: 8 }, { showErrorNotification: false });

      const products = response?.results || response?.data?.results || response?.products || [];

      if (products.length > 0) {
        if (typeof window.renderSearchProducts === "function") {
          window.renderSearchProducts(products);
        } else {
          this.featuredTrack.innerHTML = products.map((p) => this.renderFeaturedCard(p)).join("");
        }
        window.featuredSearchHTML = this.featuredTrack ? this.featuredTrack.innerHTML : "";
        this.featuredLoaded = true;
      }
    } catch (e) {
      // silently fail
    }
  }

  renderFeaturedCard(product) {
    const img = product.main_image?.image?.medium || product.images?.[0]?.image?.medium || "";
    const url = product.html_url || "#";
    const price = product.formatted_sale_price || product.formatted_price || "";
    const hasOptions = product.has_options || product.has_fields;
    const name = this.escapeHtml(product.name || "");
    const addToCartAttr = hasOptions ? `data-open-quick-view="true"` : `data-add-to-cart="${product.id}"`;

    return `
      <div class="ananas-pcard" data-search-product-card>
        <div class="ananas-pcard__img-wrap">
          <a href="${url}" class="ananas-pcard__link" tabindex="-1" aria-hidden="true">
            ${img ? `<img src="${img}" alt="${name}" class="ananas-pcard__img" loading="lazy">` : ""}
          </a>
        </div>
        <div class="ananas-pcard__body">
          <div class="ananas-pcard__info">
            <a href="${url}" class="ananas-pcard__name">${name}</a>
            <div class="ananas-pcard__price">${this.escapeHtml(price)}</div>
          </div>
          <div class="ananas-pcard__actions">
            <button class="ananas-pcard__btn ananas-pcard__btn--wishlist" type="button" data-wishlist-btn data-product-id="${product.id}" aria-label="Add to wishlist">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 17.5S2.5 13 2.5 7.5A3.75 3.75 0 0 1 10 5.26 3.75 3.75 0 0 1 17.5 7.5C17.5 13 10 17.5 10 17.5Z" stroke="currentColor" stroke-width="1.3"/></svg>
            </button>
            <button class="ananas-pcard__btn ananas-pcard__btn--cart" type="button" ${addToCartAttr} data-product-id="${product.id}" aria-label="Add to cart">
              ${this.renderSearchCartIcon()}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderSearchCartIcon() {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M16.7505 4.24995L0.751039 4.24972L0.75 4.25M16.7505 4.24995L16.75 15.3467C16.75 16.3978 15.8817 17.25 14.8106 17.25H2.68939C1.6183 17.25 0.75 16.3978 0.75 15.3467V4.25M16.7505 4.24995L13.5429 1.04289C13.3554 0.855357 13.101 0.75 12.8358 0.75H4.66421C4.399 0.75 4.14464 0.855357 3.95711 1.04289L0.75 4.25M11.75 7.25C11.75 8.90686 10.4069 10.25 8.75 10.25C7.09315 10.25 5.75 8.90686 5.75 7.25" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  handleInput() {
    const query = this.input.value.trim();

    if (this.clearBtn) {
      this.clearBtn.classList.toggle("hidden", query.length === 0);
    }

    this.updateSearchAllLink(query);

    clearTimeout(this.debounceTimeout);

    if (query.length < this.minQueryLength) {
      this.hideAllStates();
      return;
    }

    this.debounceTimeout = setTimeout(() => {
      this.search(query);
    }, this.debounceDelay);
  }

  async search(query) {
    this.showLoading();

    try {
      if (!window.zid || !window.zid.products) {
        this.showEmpty();
        return;
      }

      const response = await window.zid.products.list(
        { page_size: this.maxResults, q: query },
        { showErrorNotification: false }
      );

      if (response && response.results && response.results.length > 0) {
        const products = response.results.map((product) => ({
          id: product.id,
          url: product.html_url,
          image: product.main_image?.image?.small || product.images?.[0]?.image?.small || null,
          name: product.name,
          price: product.formatted_price || "",
          salePrice: product.formatted_sale_price || null,
          hasOptions: product.has_options || false,
          rating: product.rating || null,
          badges: this.getProductBadges(product)
        }));
        this.showResults(products);
      } else {
        this.showEmpty();
      }
    } catch (error) {
      this.showEmpty();
    }
  }

  getProductBadges(product) {
    const badges = [];
    const lang = document.documentElement.lang || "ar";

    if (product.badge?.body) {
      const badgeText = product.badge.body[lang] || product.badge.body.ar || product.badge.body.en || "";
      if (badgeText) badges.push(badgeText);
    }

    if (product.sale_price && product.sale_price < product.price) {
      badges.push(window.ananasTranslations?.sale || "Sale");
    }

    if (
      product.in_stock === false ||
      (product.is_infinite === false && product.quantity !== null && product.quantity <= 0)
    ) {
      badges.push(window.ananasTranslations?.outOfStock || "Out of stock");
    }

    if (product.keywords?.length > 0 && badges.length < 2) {
      const remaining = 2 - badges.length;
      badges.push(...product.keywords.slice(0, remaining).map((k) => k.toUpperCase()));
    }

    return badges.slice(0, 2);
  }

  showResults(products) {
    this.hideAllStates();

    const html = products
      .map(
        (product) => `
      <a href="${product.url}" class="block w-[320px] shrink-0 md:w-[380px]">
        <div class="relative aspect-[3/4] overflow-hidden rounded">
          ${product.image ? `<img src="${product.image}" alt="${this.escapeHtml(product.name)}" class="h-full w-full object-cover" loading="lazy" />` : '<div class="bg-secondary h-full w-full rounded"></div>'}
          ${product.badges.length > 0 ? `<div class="absolute left-4 top-4 flex flex-col gap-1 rtl:left-auto rtl:right-4">${product.badges.map((b) => `<span class="bg-secondary text-foreground text-xs uppercase tracking-wide rounded px-2 py-1">${this.escapeHtml(b)}</span>`).join("")}</div>` : ""}
        </div>
        <div class="mt-4 flex flex-col gap-2">
          <div class="flex flex-col gap-1">
            <h3 class="text-foreground text-sm font-medium">${this.escapeHtml(product.name)}</h3>
            ${this.renderRating(product.rating)}
          </div>
          ${this.renderPrice(product)}
        </div>
      </a>
    `
      )
      .join("");

    if (this.productsContainer) {
      this.productsContainer.innerHTML = html;
    }
    if (this.resultsContainer) {
      this.resultsContainer.classList.remove("hidden");
      this.resultsContainer.classList.add("flex");
    }
  }

  renderRating(rating) {
    if (!rating || !rating.average) return "";

    const ratingRounded = Math.ceil(rating.average * 2) / 2;
    const starPath =
      "M8 11.1733L11.5733 13.3333L10.6933 9.30667L13.7333 6.59333L9.63333 6.28L8 2.5L6.36667 6.28L2.26667 6.59333L5.30667 9.30667L4.42667 13.3333L8 11.1733Z";

    let starsHtml = "";
    for (let n = 1; n <= 5; n++) {
      if (n <= ratingRounded) {
        starsHtml += `<svg class="size-4 text-foreground" viewBox="0 0 16 16" fill="currentColor"><path d="${starPath}"/></svg>`;
      } else if (n <= ratingRounded + 0.5) {
        starsHtml += `<svg class="size-4" viewBox="0 0 16 16" fill="none">
          <defs><linearGradient id="half-star-search-${n}"><stop offset="50%" stop-color="var(--color-foreground)"/><stop offset="50%" stop-color="var(--color-text-disabled)"/></linearGradient></defs>
          <path d="${starPath}" fill="url(#half-star-search-${n})"/>
        </svg>`;
      } else {
        starsHtml += `<svg class="size-4 text-text-disabled" viewBox="0 0 16 16" fill="currentColor"><path d="${starPath}"/></svg>`;
      }
    }

    return `
      <div class="flex items-center gap-2">
        <div class="flex gap-0.5">${starsHtml}</div>
        ${rating.total_count ? `<span class="text-muted text-sm">(${rating.total_count})</span>` : ""}
      </div>
    `;
  }

  renderPrice(product) {
    const fromPrefix = product.hasOptions ? `${window.ananasTranslations?.from || "From"} ` : "";

    if (product.salePrice) {
      return `
        <div class="flex flex-col">
          <p class="text-foreground text-sm">${fromPrefix}${this.escapeHtml(product.salePrice)}</p>
          <span class="text-destructive text-sm line-through">${this.escapeHtml(product.price)}</span>
        </div>
      `;
    }

    return `<p class="text-foreground text-sm">${fromPrefix}${this.escapeHtml(product.price)}</p>`;
  }

  showLoading() {
    this.hideAllStates();
    if (this.loadingContainer) {
      this.loadingContainer.classList.remove("hidden");
      this.loadingContainer.classList.add("flex");
    }
  }

  showEmpty() {
    this.hideAllStates();
    if (this.emptyContainer) {
      this.emptyContainer.classList.remove("hidden");
      this.emptyContainer.classList.add("block");
    }
  }

  hideAllStates() {
    if (this.resultsContainer) {
      this.resultsContainer.classList.add("hidden");
      this.resultsContainer.classList.remove("flex");
    }
    if (this.loadingContainer) {
      this.loadingContainer.classList.add("hidden");
      this.loadingContainer.classList.remove("flex");
    }
    if (this.emptyContainer) {
      this.emptyContainer.classList.add("hidden");
      this.emptyContainer.classList.remove("block");
    }
  }

  updateSearchAllLink(query) {
    if (!this.searchAllLink || !this.searchAllText) return;

    const searchForText = this.searchAllText.textContent.split("'")[0];
    this.searchAllText.textContent = `${searchForText}'${query}'`;

    const url = new URL(window.location.origin + "/products");
    if (query) {
      url.searchParams.set("q", query);
    }
    this.searchAllLink.setAttribute("href", url.toString());
  }

  navigateToSearch(query) {
    const url = new URL(window.location.origin + "/products");
    url.searchParams.set("q", query);
    window.location.href = url.toString();
  }

  clearInput() {
    if (this.input) this.input.value = "";
    if (this.clearBtn) {
      this.clearBtn.classList.add("hidden");
    }
    this.updateSearchAllLink("");
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// ─────────────────────────────────────────────────────────────
// Global Instance
// ─────────────────────────────────────────────────────────────

const searchManager = new SearchManager();
window.searchManager = searchManager;

// ─────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────

export function init() {
  searchManager.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

export { searchManager };
export default SearchManager;
