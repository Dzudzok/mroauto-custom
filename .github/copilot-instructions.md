## Krótkie wprowadzenie
Repozytorium `mroauto-custom` to statyczny frontend (HTML/CSS/JS) wstrzykiwany na żywo do sklepu mroauto.cz/cs (CMS: **Nextis**, ASP.NET WebForms). Hostowane na GitHub Pages: `https://dzudzok.github.io/mroauto-custom/`. Centralny mechanizm: [injector.js](../injector.js) ładuje fragmenty z folderów modułów (`HomePage/`, `Product/`, `ProductList/` itd.) na podstawie URL + obecności selektorów DOM.

## Architektura
**Łańcuch ładowania:**
1. W panelu Nextis w `<head>` siedzi loader (backup: [SCRIPT DO HEAD NEXTIS.txt](../SCRIPT%20DO%20HEAD%20NEXTIS.txt)) — ustawia `window.MRO_BASE` i wstrzykuje `injector.js`. Ma guard `window.MRO_INJECTOR_LOADED`.
2. [injector.js](../injector.js) iteruje po tablicy `resources` (~16 wpisów). Dla każdego: jeśli URL pasuje (`pathIncludes`) **i** selektor istnieje (`matchSelector`) → `injectCss` / `injectHtml` / `injectJs` z bazy GH Pages.
3. Wpis `global` leci na każdej stronie: [global.css](../global.css), [global.html](../global.html), [global.js](../global.js).

**Dwa równoległe systemy żyją obok siebie:**
- **Repo (git)** — wersjonowane fragmenty, deploy przez push na main → GitHub Pages.
- **Nextis CMS** — kod wklejony ręcznie w panel admina, backup w plikach `Head_w_nextis` i `Body_w_nextis` (oba w `.gitignore`). Zawiera: gtag Consent Mode, Smartsupp, Heureka pixel, mega CSS, garage widget, kafelki TecDoc, WhatsApp, formater dat dostaw.

## Status modułów (2026-05)
| Moduł | Stan |
|---|---|
| [global.js](../global.js) | **Aktywne** — VIN search (`/cs`), B2B detection, podmiana ~250 logo producentów, Google Translate + waluty, popup ogłoszeń. |
| [HomePage/homepage.js](../HomePage/homepage.js) | **Aktywne** — VIN search (duplikat z global.js, do scalenia). |
| [Product/product.js](../Product/product.js) | **Aktywne** — "modern delivery box", reformater list OE/aplikacji. |
| [injector.js](../injector.js) | **Aktywne** — loader. |
| ProductList, ProductListSearch, Basket, CarSelect (3), Search, Blog, UniversalParts, Contact, AboutUs, Privacy, Shipping, Downloads, Order (2), Actions | **Stuby/puste** — wpis w injectorze istnieje, pliki to placeholder (np. `<div class="mro-products"></div>`) albo 0-bajtowe. |

## Kluczowe konwencje
- **Fragmenty HTML** nie zawierają `<head>`/`<body>` — są przeznaczone do wstrzyknięcia przez `insertAdjacentHTML`.
- **Selektory ASP.NET WebForms** są hardkodowane (`#ctl00$ctl00$BodyContentPlaceHolder$UserMenu`, `.flex-product-detail`, `.flex-selected-categories-container`). Zmiana w Nextis = ciche padnięcie.
- **Helper globalny:** `window.MRO_HELPERS.waitForElement(selector, timeout)` i `window.MRO_HELPERS.onReady(cb)` zdefiniowane w `global.js`. Preferować nad lokalnymi kopiami.
- **Logi konsoli:** prefiks `MROAUTO:` (info), `❌ MROAUTO:` (błędy).
- **Cache:** `fetch` używa `cache:'no-store'`, ale GH Pages CDN i tak cache'uje. Po commit zmiana może być widoczna z 1-5 min opóźnieniem.

## Workflow zmian
- **Deploy = `git push origin main`** → GitHub Pages → mroauto.cz. Nie ma środowiska staging.
- **Brak testów automatycznych.** Testowanie ręczne w przeglądarce (DevTools → Console/Network, filtr `MROAUTO`).
- **Lokalne testy:** uruchom `py -m http.server 8000` w katalogu repo, w `injector.js` tymczasowo zmień `const defaultBase = 'http://localhost:8000/';`.
- **Rollback:** commit-level (`git revert <sha>`) lub punkty kotwiczne (np. tag `pre-faza-A`).

## Gdy modyfikujesz kod
- Nowy fragment → odpowiedni folder modułu + wpis w `resources` w `injector.js` z `pathIncludes` i `matchSelector`.
- Nie nadpisuj globalnych zmiennych. Używaj IIFE i guardów (`if (window.__MRO_X_INIT) return;`).
- Loguj kluczowe etapy z prefiksem `MROAUTO:`.
- Sanitization: HTML z fetcha przechodzi przez `sanitizeHtmlString` (usuwa CSP meta) — OK dla własnych plików, ale nie wstawiaj user-input bez dodatkowej walidacji.
