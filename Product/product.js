// <!-- Modern delivery box -->
(function () {
  // Use global helper if available, otherwise define locally
  const waitForElement = window.MRO_HELPERS?.waitForElement || function(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const node = document.querySelector(selector);
        if (node) {
          observer.disconnect();
          resolve(node);
        }
      });

      observer.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
    });
  };

  // Main initialization function
  async function init() {
    // Wait for product detail page to load
    const productDetail = await waitForElement(".flex-product-detail");
    if (!productDetail) {
      console.log('MROAUTO: Product detail not found, skipping modern delivery box');
      return;
    }
    console.log('MROAUTO: Product.js - Modern delivery box initialized');
    
    const isNotLoggedIn = document.querySelector(".flex-login-form");
    if (!isNotLoggedIn) return;

    // Style modern-delivery-box przeniesione do Product/product.css (2026-05-15).
    // Wczesniej byly tu inline jako document.head.appendChild(style) — niewersjonowalne,
    // trudne w iteracji. Teraz wszystko w product.css.

document.querySelectorAll(".flex-delivery-time-item").forEach(firstItem => {
  const stockEl = firstItem.querySelector(".flex-total-amount span");
  const dateEl = firstItem.querySelector(".flex-delivery-to-time-text");
  const deadlineEl = firstItem.querySelector(".order-end-time");
  const tooltipBlock = firstItem.querySelector(".flex-on-the-way, .flex-not-on-the-way, .flex-on-stock");
  const basketEl = firstItem.querySelector(".flex-add-to-basket");
  const tresholdEl = firstItem.querySelector(".treshold");

  const priceBox = firstItem.querySelector(".flex-price");
  const priceWithVatBox = firstItem.querySelector(".flex-price-with-vat");

  if (!stockEl || !dateEl || !basketEl || !priceBox || !priceWithVatBox) return;

  const availability = stockEl.textContent.trim();
  const isAvailable = !availability.includes("0 ks");
  const deliveryDateRaw = dateEl.textContent.trim();
  const tresholdText = tresholdEl?.textContent.trim() || "";
  const deadline = deadlineEl ? deadlineEl.textContent.trim() : "";
  const tooltipAttr = tooltipBlock?.getAttribute("data-flex-html-tooltip") || "";

  const price = priceBox.textContent.trim();
  const priceWithoutVat = priceWithVatBox.textContent.trim();

  const deliveryDate = deliveryDateRaw.replace(
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    (_, m, d, y) => `${d}.${m}.${y}`
  );

  // Wyodrebniony dzien tygodnia + data (np. "Pondeli 18.05.2026" → ["Pondeli", "18.05.2026"])
  const dateMatch = deliveryDate.match(/^([\p{L}]+)\s+(\d{1,2}\.\d{1,2}\.\d{4})/u);
  const dayName = dateMatch ? dateMatch[1] : "";
  const dateOnly = dateMatch ? dateMatch[2] : deliveryDate;

  // Nextis zwraca priceWithoutVat juz z " bez DPH" suffix w textContent —
  // strip zeby nie duplikowac labela
  const priceVatClean = priceWithoutVat.replace(/\s*bez\s*DPH\s*$/i, '').trim();

  const box = document.createElement("div");
  box.className = "modern-delivery-box";
  box.innerHTML = `
    <div class="modern-status-bar ${isAvailable ? "in-stock" : "not-available"}">
      <span class="modern-status-dot"></span>
      <span class="modern-status-text">${isAvailable ? `Skladem · <strong>${availability}</strong>` : "Není skladem"}</span>
      ${tooltipBlock ? `<button type="button" class="modern-branches-link" title="Zobrazit dostupnost na pobočkách"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span class="modern-branches-text">Pobočky</span></button>` : ""}
    </div>

    ${isAvailable ? `
    <div class="modern-price-section">
      <div class="modern-price-main">${price}</div>
      <div class="modern-price-vat">${priceVatClean} <span class="modern-vat-label">bez DPH</span></div>
    </div>` : ""}

    <div class="modern-delivery-section">
      <div class="modern-delivery-label">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 8l9-5 9 5"/><path d="M9 21V12h6v9"/></svg>
        <span>Doručení</span>
      </div>
      <div class="modern-delivery-content">
        <div class="modern-delivery-date-line">
          ${dayName ? `<span class="modern-delivery-dayname">${dayName}</span>` : ""}
          <span class="modern-delivery-date">${dateOnly}</span>
        </div>
        ${tresholdText ? `<div class="modern-delivery-treshold">${tresholdText}</div>` : ""}
        ${deadline ? `<div class="modern-delivery-deadline"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${deadline}</div>` : ""}
      </div>
    </div>

    ${isAvailable ? `<div class="modern-action-section"><div class="modern-basket-container"></div></div>` : ""}
  `;

  // Wlasny tooltip na hover (niezalezny od Nextis flex-html-tooltip).
  // STRATEGIA: tooltip dziecko document.body (nie .modern-stock) — uciekamy
  // z lokalnego stacking context (tabela produktu z z-index gora mogla nas
  // przykrywac mimo z-index:9999). position:fixed wzgledem viewport, koordynaty
  // obliczane z getBoundingClientRect() na badge.
  //
  // RACE: #DeliveryTimeTooltipContent_* (~60 linii nizej w HTML niz nasze
  // .flex-product-detail anchor) moze byc jeszcze nie sparsowany gdy nasz
  // kod sie odpala — MutationObserver z auto-disconnect po 5s.
  if (tooltipBlock && tooltipAttr) {
    const stockDiv = box.querySelector(".modern-status-bar");
    if (stockDiv) {
      const myTooltip = document.createElement("div");
      myTooltip.className = "modern-stock-tooltip";
      document.body.appendChild(myTooltip);

      const tryFill = () => {
        const contentEl = document.getElementById(tooltipAttr);
        if (contentEl && contentEl.innerHTML.trim()) {
          myTooltip.innerHTML = contentEl.innerHTML;
          // Czerwony kolor dla pobocek z '0 ks' (brak na stanie)
          myTooltip.querySelectorAll('.order-time-other-branches td.value').forEach(td => {
            if (/^\s*0\s*ks\s*$/i.test(td.textContent)) {
              td.style.color = '#dc2626';
            }
          });
          return true;
        }
        return false;
      };

      if (!tryFill()) {
        const observer = new MutationObserver(() => {
          if (tryFill()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 5000);
      }

      const positionTooltip = () => {
        const rect = stockDiv.getBoundingClientRect();
        const ttHeight = myTooltip.offsetHeight;
        // domyslnie nad badge'em, wyrownany do prawej krawedzi
        let top = rect.top - ttHeight - 6;
        // jesli nie mieści sie nad — pokaz pod
        if (top < 8) top = rect.bottom + 6;
        const right = window.innerWidth - rect.right;
        myTooltip.style.top = top + 'px';
        myTooltip.style.right = right + 'px';
      };

      stockDiv.addEventListener('mouseenter', () => {
        myTooltip.classList.add('visible');
        positionTooltip();
      });
      stockDiv.addEventListener('mouseleave', () => {
        myTooltip.classList.remove('visible');
      });
      window.addEventListener('scroll', () => {
        if (myTooltip.classList.contains('visible')) positionTooltip();
      }, { passive: true });
    }
  }

  if (tooltipBlock) {
    tooltipBlock.style.display = "none";
    const toggleBtn = box.querySelector(".modern-branches-link");
    toggleBtn?.addEventListener("click", () => {
      const isVisible = tooltipBlock.style.display === "block";
      tooltipBlock.style.display = isVisible ? "none" : "block";
      toggleBtn.classList.toggle("active", !isVisible);
    });
  }

  if (isAvailable) {
    // PRZENIESIENIE basketEl zamiast klonowania (fix 2026-05-15).
    // cloneNode(true) kopiuje atrybuty ale NIE event listenery JS Nextisa.
    // Nextis spinner +/- (.flex-spinner-increment/decrement-button) ma
    // listenery podpiete do KONKRETNYCH elementow DOM. Klon ich nie ma —
    // spinner wyglada ale klik nie dziala (raz tak raz nie, bo czasem
    // Nextis ma event delegation a czasem nie).
    //
    // appendChild na elemencie ktory juz jest w DOM = MOVE (nie copy).
    // basketEl jest przenoszony z .flex-amount-info (ktore i tak hide'ujemy
    // ponizej) do naszego .modern-basket-container. ID inputu i spinner
    // data-flex-spinner-input bez zmian — JS Nextisa wciaz dziala.
    basketEl.classList.add("modern-basket");
    box.querySelector(".modern-basket-container").appendChild(basketEl);
  }

  firstItem.insertBefore(box, firstItem.firstChild);

  [...firstItem.children].forEach(el => {
    if (el !== box && (el.querySelector(".flex-amount-info") || el.querySelector(".flex-on-stock"))) {
      el.style.display = "none";
    }
  });

  // Wrapper maxHeight USUNIETO 2026-05-15 — staty hack ktory ograniczal wrapper
  // do scrollHeight w momencie initial render. Po dodaniu nowego (wyzszego)
  // .modern-delivery-box dolny brzeg karty byl uciety, a Porovnat link pod nim
  // kolidowal z dolna ramka. Wrapper zostaje z natural height.
});
  }

  // Call init function
  init();
})();


// <!-- Product description -->
(function() {
    function formatListText(container = document) {
        container.querySelectorAll('div.flex-oe-numbers-list p:not(.processed)').forEach(p => {
            const text = p.textContent.trim();
            if (text) {
                const items = text.split(',').map(item => item.trim()).filter(item => item);
                const ul = document.createElement('ul');
                ul.classList.add('flex-oe-numbers-list-items');

                items.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    ul.appendChild(li);
                });

                p.innerHTML = '';
                p.appendChild(ul);
                p.classList.add('processed');
            }
        });

        container.querySelectorAll('div.flex-car-applications-list p:not(.processed)').forEach(p => {
            const text = p.textContent.trim();
            if (text) {
                const items = text.split(',').map(item => item.trim()).filter(item => item);
                const ul = document.createElement('ul');
                ul.classList.add('flex-car-applications-list-items');

                items.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    ul.appendChild(li);
                });

                p.innerHTML = '';
                p.appendChild(ul);
                p.classList.add('processed');
            }
        });
    }

    function attachToggleEvents(container = document) {
        container.querySelectorAll('div.flex-car-applications-list h3, div.flex-oe-numbers-list h3').forEach(header => {
            if (!header.classList.contains('event-attached')) {
                header.addEventListener('click', () => {
                    header.classList.toggle('active');
                });
                header.classList.add('event-attached');
            }
        });
    }

    // Main initialization
    function init() {
        // Function to run formatting
        const runFormatting = () => {
            formatListText();
            attachToggleEvents();
        };

        // Try to run immediately if DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', runFormatting);
        } else {
            runFormatting();
        }

        // Setup observer for dynamic content - ALWAYS run this
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            formatListText(node);
                            attachToggleEvents(node);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('MROAUTO: Product.js - Description formatting initialized');
    }

    // Call init
    init();
})();
