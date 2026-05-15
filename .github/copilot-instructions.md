## Krótkie wprowadzenie
Repozytorium `mroauto-custom` to statyczny frontend (HTML/CSS/JS) wstrzykiwany na żywo do sklepu mroauto.cz/cs (CMS: **Nextis**, ASP.NET WebForms). Hostowane na GitHub Pages: `https://dzudzok.github.io/mroauto-custom/`. Po fazach A→B→C (2026-05-15) repo zawiera **całą wizualną i interaktywną warstwę** sklepu. W Nextis zostały tylko trackery i loader.

## Architektura
**Łańcuch ładowania:**
1. W panelu Nextis w `<head>` siedzi:
   - `<link rel="stylesheet" href="https://dzudzok.github.io/mroauto-custom/head.css">` — **blocking CSS** (2265 linii, anty-FOUC, omija injector). Header/menu/lang/cookie/checkout/product/blog/TecDoc CSS.
   - Loader skryptu (backup: [SCRIPT DO HEAD NEXTIS.txt](../SCRIPT%20DO%20HEAD%20NEXTIS.txt)) — ustawia `window.MRO_BASE` i wstrzykuje `injector.js`. Guard `window.MRO_INJECTOR_LOADED`.
2. [injector.js](../injector.js) iteruje po tablicy `resources` (10 wpisów). Dla każdego: jeśli URL pasuje (`pathIncludes`) **i** selektor istnieje (`matchSelector`) → `injectCss` / `injectHtml` / `injectJs` z bazy GH Pages. Guard `window.__MRO_INJECTOR_RAN` przeciw podwójnemu wykonaniu (ASP.NET UpdatePanel).
3. Wpis `global` leci na każdej stronie z `body` w DOM.

**Dwa równoległe systemy:**
- **Repo (git)** — wersjonowane fragmenty, deploy przez push na main → GitHub Pages (1-5 min propagacji CDN).
- **Nextis CMS** — minimalne wpisy w head/body, backup w plikach `Head_w_nextis` (~80 linii po fazie C) i `Body_w_nextis` (~6 linii po fazie B). Oba w `.gitignore`.

## Co siedzi gdzie

### `Head_w_nextis` (Nextis Head, ~80 linii)
- `<style>` zmiana logo (`Image.ashx?id=644339`) — latency-critical (CLS)
- `<script>` gtag + Consent Mode + CMP sync
- `<script>` Smartsupp loader
- `<link>` Material Icons + FontAwesome CDN
- `<link rel="stylesheet">` na `head.css` w repo (anty-FOUC, blocking)
- `<script>` loader injector.js

### `Body_w_nextis` (Nextis Body, ~6 linii)
- `<script>` Heureka.cz product_detail pixel (świadoma decyzja — pixele zostają w Nextis dla latency)

### Repo — pełna mapa modułów

| Wpis w `injector.js` | Pliki | URL trigger | Selector trigger |
|---|---|---|---|
| `global` | `global.css/.html/.js` | wszędzie | `body` |
| `whatsapp` | `WhatsApp/*` | wszędzie | `body` |
| `delivery-format` | `DeliveryFormat/delivery-format.js` | wszędzie | `body` |
| `delivery-countdown` | `DeliveryCountdown/*` | wszędzie | `.flex-user-menu` (zalogowany) |
| `homepage` | `HomePage/homepage.css/.html` | exact `/cs` `/cs/` `/` | — |
| `product` | `Product/*` (`product.js`, `product.css`, `product.html`) | `hledani`, `/katalog/tecdoc/` | `.flex-product-detail` |
| `product-top` | `Product/top.html` | jw | `.flex-product-detail` |
| `product-bottom` | `Product/bottom.html` | jw | `.flex-product-detail` |
| `productlist` | `ProductList/productlist.css` | jw | `[id^="ProductItem_"]` AND `.flex-tecdoc-vehicle-info-box` |
| `productlistsearch` | `ProductListSearch/productlistsearch.css` | jw | `[id^="ProductItem_"]` |
| `universal` | `UniversalParts/universal.css` | `/katalog/univerzalni-dily` | `.flex-universal-parts` |
| `category-tiles` | `CategoryTiles/*` | `/katalog/tecdoc/` | `.shortcuts` |
| `garage` | `Garage/*` | wszędzie | `.flex-user-menu` (zalogowany) |
| `oil-widget` | `OilWidget/oil-widget.css` | wszędzie | `.oil-widget` (gdy element w DOM) |
| `carselect` | `CarSelect/carselect.css` | `/katalog/tecdoc/` | `.flex-select-vehicle-wizard, .flex-manufacturer-selector, .flex-collapsible` |

### Reguły absolutne

1. **Pixele/trackery/analytics zostają w Nextis** — gtag, Heureka, Smartsupp, Google Ads, Facebook Pixel itd. Latency-critical, niezależne od GH Pages CDN. Migracji **nie wykonujemy**.
2. **CSS w repo musi mieć absolutne `url()`** — `https://www.mroauto.cz/Image.ashx?...`, nie `/Image.ashx?...`. Względne ścieżki na GH Pages dają 404 (CSS lokalizacja = `dzudzok.github.io`). Hotfix `d46d5d0` (2026-05-15) — 13 url() naprawione w `head.css`. Przed pushem CSS: `grep -nE "url\(['\"]?/" plik.css` musi być pusty.
3. **JS/CSS migracje z Nextis** mają guard'y idempotencji (`window.__MRO_X_INIT`). ASP.NET UpdatePanel może odpalać skrypty wielokrotnie.
4. **`Head_w_nextis` / `Body_w_nextis` to override'y, nie pełne HTML** — selektory typu `.flex-*`, `.oil-widget`, `.shortcuts` są generowane przez natywny Nextis. Nasz CSS je tylko styluje.

## Konwencje kodu
- **Fragmenty HTML** nie zawierają `<head>`/`<body>` — są przeznaczone do wstrzyknięcia przez `insertAdjacentHTML`.
- **Selektory ASP.NET WebForms** są hardkodowane (`#ctl00$ctl00$BodyContentPlaceHolder$UserMenu`, `.flex-product-detail`, `.flex-selected-categories-container`). Zmiana w Nextis = ciche padnięcie.
- **Helper globalny:** `window.MRO_HELPERS.{waitForElement, onReady, isLoggedIn, isB2B}` zdefiniowane w `global.js`. Preferować nad lokalnymi kopiami.
- **Logi konsoli:** prefiks `MROAUTO:` (info), `❌ MROAUTO:` (błędy).
- **Cache:** `fetch` używa `cache:'no-store'`, ale GH Pages CDN i tak cache'uje. Po commit zmiana może być widoczna z 1-5 min opóźnieniem.
- **Konwencja nazewnictwa CSS:** klasy nowych modułów mają prefix `mro-*` lub nazwę modułu (`whatsapp-btn`, `garage-modal`, `mro-delivery-tooltip`) żeby nie kolidować z natywnym Nextis (`.flex-*`).

## Workflow zmian
- **Deploy = `git push origin main`** → GitHub Pages → mroauto.cz. Nie ma środowiska staging.
- **Brak testów automatycznych.** Testowanie ręczne w przeglądarce (DevTools → Console/Network, filtr `MROAUTO`).
- **Lokalne testy:** uruchom `py -m http.server 8000` w katalogu repo, w `injector.js` tymczasowo zmień `const defaultBase = 'http://localhost:8000/';`.
- **Rollback:** commit-level (`git revert <sha>`) lub punkty kotwiczne (tagi `pre-faza-A`, `pre-faza-B`).
- **head.css update:** edytuj, commit, push — propagacja CDN do mroauto.cz w 1-5 min. CSS jest blocking, więc po hard refresh user widzi od razu.

## Gdy modyfikujesz kod
- Nowy fragment → odpowiedni folder modułu + wpis w `resources` w `injector.js` z `pathIncludes` i `matchSelector`.
- Nie nadpisuj globalnych zmiennych. Używaj IIFE i guardów (`if (window.__MRO_X_INIT) return;`).
- Loguj kluczowe etapy z prefiksem `MROAUTO:`.
- Sanitization: HTML z fetcha przechodzi przez `sanitizeHtmlString` (usuwa CSP meta) — OK dla własnych plików, ale nie wstawiaj user-input bez dodatkowej walidacji.
- CSS migrowane z Nextis: zamień wszystkie `url(/...)` na `url(https://www.mroauto.cz/...)` przed pushem.
