/**
 * Product Filter Module
 *
 * Handles AJAX-based filtering without page reloads.
 * Uses native fetch() and History API.
 */

class ProductFilter {
  constructor(options = {}) {
    this.contentSelector = options.contentSelector || "#products-content";
    this.loadingClass = options.loadingClass || "opacity-50";
    this.isLoading = false;
    this.infiniteObserver = null;
    this.isLoadingMore = false;
    this.isHydratingCategoryFilters = false;
    this.hasScheduledLayoutRefresh = false;
  }

  init() {
    const content = document.querySelector(this.contentSelector);
    if (!content) return;
    window.addEventListener("popstate", () => this.fetchProducts());
    // "Load more" link: real next-page link (no-JS fallback), loads in place with JS
    document.addEventListener("click", (event) => {
      const more = event.target.closest?.("[data-infinite-more]");
      if (!more) return;
      const sentinel = more.closest("[data-infinite-scroll]");
      if (!sentinel?.dataset.nextUrl) return;
      event.preventDefault();
      this.loadNextPage(sentinel);
    });
    this.applyClientSideAvailability();
    this.initInfiniteScroll();
    this.hydrateCategoryFilters();
    this.scheduleLayoutRefresh();
  }

  scheduleLayoutRefresh(force = false) {
    if (this.hasScheduledLayoutRefresh && !force) return;
    this.hasScheduledLayoutRefresh = true;

    const refresh = () => {
      document.querySelectorAll(".products-with-sidebar").forEach((root) => {
        root.classList.add("products-with-sidebar--ready");
        root.classList.remove("products-with-sidebar--pending");
      });
      window.dispatchEvent(new Event("resize"));
    };

    requestAnimationFrame(refresh);
    window.setTimeout(refresh, 120);
  }

  async applyFilter(params = {}, options = {}) {
    const { resetPage = true } = options;
    const url = new URL(window.location.href);

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        url.searchParams.delete(key);
      } else if (Array.isArray(value)) {
        url.searchParams.delete(key);
        value.forEach((v) => url.searchParams.append(key, v));
      } else {
        url.searchParams.set(key, String(value));
      }
    });

    if (resetPage) {
      url.searchParams.delete("page");
    }

    const cleanUrl = this.buildCleanUrl(url);
    history.pushState({}, "", cleanUrl);

    await this.fetchProducts();
  }

  buildCleanUrl(url) {
    const params = [];

    url.searchParams.forEach((value, key) => {
      params.push(`${key}=${encodeURIComponent(value)}`);
    });

    const queryString = params.length > 0 ? "?" + params.join("&") : "";
    return url.pathname + queryString;
  }

  async fetchProducts() {
    if (this.isLoading) return;

    const content = document.querySelector(this.contentSelector);
    if (!content) {
      return;
    }

    this.isLoading = true;
    this.setLoadingState(content, true);

    try {
      const response = await fetch(window.location.href, {
        headers: { "X-Requested-With": "XMLHttpRequest" }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const newContent = doc.querySelector(this.contentSelector);

      if (newContent) {
        content.innerHTML = newContent.innerHTML;
        this.reinitializeComponents(content);
      } else {
        console.warn("ProductFilter: Could not find new content in response");
      }
    } catch (error) {
      console.error("ProductFilter: Fetch error", error);
      window.location.reload();
    } finally {
      this.isLoading = false;
      this.setLoadingState(content, false);
    }
  }

  setLoadingState(element, isLoading) {
    if (isLoading) {
      element.classList.add(this.loadingClass);
      element.style.pointerEvents = "none";
      element.setAttribute("aria-busy", "true");
    } else {
      element.classList.remove(this.loadingClass);
      element.style.pointerEvents = "";
      element.setAttribute("aria-busy", "false");
    }
  }

  reinitializeComponents(container) {
    this.applyClientSideAvailability(container);
    if (typeof window.initPriceSliders === "function") {
      window.initPriceSliders();
    }
    this.initInfiniteScroll();
    this.updateInfiniteCounts(container);
    this.hydrateCategoryFilters();
    this.scheduleLayoutRefresh(true);
    window.dispatchEvent(new CustomEvent("products-updated", { detail: { container } }));
  }

  isCategoryPage() {
    return /^\/categories(\/|$)/.test(window.location.pathname);
  }

  getAttributeFilterCount(root = document) {
    return root.querySelectorAll(".products-filter-sidebar .product-filter--attribute").length;
  }

  buildAllProductsFilterUrl() {
    const url = new URL("/products/", window.location.origin);
    const currentUrl = new URL(window.location.href);

    currentUrl.searchParams.forEach((value, key) => {
      if (key !== "page") {
        url.searchParams.append(key, value);
      }
    });

    return url.toString();
  }

  replaceIfRicher(targetSelector, sourceDoc, sourceSelector, countSelector) {
    const target = document.querySelector(targetSelector);
    const source = sourceDoc.querySelector(sourceSelector);

    if (!target || !source) return false;

    const targetCount = target.querySelectorAll(countSelector).length;
    const sourceCount = source.querySelectorAll(countSelector).length;

    if (sourceCount <= targetCount) return false;

    target.replaceWith(document.importNode(source, true));
    return true;
  }

  async hydrateCategoryFilters() {
    if (!this.isCategoryPage() || this.isHydratingCategoryFilters) return;

    const currentCount = this.getAttributeFilterCount();
    this.isHydratingCategoryFilters = true;

    try {
      const response = await fetch(this.buildAllProductsFilterUrl(), {
        headers: { "X-Requested-With": "XMLHttpRequest" }
      });

      if (!response.ok) return;

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const sourceCount = this.getAttributeFilterCount(doc);

      if (sourceCount <= currentCount) return;

      const sidebarChanged = this.replaceIfRicher(
        ".products-filter-sidebar .filters--sidebar.products-filter-sidebar__section",
        doc,
        ".products-filter-sidebar .filters--sidebar.products-filter-sidebar__section",
        ".product-filter--attribute"
      );

      const drawerChanged = this.replaceIfRicher(
        "#filters-drawer .filters--sidebar",
        doc,
        "#filters-drawer .filters--sidebar",
        ".product-filter--attribute"
      );

      const mobileChanged = this.replaceIfRicher(
        ".mobile-inline-filters__chips",
        doc,
        ".mobile-inline-filters__chips",
        ".mobile-inline-filter"
      );

      if (sidebarChanged || drawerChanged || mobileChanged) {
        if (typeof window.initPriceSliders === "function") {
          window.initPriceSliders();
        }
        this.scheduleLayoutRefresh(true);
        window.dispatchEvent(new CustomEvent("category-filters-hydrated"));
      }
    } catch (error) {
      console.warn("ProductFilter: Could not hydrate category filters", error);
    } finally {
      this.isHydratingCategoryFilters = false;
    }
  }

  initInfiniteScroll() {
    if (this.infiniteObserver) {
      this.infiniteObserver.disconnect();
      this.infiniteObserver = null;
    }

    const sentinel = document.querySelector("[data-infinite-scroll]");
    if (!sentinel || !sentinel.dataset.nextUrl) return;

    this.infiniteObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.loadNextPage(sentinel);
          }
        });
      },
      { rootMargin: "500px 0px 700px" }
    );

    this.infiniteObserver.observe(sentinel);
  }

  async loadNextPage(sentinel) {
    if (this.isLoadingMore || !sentinel?.dataset.nextUrl) return;

    const grid = document.querySelector("[data-grid-root]");
    if (!grid) return;

    const nextUrl = sentinel.dataset.nextUrl;
    const loader = sentinel.querySelector("[data-infinite-loader]");

    this.isLoadingMore = true;
    if (loader) loader.hidden = false;

    try {
      const response = await fetch(nextUrl, {
        headers: { "X-Requested-With": "XMLHttpRequest" }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const nextGrid = doc.querySelector("[data-grid-root]");
      const nextSentinel = doc.querySelector("[data-infinite-scroll]");

      if (!nextGrid) {
        sentinel.removeAttribute("data-next-url");
        sentinel.querySelector("[data-infinite-more]")?.remove();
        return;
      }

      Array.from(nextGrid.children).forEach((item) => {
        grid.appendChild(document.importNode(item, true));
      });

      const moreLink = sentinel.querySelector("[data-infinite-more]");
      if (nextSentinel?.dataset.nextUrl) {
        sentinel.dataset.nextUrl = nextSentinel.dataset.nextUrl;
        sentinel.dataset.currentPage = nextSentinel.dataset.currentPage || sentinel.dataset.currentPage;
        if (moreLink) moreLink.href = nextSentinel.dataset.nextUrl;
      } else {
        sentinel.removeAttribute("data-next-url");
        if (moreLink) moreLink.remove();
        if (this.infiniteObserver) {
          this.infiniteObserver.disconnect();
          this.infiniteObserver = null;
        }
      }

      const previousLoaded = Number.parseInt(sentinel.dataset.loadedCount || "0", 10);
      const added = nextGrid.children.length;
      sentinel.dataset.loadedCount = String(previousLoaded + added);

      this.applyClientSideAvailability(grid);
      this.updateInfiniteCounts();
      window.dispatchEvent(new CustomEvent("products-appended", { detail: { added, grid } }));
    } catch (error) {
      console.error("ProductFilter: Infinite scroll error", error);
    } finally {
      this.isLoadingMore = false;
      if (loader) loader.hidden = true;
    }
  }

  updateInfiniteCounts(container = document) {
    const sentinel = container.querySelector?.("[data-infinite-scroll]") || document.querySelector("[data-infinite-scroll]");
    if (!sentinel) return;

    const loaded = Number.parseInt(sentinel.dataset.loadedCount || "0", 10);
    const total = Number.parseInt(sentinel.dataset.totalCount || "0", 10);
    const visibleEnd = Math.min(loaded, total);

    document.querySelectorAll("[data-products-range-count]").forEach((el) => {
      const template = window.ananasTranslations?.showingRange || "Showing %(start)s - %(end)s of %(total)s";
      el.textContent = template
        .replace("%(start)s", total > 0 ? 1 : 0)
        .replace("%(end)s", visibleEnd)
        .replace("%(total)s", total);
    });

    document.querySelectorAll("[data-products-total-count]").forEach((el) => {
      const template = window.ananasTranslations?.resultsCount || "%(count)s results";
      el.textContent = template.replace("%(count)s", total);
    });
  }

  getFilter(key) {
    const url = new URL(window.location.href);
    return url.searchParams.get(key);
  }

  getFilterAll(key) {
    const url = new URL(window.location.href);
    return url.searchParams.getAll(key);
  }

  applyClientSideAvailability(root = document) {
    const availabilityValues = this.getFilterAll("availability");
    const onlyInStock = availabilityValues.includes("in_stock") && !availabilityValues.includes("out_of_stock");
    const cards = root.querySelectorAll?.("[data-product-card][data-product-in-stock]") || [];

    cards.forEach((card) => {
      const isInStock = card.dataset.productInStock === "true";
      card.hidden = onlyInStock && !isInStock;
    });
  }

  async clearFilters(keepKeys = ["page_size", "q"]) {
    const url = new URL(window.location.href);
    const keysToRemove = [];

    url.searchParams.forEach((_, key) => {
      if (!keepKeys.includes(key)) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach((key) => url.searchParams.delete(key));

    const cleanUrl = this.buildCleanUrl(url);
    history.pushState({}, "", cleanUrl);

    await this.fetchProducts();
  }

  removeFilter(type, slug, value) {
    const url = new URL(window.location.href);

    if (type === "sort") {
      url.searchParams.delete("sort_by");
      url.searchParams.delete("order");
    } else if (type === "attribute") {
      const key = `attributes[${slug}][]`;
      const values = url.searchParams.getAll(key);
      url.searchParams.delete(key);
      values.forEach((v) => {
        if (v !== value) url.searchParams.append(key, v);
      });
    } else if (type === "availability") {
      const values = url.searchParams.getAll("availability");
      url.searchParams.delete("availability");
      values.forEach((v) => {
        if (v !== value) url.searchParams.append("availability", v);
      });
    } else if (type === "on_sale") {
      url.searchParams.delete("on_sale");
    } else if (type === "price") {
      url.searchParams.delete("from_price");
      url.searchParams.delete("to_price");
    }

    url.searchParams.delete("page");
    const cleanUrl = this.buildCleanUrl(url);
    history.pushState({}, "", cleanUrl);

    this.fetchProducts();
  }

  handleSortChange(value) {
    const [sortBy, order] = value.split("-");
    this.applyFilter({ sort_by: sortBy, order });
  }

  handleAvailability() {
    const checked = document.querySelectorAll('input[name="availability"]:checked');
    const values = Array.from(checked).map((box) => box.value);

    const popover = document.getElementById("availability-popover");
    if (popover) popover.hidePopover();

    this.applyFilter({ availability: values.length > 0 ? values : null });
  }

  handlePriceSubmit(event, minId, maxId) {
    event.preventDefault();

    const minInput = document.getElementById(minId);
    const maxInput = document.getElementById(maxId);
    if (!minInput || !maxInput) return false;

    const fromPrice = minInput.value.replace(/,/g, "") || null;
    const toPrice = maxInput.value.replace(/,/g, "") || null;

    const popover = document.getElementById("price-popover");
    if (popover) popover.hidePopover();

    this.applyFilter({ from_price: fromPrice, to_price: toPrice });
    return false;
  }

  setSortParams(radio, sortBy, order) {
    const form = radio.closest("form");
    if (!form) return;

    let sortByInput = form.querySelector('input[name="sort_by"]');
    let orderInput = form.querySelector('input[name="order"]');

    if (!sortByInput) {
      sortByInput = document.createElement("input");
      sortByInput.type = "hidden";
      sortByInput.name = "sort_by";
      form.appendChild(sortByInput);
    }

    if (!orderInput) {
      orderInput = document.createElement("input");
      orderInput.type = "hidden";
      orderInput.name = "order";
      form.appendChild(orderInput);
    }

    sortByInput.value = sortBy;
    orderInput.value = order;
  }

  clearDrawerFilters() {
    const dialog = document.getElementById("filters-drawer");
    if (dialog) dialog.close();

    this.clearFilters();
  }

  submitDrawerForm(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const dialog = document.getElementById("filters-drawer");
    if (dialog) dialog.close();

    const params = {};
    const arrayParams = {};

    for (let [key, value] of formData.entries()) {
      if (value === "" || value === null || key === "sort_option") continue;

      if (key === "from_price" || key === "to_price") {
        value = value.replace(/,/g, "");
      }

      if (key.endsWith("[]")) {
        if (!arrayParams[key]) arrayParams[key] = [];
        arrayParams[key].push(value);
      } else {
        params[key] = value;
      }
    }

    Object.assign(params, arrayParams);

    const clearEmptyParam = form.dataset.clearEmptyParam;
    if (clearEmptyParam && !formData.has(clearEmptyParam)) {
      params[clearEmptyParam] = null;
    }

    const clearEmptyParams = (form.dataset.clearEmptyParams || "")
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean);

    clearEmptyParams.forEach((key) => {
      if (!formData.has(key)) {
        params[key] = null;
      }
    });

    this.applyFilter(params);
    return false;
  }

  handlePerPageChange(perPage) {
    this.applyFilter({ page_size: perPage, page: null }, { resetPage: false });
  }
}

// ─────────────────────────────────────────────────────────────
// Global Instance
// ─────────────────────────────────────────────────────────────

const productFilter = new ProductFilter();
window.productFilter = productFilter;

// ─────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────

export function init() {
  productFilter.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

export { productFilter };
export default ProductFilter;
