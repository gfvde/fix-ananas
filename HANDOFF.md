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
| Zid validator | https://9bow2h.dev.zid.store/validate?theme=f25967f3-5358-44f9-8a5d-9ee6c2f834b4 — **39/39 templates pass** |
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

## Open work (in priority order)
1. **Demo content in the preview — DONE (partly)**: `python3 scripts/demo-settings.py build/theme` writes `templates/home.json`, `header.json`, `footer.json`, `layout.json` from `presets/default.json` into the preview folder only (not shipped), then `vitrin preview 3255406 .` uploads them as drafted settings.
   Home now renders 25 sections (all 24 types), 0 JS errors desktop + mobile (screenshots: `build/home-desktop.png`, `build/home-mobile.png`, not committed).
   Preset keys now match every section schema (0 stale sections; old keys renamed or dropped, reviews moved to the `reviews` list,
   hero/banner/countdown/video got demo images/video, links point to `/products`).
   Still to do: product/category pickers (`products`, `categories` lists) still reference the old store's ids — point them at the demo products from step 2.
2. **Demo products on the dev store** (owner approved): use the Zid store connector (`mcp__zid_store__*`) on store 3255406 only — at least: simple product, product with variants (size/grind), discounted product, out-of-stock product, low-stock product, preorder product, bundle offer, a few reviews and Q&A, categories with 3 levels. Then walk the checklist live.
3. **Cart items (checklist #15, #18)**: `components/cart/products-list.jinja` shows no per-item out-of-stock/error state and no bundle name/offer. Growth uses `{% include 'vitrin:v2/cart/products_list.jinja' %}` (`templates/cart.jinja:39`). Either switch (design changes — ask owner) or add availability + bundle markup (`data-bundle-arrow`, handler exists in `assets/js/cart/controller.js:952`).
4. **Wishlist**: header/drawer heart goes to `/pages/wishlist`, which needs a merchant-created page with slug `wishlist` and has no share-by-URL. Prefer the platform account wishlist route (confirm the URL live), or document it.
5. **Section preview images**: Growth ships `sections/<name>.png` for each section; we have none (24 sections). Needs screenshots of each section.
6. Smaller items from the audit:
   - remaining hard-coded `direction:rtl` rules in `assets/css/components.css` (quick view / wishlist: lines ~665, 682, 1023, 1099, 1280, 1412, 1623, 1837, 2137, 2182) → scope to `[dir="rtl"]`;
   - mobile drawer dynamic mode: add an "all" link for parent categories (`components/header/mobile-drawer.jinja:56-95`, static mode has it at `:108-111`);
   - header: mobile logo fixed 32px and nav 56px ignore settings; add `width`/`height` to logo `<img>`;
   - `header.schema.json` `style.search_bg/search_border/search_input_color` are overridden by `nav_search_*` → remove duplicates;
   - `category_page.filter_layout` select has a single option;
   - `header.jinja:~2004` fetches Shopify-style `/search/suggest.json` (dead; errors swallowed) — replace with `zid.products.list` or remove;
   - Arabic labels with English words mixed in (see schema scan); Arabic-only text defaults in `layout.schema.json` (`head_title_feature`, `faq_section_*`, coffee CTA) should be empty with `_()` fallbacks in templates.
7. After each batch: PR into `main` (merge commit, not squash), `make package`, `python3 scripts/demo-settings.py build/theme`, re-preview, re-validate (must stay 39/39).
8. Publishing (owner does it in the Partner Dashboard → My Themes → Themes Management): upload zip, price/description,
   3–9 images (desktop 4:3 ≤1600×1200, mobile 9:16 ≤720×1280), Submit to Publish. Review ≈ 2 days.

## Manual checks still needed on a real browser (need products first)
Payment widgets/Apple Pay/bank discounts (cart + product), preorder, gallery + variant change, quick view, login popup, side cart, gifting, blog/brands pages, featured reviews section, every home section (CSS was moved), account pages (platform), first-visit multi-inventory popup, logo AR/EN, 3-level menu, price filter, infinite scroll past 24, English (LTR) storefront on mobile.
