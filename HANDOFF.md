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

## Darna, part 3 (2026-10-14, Notion checklist run)
- **Notion DB** "DARNA Theme Test Cases" (https://app.notion.com/p/1dcf18d990158001a921d92eaa79b0db), readable through the Notion connector.
  - All 51 "To Do" cases were run: now **98 Passed, 26 Blocked, 0 To Do** (after the owner signed in as a customer on 2026-10-15).
  - A new **Test Notes** column says why each case passed or what it is blocked on.
- **The live store runs an older published version.** It still shows the viewers counter and the `iasvhj` "من نحن" link. Test on the preview (`?theme=4c8e8590…`) until the owner presses نشر.
- **Dashboard (DARNA 3257518), done in Chrome**:
  - English was already on (`/en-us/` is LTR).
  - Created page `about-us`.
  - Turned on customer reviews and questions (العملاء ← التقييمات / الأسئلة).
  - DARA-001 got S‑M / L‑XL / XXL variants. Variant price edits in the dashboard table do not save.
  - DARA-001 got 3 custom similar products. The platform sends `related_products` only after this.
  - Added one FAQ.
  - Turned on "المدونة" in the main menu.
- **Theme fixes**:
  - Footer: link groups without titled links no longer render an empty column.
  - `--header-h` is re-measured on load and with a ResizeObserver. It was 610px when measured before CSS, which pushed the sticky PDP gallery ~470px down.
  - Cart: a rejected quantity update shows "Not enough stock for the requested quantity" and re-renders. Every refresh path re-hydrates images and options; before, after a failed update the list lost images, sizes and old prices.
  - Price filter: junk in `from_price`/`to_price` is ignored (no "NaN"), and min > max is swapped.
- Uploaded with `vitrin preview 3257518 .`; the validator passes 39/39.
- **Still blocked (needs the owner)**:
  - account empty states (the test customer has orders and addresses), Mazeed;
  - wishlist: Zid's `addToWishlists` returns 200 but saves nothing on DARNA (platform bug). The theme bug that sent signed-in customers to /account is fixed in `wishlist.js`;
  - a bundle offer;
  - a free-shipping rule;
  - Tamara/Tabby;
  - favicon, social links, VAT/CR visibility;
  - product video and extra images;
  - a required custom field;
  - reviews from customers;
  - multi-inventory;
  - store-closed hours;
  - the theme-editor mobile check.
- **Leftovers**:
  - the "المقاس" checkbox customization on DARA-001 must be deleted by hand: the delete opens a native confirm that freezes the Chrome extension;
  - `/reviews` and `/questions` still return 404 after turning those features on.

## DARNA now runs an uploaded custom theme (2026-10-15)
- The owner uploaded the zip build (`build/darna-theme-2026-10-15.zip`, made from the PR #45 branch) to DARNA 3257518, under Custom themes, as **"DARNA"**, and activated it. **Rely on this from now on.**
  - The vitrin partner preview (installation `4c8e8590…`) is no longer what the live store shows.
- **To ship a change**:
  1. `npm run build`
  2. `rm -rf build/theme && bash scripts/package.sh`
  3. Zip `build/theme` with Python (`zip` is not installed on this Windows machine).
  4. Do not include the demo-settings JSON from `scripts/demo-settings.py`.
  5. The owner uploads the zip.
- **Live check after the upload**: the wishlist fix, the review CTA and similar products are live.
- **Still from saved editor settings** (fix them in Customize, not in the code):
  - the viewers counter is on;
  - the footer "من نحن" link points to `iasvhj.dev.zid.store`.
- **Chrome**: two browsers are connected. The owner's logged-in one is "Browser 1" (Windows).

## Darna, part 4 (2026-10-15)
**State**:
- PR #45 is merged into `main`.
- The live store runs the custom-theme zip the owner uploaded (first version).
- A newer zip, **`build/darna-theme-2026-10-15-v2.zip`** (not committed, `build/` is ignored), adds the cart bundle-offer block below. The owner still has to upload it. If it is lost, rebuild it with the steps above.
- Validator 39/39 on the preview.

**Done in this part**:
- In the theme editor (Customize → Publish):
  - the footer "من نحن" link now points to the About Us page (`/pages/123956`);
  - the viewers counter is off;
  - both verified on the live store.
- Code changes:
  - `templates/product.jinja`: the viewers counter is opt-in (`== true`). It used to show whenever the setting was not saved.
  - Wishlist: before redirecting to login, it re-checks the login state (`ensureLoggedIn`). Signed-in customers were sent to /account.
  - Cart: a new block shows `cart.bundle_offers` (name, description, "وفّرتِ X" / "أضيفي N…") above the items, in `components/cart/products-list.jinja` with CSS in `assets/css/cart-page.css`. Zid puts bundle info on the cart, and `item.discount_rules` stays empty.
  - Translations: 2 new Arabic strings; the `.mo` was recompiled with babel (`pip install babel`).
- Dashboard:
  - Bundle offer **"عرض 2+1"**: buy 2 of any product, get the cheapest free. It is active.
  - The live store shows the card tag, the PDP tab with name, description and products, and the cart total discount.
  - The "sold count" threshold was lowered from 50 to 1. The label still does not show, because no DARNA product has a sale.
- Account tests with the owner's customer login: 12 of 18 passed; see Notion.

**Notion status**: 98 Passed / 26 Blocked. Update these once v2 is uploaded:
- the 3 bundle cases (cart / PDP / card tag) → Passed;
- the sold-count case stays Blocked.

**Still blocked, and why**:
- **Free-shipping rule**:
  - A draft "شحن مجاني فوق 300" (automatic) was filled in and **not saved**: the permission checker blocked opening its Conditions section.
  - The owner should create it with a 300 SAR minimum, then test the cart progress bar.
- **VAT number / CR**: the store has none. Real numbers are needed from the owner; never invent them.
- **Social links**: the owner's real handles are needed.
- **Sold count / product rates / 10 reviews / loyalty redemption**: need a real or test order and reviews. Ask the owner before placing an order.
- **Wishlist (4 cases)**: Zid's `addToWishlists` returns 200 and saves nothing. Report it to Zid.
- **Empty states for addresses / orders**: need a fresh customer account (Claude must not create accounts).
- **Mazeed, Tamara/Tabby, multi-inventory**: platform or contract setup.
- **Still fixable from the dashboard**:
  - product video and extra images, the favicon, and a required custom field: product edit page / Store identity;
  - store-closed hours: settings → work time; reopen after testing;
  - the theme-editor mobile check.
- **Leftovers**:
  - delete the "المقاس" checkbox customization on DARA-001 by hand: its native confirm freezes the extension;
  - `/reviews` and `/questions` return 404;
  - "المدونة" was turned on in the main menu for a test.

## Darna, part 5 (2026-10-15) — START HERE NEXT SESSION
**State**:
- v2 is live on DARNA (the live `cart-page.css`, `?v=v1.0.11`, has the bundle block).
- A newer zip, **`build/darna-theme-2026-10-15-v3.zip`** (not committed), has the two fixes below. The owner still has to upload it.

**Fixes in v3**:
- Cart bundle block: the saving showed a raw float ("4224.867611169646"), because `format_price` does not format converted amounts.
  It now uses `offer.discount_total_string` ("4,224.87 EGP"), with `format_price` only as a fallback.
- Cart loyalty redemption list (`el-options` in `components/cart/loyalty-redemption.jinja`): it opened across the whole page.
  - Cause: its class is `w-[var(--anchor-width)]`, but `el-select` never sets that variable. `el-select` then puts the list at `left = button end − list width`.
  - Fix in `assets/js/cart/loyalty.js`: on the list's `toggle` event, set `--anchor-width` to the button width on the `el-select`.
  - It goes on the `el-select` because `el-select` rewrites the list's own `style` attribute all the time, and the variable still reaches the list by inheritance.
  - Verified on the live store by injecting the code into the page (guest cart, section un-hidden by hand).

**After the upload**:
- Check the points list with the owner's customer login.
- In Notion, mark the 3 bundle cases (cart / PDP / card tag) as Passed.

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
