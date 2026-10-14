# Roast theme — handoff for the next Claude session

> Give this file to the next Claude Code session (any account in the org) as its first message:
> «اقرا HANDOFF.md في الريبو gfvde/fix-ananas وكمّل من آخر حاجة. كلمني بالمصري وباختصار.»

## What this repo is
- A **public Zid (zid.sa) Vitrin theme** (Jinja), sold to any store. Theme name **Roast / روست** (`theme.json`, slug `roast`).
  It started as the private "Ananas" (أناناس) coffee store theme; the owner chose to **keep Ananas copy/images as the default demo content**.
- Reference implementation: Zid's official starter theme **Growth** — `git clone --depth 1 https://github.com/zidsa/growth-theme`.
  When in doubt about a Zid variable, `vitrin:` include or `window.zid` SDK call, copy what Growth does.
- Owner's rules: don't change the design/colors; **never change an existing setting `id`** (merchants lose data);
  leave the Figma placeholder images (the owner will send real ones); never push to a live store.

## Where things are
| What | Where |
|---|---|
| Default branch with all work | `main` (PRs #30–#35 merged; later work on branch `claude/epic-lovelace-z0iebn`, see "Open work") |
| Build | `npm install && npm run build` (Tailwind 4.2.4 → `assets/styles.css`, Vite → `assets/dist/`) |
| Clean upload package | `make package` → `build/theme/` + `build/roast-theme-<date>.zip` (no docs/node_modules/py) |
| Zid theme id (already created on Zid) | `48f8b24f-4253-4785-9deb-c8f34f3b1217` — linked via `.vitrin/theme.json` |
| Dev store | `labeih-test-store`, store id **3255406**, https://9bow2h.zid.store/ (installation `f25967f3-5358-44f9-8a5d-9ee6c2f834b4`) |
| Preview | https://9bow2h.dev.zid.store?theme=f25967f3-5358-44f9-8a5d-9ee6c2f834b4 |
| Zid validator | https://9bow2h.dev.zid.store/validate?theme=f25967f3-5358-44f9-8a5d-9ee6c2f834b4 — **39/39 templates pass** (v1.0.7, 2026-10-06; side cart must not assume `cart` exists) |
| Zid review checklist | Notion DB "Zid Theme Test Cases" (124 test cases): https://buttoned-source-357.notion.site/1dcf18d990158001a921d92eaa79b0db |
| Translations | `locale/ar/LC_MESSAGES/messages.po` → compile `.mo` with babel (`write_mo`). Zid uses trimmed `{% trans %}`; `_()` takes **no kwargs** — use `_('x %(n)s') \| format(n=...)` |

## How to push/preview from a cloud session
1. Environment network must allow `api.zid.sa`, `*.zid.sa`, `*.zid.store` (and `www.notion.so`/`*.notion.site` to read the checklist). New network settings apply to **new** sessions.
2. `npm i -g @zidsa/vitrin-cli` (v1.3.0).
3. Login (callback is on localhost, so relay it): run `vitrin login` in the background, the owner opens
   https://partner.zid.sa/cli/authorized and pastes back the `http://localhost:4444/auth/callback?token=...` URL; `curl` that URL inside the container.
   The token is a credential — never commit or print it.
4. `make package && cd build/theme && vitrin preview 3255406 .`
   - **Don't use `vitrin push --store 3255406`**: CLI 1.3.0 bug (compares store id number vs string → "Store not found"). `preview` installs fine.
   - `vitrin preview` warns that `templates/home.json`, `header.json`, `footer.json` are missing → the preview has no demo section settings (see Open work #1).
5. Read the validator: `curl -sL <validate url>` and strip tags.

## Done so far (all on main unless noted)
- Payment widgets/Apple Pay/bank discounts/wallet, preorder, coupon toggle, gallery (Swiper), quick view, gifting, side cart, auth popup, XSS fix in reviews, i18n (`_()` everywhere), section CSS/JS moved to `assets/{css,js}/sections`, blog/brands pages, deps (npm only, Tailwind ~4.2.4, vite 7.3.7).
- About-us page (`templates/page.jinja`, slug `about-us`) is driven by the **"About Us Page" settings group** (`about_page_*` in `layout.schema.json`); empty fields fall back to the Ananas copy (default render identical to before).
- Zid validator fixes (12 → 0 failures): `settings.order | default(3)`, gettext kwargs, integer range steps (footer noise 0–100 %, banner stars ×10), `maxItems → max_items`.
- Checklist pass 1 (merged to main in PR #36):
  cart loyalty redemption, `/checkout` links, side cart empty/free-shipping fixes, Q&A gated by `questions_enabled`, variant price updates all copies, footer address/VAT/copyright "صنع بواسطة زد"/linked payment logos, category hero+breadcrumb+subcategories when banner off, region dialog for multi-inventory, 1023px mobile breakpoint, forced-RTL removed (drawer, filters, banner, product column), header font uses `var(--font-family)`.

## Dara reskin (branch `claude/vigilant-johnson-gmlxwi`, 2026-10-12)
- The owner asked to restyle Roast's existing elements to the **DARA** Figma (abaya store, file `U2w1BgcRDOHC8uZVNFBjSM`). This is not a new theme: same files and setting ids.
- Theme defaults: Cairo, background `#FAF7F2`, espresso accent `#6B4A39`, radius 0.
- Shared Dara CSS lives in `assets/css/dara/`, images in `assets/images/dara/`.
- Done:
  - header and footer, mega menu, drawer, search, snake bar;
  - product card: every designer note is a setting in the `product_card` group;
  - quick view, side cart, wishlist cards;
  - home sections and the about-* sections they use: sticky about-details, image-strip icon mode, category scroll effect;
  - PLP: shared `components/products/products-listing.jinja`, infinite scroll, collapsible filters, chips;
  - PDP: sticky gallery; show/hide toggles for blocks; styling & care guides; viewers counter; fabric; trust strip; reviews;
  - cart page: variant picker, looping payment row, UVPs;
  - About page.
- 133 new Arabic strings were merged into `locale/ar`.
- Pushed as v1.0.46; validator 39/39.
- Still open:
  - the demo preset images are still the Ananas coffee photos (Dara photos need uploading);
  - check the cart variant picker and PLP filters against real attribute data;
  - review sort/filter is not built (no data).

## Darna theme / DARNA store (2026-10-13)
- The vitrin account now owns only the **Darna** theme (`73c71cfb-ec7d-47c8-a4cd-1ad10a2d0f41`); `.vitrin/theme.json` points to it.
  - The old Roast theme (`48f8b24f…`) is no longer visible from this account.
- Dev store **DARNA** `3257518` (pxhvko).
  - Preview: https://pxhvko.dev.zid.store?theme=4c8e8590-70ba-42bd-9a71-61055bcfcf84
  - Validator: 39/39 (Darna v1.0.1).
- Store data was added through the `DARNA_zid_store` connector:
  - 8 Dara products, SKUs `DARA-001`…`DARA-008`;
  - 5 categories: 1749391 العبايات, 1749392 الشيلات, 1749393 الأكسسوارات, 1749394 إطلالات المناسبات, 1749395 عبايات يومية;
  - a Size attribute with presets S‑M / L‑XL / XXL.
- Not done through the connector:
  - size variants per product: `add_variants` returns a 400 bug, so the owner adds them in the dashboard;
  - brands: no connector tool.
- `presets/default.json` now uses Dara images, uploaded with `vitrin presets -t 73c71cfb… upload-image`, plus DARNA category and product links.

## Darna, part 2 (2026-10-13, PR #43 on `claude/vigilant-johnson-gmlxwi`)
State when this was written:
- PR gfvde/fix-ananas#43 is an open draft. It is mergeable, has no CI checks, and has no review comments.
- PR #42 (the Dara reskin) is already merged into `main`.
- Darna was pushed as **v1.0.29**. Drafts were uploaded with `vitrin preview 3257518 .`.
- The Zid validator passes **39/39**: https://pxhvko.dev.zid.store/validate?theme=4c8e8590-70ba-42bd-9a71-61055bcfcf84
- The live store only shows the changes after the owner presses **نشر** in the theme editor, or after `vitrin activate 3257518 4c8e8590-70ba-42bd-9a71-61055bcfcf84`.

### Store data (DARNA 3257518, via the `DARNA_zid_store` connector)
- 9 more products from the Darna home design (Figma node `14602:44636`), SKUs **DARA-009 … DARA-017**:

  | SKU | Product | Price |
  |---|---|---|
  | DARA-009 | ليل بتطريز ذهبي | 449 |
  | DARA-010 | رمل من اللينن | 329 |
  | DARA-011 | سكون كحلية | 389 |
  | DARA-012 | ورد بتطريز ناعم | 429 |
  | DARA-013 | زيتون يومية | 299 |
  | DARA-014 | سهر بتفاصيل فضية | 549 |
  | DARA-015 | شيلة شيفون | 89 |
  | DARA-016 | حقيبة جلد بلون التوب | 249 |
  | DARA-017 | بروش لؤلؤ | 79 |

  - Images come from Figma.
  - Each short description is `tag · tag · tag`; the card tags come from these (see below).
- 12 new categories, nested under the 5 old ones (whose ids are unchanged). Each has an image from the Darna Figma.
  ```
  العبايات 1749391
  ├─ عبايات كريب 1750684 ─┬─ كريب أسود 1750685
  │                        └─ كريب بألوان هادئة 1750686
  ├─ عبايات لينن 1750687
  └─ عبايات مطرزة 1750688 ─┬─ تطريز ذهبي 1750689
                            └─ تطريز ناعم 1750690
  إطلالات المناسبات 1749394 └─ عبايات سهرة 1750691
  الشيلات 1749392           ├─ شيلات شيفون 1750692
                            └─ أطقم عباية وشيلة 1750694
  الأكسسوارات 1749393       ├─ الحقائب 1750695
                            └─ البروشات 1750696
  ```
- Products are linked to the new categories with `add_product`, which only adds links and never replaces them.
  - DARA-004 is the only product not in a new category.
- Connector gotchas:
  - `ProductCategories.upload_image` cannot fetch `media.zid.store` URLs: it returns a 403, even through the CDN. Use Figma asset URLs instead (`get_design_context` / `get_screenshot`, valid for 7 days).
  - The connector has no field for product `keywords`.

### Theme changes in PR #43
- **Card tags** (`components/products/product-card.jinja`): when `product.keywords` is empty, the tags come from the short description split on `·`.
- **Mouse drag on sliders** (`assets/js/features/drag-scroll.js`, imported in `main.js`):
  - Any `overflow-x` scroll-snap track scrolls on mouse drag.
  - The image ghost-drag is blocked, and the click that ends a drag is swallowed.
  - Tracks with their own drag code are skipped: `.fp-carousel__viewport`, `.pc-tags-wrapper`, `[data-no-drag-scroll]`.
- **Hero Banner (About) video** (`sections/about-hero-banner.*`, `assets/{css,js}/sections/about-hero-banner.*`):
  - New settings: `media_type` (image/video), `video_desktop`, `video_mobile`.
  - The video plays muted on a loop over the poster images and fades in.
  - The source follows the 768px breakpoint. Reduced motion keeps the image.
  - Note: Playwright's Chromium cannot decode H.264, so test it with WebM.
- **Section preview images**: `sections/<name>.jpg` and `<name>_mobile.jpg` for the 13 home sections (about 1MB in total).
  - Desktop images were exported from the Darna home frames in Figma.
  - Figma has no mobile frames, so the mobile images were captured from the dev store at 390px, with fixed headers hidden.
  - The other 11 sections (banner, countdown, partners, carousel, video, …) have no Darna design and are not on the page, so they have no preview yet.
- **Zid audit fixes**: the audit script and §17.1/§18 of the zid-vitrin-themes skill reference.
  - The viewers counter is now off by default (schema and preset), with a note on the setting. It is random, and Zid treats fake social proof as grounds for rejection.
  - Settings group icons switched from Font Awesome to Remixicon.
  - `meta.type` added to 6 sections.
  - CDN versions pinned: alpinejs 3.14.9, swiper 11.2.10.
  - Dropped a hardcoded `direction: rtl` in the mobile drawer.
  - The preset footer "من نحن" link pointed at another store (`iasvhj`); it is now `/pages/about-us`.

### Test results (v1.0.29)
- **Validator**: 39/39 templates pass.
- **Audit script**: Jinja parse 0 problems, translations 0 missing, schema check OK.
  - Its "setting key not defined" lines are false positives: they are `default()` fallback chains.
- **Crawl**: 17 pages, desktop and mobile, Arabic.
  - No overflow, no broken images, no missing `alt`, no "Undefined" text.
  - No JS errors from theme code.
- **Flows passing (desktop and mobile)**:
  - PDP add to cart → side cart opens → cart page → quantity +/- → remove.
  - Quick view, search (`/products?q=`), out-of-stock state, category subcategories, 3-level mobile drawer, login popup.
- **Console noise that is not the theme** (ignore it):
  - `GET /api/v1/account` 401 for guests: fired by the platform's own `zidStore.init` script.
  - `dmdSdk ProductViewed` errors.
  - mazeedplus / lordicon / labeih.online app scripts.
- **Sandbox limits**:
  - jsdelivr is blocked inside the cloud sandbox, so Swiper, PhotoSwipe, `@tailwindplus/elements` (`el-dialog`) and Alpine do not load there.
  - Serve them from `npm pack` copies with a Playwright route to test the quick view, gallery, etc.
  - Prices show in USD because the sandbox is geolocated to the US.

### Still to do
1. **Notion checklist** ("Zid Theme Test Cases", 124 cases) has **not** been run on Darna.
   - This session's network policy blocks `notion.site` / `notion.so`.
   - Either allow those hosts in the environment and start a new session, or have the owner export the DB (CSV/Markdown) into the chat.
2. **Store settings for the owner (dashboard)**:
   - enable English; `/en-us/` currently redirects to Arabic, so LTR was not tested;
   - create the page `about-us`; the footer link and the About template need it;
   - enable store reviews / questions; `/reviews` and `/questions` return 404;
   - add sizes and brands to products (connector `add_variants` returns a 400; there is no brands tool);
   - delete the stray checkbox option "المقاس" on DARA-001.
3. **Untested**:
   - Apple Pay (needs Safari);
   - coupon off, gifting, multi-inventory "require city";
   - a bundle offer and a preorder product.
4. **Merge PR #43** into `main` (merge commit), then the owner publishes.
5. Optional: preview images for the 11 sections without them, once they are placed on a page.

## Darna, part 3 (2026-10-14, branch `claude/new-session-ypybvd`)
- PR #43 is merged into `main`.
- **English is now enabled on DARNA**: `/en-us/` renders LTR (`dir="ltr"`). The store root redirects to `/en-us/` from the US-located sandbox; use `/ar-sa/` for Arabic.
- **LTR crawl** (home, PLP, category, cart, blog, wishlist; desktop 1440 and mobile 390):
  - no horizontal overflow, no theme JS errors;
  - Arabic text on English pages comes from section settings or the preset (merchant content), not from the theme;
  - the announcement bar is in carousel mode on English because `announcement_bar_enable_marquee` is off for that language; the theme is fine.
- **Fix: Hero Banner (About) desktop text side.**
  - The Dara hero image has its dark empty area on the right.
  - In LTR the text moved to the left, on top of the photo, and could not be read.
  - New setting `desktop_content_side`: `auto` (default, unchanged behaviour), `right`, `left`.
  - The preset sets `right`. Arabic renders exactly as before.
- Known, not fixed: the preset splits «( أناقة بكل تفاصيلها )» across `rating_label` / `rating_count` so the brackets only order correctly in RTL. On English the merchant writes their own text.
- **Notion checklist ("Zid Theme Test Cases", 124 cases) — run on DARNA 2026-10-14.**
  - The `Notion` MCP connector reads it; `curl` to `*.notion.site` is still blocked.
  - Data source: `collection://1dcf18d9-9015-81b1-b3f1-000b607957d4`.
  - Fixed in PR #44:
    - footer:
      - links with no URL are hidden;
      - the language name shows in the region button (`lang.code`);
      - the country code is upper-case;
      - the address no longer repeats parts already in the street line;
    - favicon from `store.icon`;
    - category banner shows `cover_image` when the merchant sets one;
    - shipping page uses a localized city separator;
    - cart:
      - badge and item counts refresh after AJAX updates;
      - a failed quantity change re-renders the cart;
      - `is_product_price_updated` is no longer shown as an error;
      - the side cart's free-shipping bar needs a rule with a `code`;
    - low stock (card, PDP, `layout.jinja`):
      - follows `low_stock_label_enabled` and `low_stock_quantity_limit`;
      - falls back to `low_stock_enabled` / `low_stock_quantity_threshold` / `low_stock_threshold`, because the live store sends `low_stock_quantity_threshold`;
    - PDP Notify Me opens the dialog (`data-notify-me-trigger`);
    - the quantity limit shows a toast «المتوفر %s فقط»;
    - a reversed price filter is swapped;
    - infinite scroll re-observes after a short page;
    - the card sold label reads "Sold more than %s times";
    - preset:
      - the footer links point to `/faqs` and `/shipping-and-payment`;
      - the copyright is empty, so the dashboard value or «صنع بواسطة زد» shows;
    - section names no longer mention Ananas or coffee.
  - Platform: account pages (profile, orders, addresses, wishlist, loyalty) are Zid's own templates; none is a theme file.
  - Blocked on store data or dashboard settings:
    - social links;
    - VAT, CR and business center numbers;
    - loyalty;
    - multi-inventory;
    - FAQs and blog posts;
    - a custom menu link;
    - a category cover;
    - SEO title and favicon;
    - reviews and questions;
    - variants, more images and a video;
    - bundle offers and a grouped product;
    - related products;
    - a VAT-exempt product and a badge;
    - product filtration;
    - Tamara and Tabby;
    - more than 24 products;
    - a free-shipping rule;
    - a customer login for the account cases.
  - Turn off the PDP viewers counter in the live editor; it is still on there.
- **Uploaded 2026-10-14**:
  - `make package && python3 scripts/demo-settings.py build/theme && cd build/theme && vitrin preview 3257518 .`
  - Validator: 39/39.
  - The drafts now come from `presets/default.json`, ar and en. The `en` copy is a real English translation; links and slugs are unchanged.
  - Checked on the preview: Notify Me, low stock, the quantity toast, the cart badge and count, no price-changed error, and the footer address.
- **Notion**: 66 cases are marked Passed. The 58 still To Do are blocked on store data or a customer login, or are fixed but not yet verified live (price filter swap, cart quantity error, free-shipping rule, closed store).
- **To do**:
  - the owner presses نشر in the editor, or runs `vitrin activate 3257518 4c8e8590-70ba-42bd-9a71-61055bcfcf84`;
  - the other items in "Darna, part 2 → Still to do" are unchanged. Notion is still blocked by the network policy (`*.notion.site`), and jsdelivr is too.

## Open work (in priority order)
1. **Demo content in the preview — DONE (partly)**: `python3 scripts/demo-settings.py build/theme` writes `templates/home.json`, `header.json`, `footer.json`, `layout.json` from `presets/default.json` into the preview folder only (not shipped), then `vitrin preview 3255406 .` uploads them as drafted settings.
   Home now renders 25 sections (all 24 types), 0 JS errors desktop + mobile (screenshots: `build/home-desktop.png`, `build/home-mobile.png`, not committed).
   Preset keys now match every section schema (0 stale sections; old keys renamed or dropped, reviews moved to the `reviews` list,
   hero/banner/countdown/video got demo images/video, links point to `/products`).
   Pickers and links now point at the demo categories/products on store 3255406 (categories section, products tabs, about-details, shop-by-category/mood links, product bundle).
2. **Demo products on the dev store** (owner approved): use the Zid store connector (`mcp__zid_store__*`) on store 3255406 only — at least: simple product, product with variants (size/grind), discounted product, out-of-stock product, low-stock product, preorder product, bundle offer, a few reviews and Q&A, categories with 3 levels. Then walk the checklist live.
   **Partly done (2026-10-06)** on store 3255406: categories قهوة(1744425) > قهوة مختصة(1744422) > إثيوبيا(1744423), أدوات التحضير(1744424);
   products RST-001 simple (Ethiopia, 3-level), RST-002 discounted 95→69, RST-003 out of stock, RST-004 low stock (2), RST-005 House Blend (meant for variants),
   RST-006/007 tools; one Q&A with answer on RST-001. Not possible through the store connector: product images (Zid fetch of media.zid.store → 403;
   upload by hand), variants (`add_variants` → 400 "Expected a list"), bundle offers (401 missing scope), creating reviews, preorder. Do those in the Zid dashboard.
3. **Cart items (checklist #15, #18) — DONE (2026-10-06)**: `components/cart/products-list.jinja` shows a per-item error from the cart flags
   (`is_original_product_available`, `is_original_quantity_finished`, `is_requested_quantity_enough`, `is_product_price_updated`, `error_message`) using the
   platform's `error_messages` text, dims the item, lists `sub_items` behind a `bundle-toggle` and names `discount_rules` offers. Verified live (out-of-stock item).
   Not verified with data: `sub_items` stayed empty for a grouped product (RST-008 "باقة التحضير"), and bundle offers can't be created via the connector, so the
   offer/bundle markup is defensive. Check both once a bundle offer exists.
   Also fixed: side cart `cart.total` is a totals object on the cart page → broke an inline script.
   **Theme preset on Zid**: `python3 scripts/public-preset.py && cd build/theme && vitrin presets create ../preset.json` (or `presets update <id>`) — current preset
   id `c471c643-3c7b-40c9-8af2-699769061088`. It is the store-agnostic copy of `presets/default.json` (pickers → recent products, store links → `/products`).
   It shows in the theme editor under "تغيير القوالب / معاينة القوالب" (as "الافتراضي") on installs of the partner theme — NOT on a zip uploaded
   through the store's "Upload new theme" (that is a separate private theme without presets). Preview images live in `IMAGES` in the script.
   Drafts from `vitrin preview` are not live until someone presses نشر in the editor; `vitrin activate 3255406 <installation>` switches the active theme.
4. **Wishlist — DONE (2026-10-06)**: header/drawer heart and `wishlistConfig.pageUrl` now go to the platform page `/account/wishlist`
   (asks guests to log in, then shows Zid's own list). `/pages/wishlist` was a 404 unless the merchant made that page; `/wishlist` exists but errors for guests.
5. **Section preview images — PARTLY DONE (2026-10-13)**: 13 of 24 sections have `sections/<name>.jpg` + `_mobile.jpg` (see "Darna, part 2"); the 11 sections not on the home page still have none.
6. **Smaller audit items — DONE (2026-10-06)**: quick view / wishlist `direction` rules in `components.css` scoped to `[dir="rtl"]`;
   dynamic mobile drawer gets "all" links for parent categories (both levels); mobile header height/logo follow the settings (−8px, defaults stay 56/32)
   and logos have a `height`; dead `style.search_bg/search_border/search_input_color` removed (always overridden by `nav.search_*`);
   `category_page.filter_layout` gains a "drawer" option (the existing top-bar layout); live search uses `zid.products.list({q})` instead of the
   Shopify `/search/suggest.json`; mixed English in Arabic labels cleaned; Arabic-only text defaults in `layout.schema.json` are now empty with
   `_()` fallbacks whose Arabic matches the old defaults (Arabic storefront unchanged, English no longer shows Arabic).
7. After each batch: PR into `main` (merge commit, not squash), `make package`, `python3 scripts/demo-settings.py build/theme`, re-preview, re-validate (must stay 39/39).
8. Publishing (owner does it in the Partner Dashboard → My Themes → Themes Management): upload zip, price/description,
   3–9 images (desktop 4:3 ≤1600×1200, mobile 9:16 ≤720×1280), Submit to Publish. Review ≈ 2 days.

## Manual checks still needed on a real browser (need products first)
Payment widgets/Apple Pay/bank discounts (cart + product), preorder, gallery + variant change, quick view, login popup, side cart, gifting, blog/brands pages, featured reviews section, every home section (CSS was moved), account pages (platform), first-visit multi-inventory popup, logo AR/EN, 3-level menu, price filter, infinite scroll past 24, English (LTR) storefront on mobile.
