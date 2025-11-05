## Krótkie wprowadzenie
Repozytorium to prosty, statyczny frontend (HTML/CSS/JS). Główny mechanizm to `injector.js` — skrypt, który w locie wstrzykuje fragmenty HTML i arkusze stylów z hostowanego katalogu (`base`) do istniejącej strony sklepu.

## Duży obraz (why/architecture)
- Strona jest zorganizowana jako zestaw fragmentów HTML i plików CSS w katalogach takich jak `Product/`, `ProductList/`, `Basket/`, `HomePage/`.
- `injector.js` decyduje, które zasoby dołączyć, na podstawie ścieżki URL i obecności selektorów DOM (np. `.flex-selected-categories-container`, `.flex-product-detail`).
- Zasoby są ładowane z zewnętrznego `base` (obecnie `https://dzudzok.github.io/mroauto-custom/`). Dla lokalnego testowania trzeba ustawić `base` na lokalny serwer.

## Kluczowe pliki i konwencje (przykłady)
- `injector.js` — centralny loader. Wzorce:
  - Czekanie na elementy: funkcja `waitFor(selector, timeout)` używa `MutationObserver`.
  - Wstrzykiwanie CSS: tworzy `<link rel="stylesheet" href="...">` i dodaje do `document.head`.
  - Wstrzykiwanie HTML: pobiera fragmenty przez `fetch(base + 'homepage.html')` i wstawia przez `insertAdjacentHTML`.
- `homepage.html`, `HomePage/homepage.html` — przykładowe fragmenty HTML (często zawierają tylko blok/fragment, nie cały dokument).
- `Product/product.css`, `homepage.css`, `variables.css` — stylowanie wstrzykiwane dynamicznie.
- `global.js` — obecnie pusty/wolny placeholder.

## Jak agent powinien się zachować (kontrakt krótkie)
- Input: zmiana plików HTML/CSS/JS w repo.
- Output: minimalna, spójna modyfikacja (nie łamać `injector.js`), jeżeli dodajesz fragment HTML upewnij się, że selektory oczekiwane przez `injector.js` pasują.
- Błędy: gdy zmiany mogą wpłynąć na hostowane `base`, zgłoś konieczność zaktualizowania `base` lub instrukcji deployu.

## Typowe przepływy i wskazówki debugowania
- Lokalnie uruchom prosty serwer (przykłady):
  - z Pythona: `py -m http.server 8000` (PowerShell)
  - z Node (jeśli dostępne): `npx http-server . -p 8000`
  - lub użyj rozszerzenia VS Code "Live Server".
- Dla lokalnych testów ustaw w `injector.js` `const base = 'http://localhost:8000/';` aby `fetch` i linki działały poprawnie.
- Otwórz DevTools → Console / Network. Poszukaj logów z `injector.js` (np. `MROAUTO: Nowy blok HTML dodany!`) i błędów fetch.

## Wzorce implementacyjne i ograniczenia
- Fragmenty HTML w repo zazwyczaj nie zawierają <head>/<body> — są przeznaczone do wstrzyknięcia.
- Selekcje elementów są krytyczne: `injector.js` szuka `.flex-selected-categories-container` i `.flex-product-detail`; zmiana tych selektorów wymaga aktualizacji `injector.js`.
- Nie ma systemu budowania ani testów automatycznych — zmiany to operacje na plikach statycznych.

## Gdy zmieniasz lub dodajesz funkcjonalność
- Jeśli dodajesz nowy fragment, umieść go w odpowiednim katalogu (np. `Product/`), użyj prostego, jednoznacznego selektora i przetestuj w lokalnym serwerze.
- Jeśli potrzebujesz dodać dłuższy skrypt inicjujący, preferuj modułowy kod i unikaj nadpisywania globalnych zmiennych; zarejestruj logi konsoli z prefiksem `MROAUTO:`.

## Co znalazłem i założyłem
- Nie znaleziono istniejących plików `.github/copilot-instructions.md` ani `AGENT.md` — utworzyłem ten plik.
- Repo to prosty, statyczny projekt bez pipeline'a CI w repo (brak `package.json`, `Makefile`, itp.).

Jeśli chcesz, scalę to z innymi informacjami (np. deploy na GitHub Pages) lub doprecyzuję checklistę PR-ów dla zmian UI/fragmentów.
