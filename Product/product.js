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

  const box = document.createElement("div");
  box.className = "modern-delivery-box";
  // UWAGA: data-flex-html-tooltip ustawiane przez setAttribute PO innerHTML.
  // Wartosc atrybutu z Nextis zawiera cudzyslowy " (np. <table style="...">),
  // wstawienie do template literal `data-flex-html-tooltip="${tooltipAttr}"`
  // zamyka atrybut w srodku — parser HTML rozjezdza sie, tooltip raz dziala
  // raz nie. setAttribute browser sam escape'uje.
  box.innerHTML = `
    <div class="modern-line1">
      <div class="modern-stock ${isAvailable ? "in-stock" : "not-available"} processed">
        ${isAvailable ? "✅ <strong>" + availability + "</strong> skladem" : "❌ <strong>Není skladem</strong>"}
        ${tooltipBlock ? `<div class="show-branches" style="cursor:pointer;color:#006fd2;font-size:0.8em;font-weight:300;margin-top:6px;">ℹ️ Zobrazit dostupnost na pobočkách</div>` : ""}
      </div>
      ${isAvailable ? `<div class="modern-price"><strong>${price}</strong> <span class="modern-vat">${priceWithoutVat}</span></div>` : ""}
    </div>
    <div class="modern-line2">
      <div class="modern-date">
        📦 ${deliveryDate} ${tresholdText ? `<small>(${tresholdText})</small>` : ""}
        ${deadline ? `<div class="modern-deadline">${deadline}</div>` : ""}
      </div>
      <div class="modern-basket-container"></div>
    </div>
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
    const stockDiv = box.querySelector(".modern-stock");
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
    const toggleBtn = box.querySelector(".show-branches");
    toggleBtn?.addEventListener("click", () => {
      const isVisible = tooltipBlock.style.display === "block";
      tooltipBlock.style.display = isVisible ? "none" : "block";
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

  const wrapper = firstItem.closest(".wrapper");
  if (wrapper) {
    wrapper.style.overflow = "hidden";
    wrapper.style.maxHeight = firstItem.scrollHeight + "px";
  }
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
