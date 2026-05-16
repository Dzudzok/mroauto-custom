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

  // Wstrzykuje brand pill PRZED <h1> w .flex-informations (prawa kolumna karty).
  // Wczesniej wypelnialismy .mro-product-top — ale to placeholder na poczatku
  // .flex-product-detail (przed .flex-images), wiec brand pill ladowal nad foto
  // a nie nad tytulem. Teraz wstrzykujemy bezposrednio do .flex-informations.
  function populateBrandPill() {
    const info = document.querySelector('.flex-product-detail .flex-informations:not(.flex-tab)');
    if (!info) return;
    if (info.querySelector(':scope > .mro-brand-strip')) return; // juz wstrzykniete

    const manufacturerEl = info.querySelector('.flex-manufacturer .flex-value');
    const codeEl = info.querySelector('.flex-code .flex-value');
    const tecdocEl = info.querySelector('.flex-tecdoc-number .flex-value');

    const manufacturer = manufacturerEl ? manufacturerEl.textContent.trim() : '';
    const code = codeEl ? (codeEl.value || codeEl.textContent || '').trim() : '';
    const tecdoc = tecdocEl ? tecdocEl.textContent.trim() : '';

    if (!manufacturer) return;

    const strip = document.createElement('div');
    strip.className = 'mro-brand-strip';
    const mark = manufacturer.slice(0, 3).toUpperCase();
    strip.innerHTML = `
      <span class="mro-brand-pill">
        <span class="mro-brand-pill-mark">${mark}</span>
        <span class="mro-brand-pill-name">${manufacturer}</span>
      </span>
      ${code ? `<span class="mro-product-meta"><span class="mro-product-meta-label">Kód</span> <strong>${code}</strong></span>` : ''}
      ${tecdoc && tecdoc !== code ? `<span class="mro-product-meta"><span class="mro-product-meta-label">TecDoc®</span> <strong>${tecdoc}</strong></span>` : ''}
    `;
    const h1 = info.querySelector(':scope > h1');
    if (h1) {
      info.insertBefore(strip, h1);
    } else {
      info.insertBefore(strip, info.firstChild);
    }
  }

  // Mountowanie modern-delivery-box. Wywolywane na init() + watchdog re-mount
  // jesli Nextis re-renderowal DOM po naszym pierwszym mount.
  function mountModernBox() {
    // CELOWE (potwierdzone z userem 2026-05-16): modern-delivery-box pokazuje sie
    // TYLKO dla goscia/niezalogowanego (B2C). Zalogowani B2B widza natywny Nextis
    // layout z negocjowanymi/hurtowymi cenami — nie nadpisujemy go.
    const isGuest = !!document.querySelector(".flex-login-form");
    if (!isGuest) return;

    // Guard idempotencji: jesli juz zamontowany, skip.
    if (document.querySelector('.flex-product-detail .modern-delivery-box')) return;

    // Style modern-delivery-box przeniesione do Product/product.css (2026-05-15).
    // Wczesniej byly tu inline jako document.head.appendChild(style) — niewersjonowalne,
    // trudne w iteracji. Teraz wszystko w product.css.

document.querySelectorAll(".flex-delivery-time-item").forEach((firstItem, index) => {
  // Nextis renderuje WIELE .flex-delivery-time-item per produkt (rozne opcje
  // dostawy: kurierzy GLS/DPD/PPL, deadliny Dnes/Jutro/Za 3 dny). Pokazujemy
  // tylko PIERWSZA (najszybsza) w modern karcie, pozostale chowamy. Wczesniej
  // robil to wrapper.maxHeight hack — usuniety w v13 zeby nasza karta nie byla
  // cieta. Teraz hide explicit.
  if (index > 0) {
    firstItem.style.display = "none";
    return;
  }

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

  // Parse deadline ('Doba dodání při objednávce Dnes do 17:00') → '17:00'
  const deadlineTime = (deadline.match(/(\d{1,2}:\d{2})/) || [])[1] || "";

  const box = document.createElement("div");
  box.className = "modern-delivery-box";
  box.innerHTML = `
    <!-- PRICE CARD: gradient bg + cena + status z dot + Pobocky button -->
    <div class="mro-price-card ${isAvailable ? "is-in-stock" : "is-unavailable"}">
      <div class="mro-price-row">
        ${isAvailable ? `
          <div class="mro-price-wrap">
            <div class="mro-price-main">${price}</div>
            <div class="mro-price-vat">${priceVatClean} <span class="mro-vat-label">bez DPH</span></div>
          </div>` : ""}
      </div>
      <div class="mro-stock-row">
        <span class="mro-stock-status">
          <span class="mro-stock-dot ${isAvailable ? "is-pulse" : ""}"></span>
          ${isAvailable ? `Skladem · <strong>${availability}</strong>` : "Není skladem"}
        </span>
        ${tooltipBlock ? `<button type="button" class="mro-branches-link" title="Zobrazit dostupnost na pobočkách"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span class="mro-branches-text">Pobočky</span></button>` : ""}
      </div>
    </div>

    ${isAvailable ? `
    <!-- CTA ROW: spinner + big red pill button -->
    <div class="mro-cta-row">
      <div class="mro-basket-container modern-basket-container"></div>
    </div>` : ""}

    <!-- DELIVERY BANNER: zielony banner z truck + countdown -->
    <div class="mro-delivery-banner">
      <div class="mro-delivery-banner-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
      </div>
      <div class="mro-delivery-banner-body">
        <div class="mro-delivery-banner-title">
          ${deadlineTime ? `Objednejte do <b>${deadlineTime}</b> a zboží dorazí ` : "Doručení "}<b>${dayName ? dayName + ' ' : ''}${dateOnly}</b>
        </div>
        ${tresholdText ? `<div class="mro-delivery-banner-meta">${tresholdText}</div>` : ""}
      </div>
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
    const stockDiv = box.querySelector(".mro-price-card");
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

  // Wrapper i firstItem moga miec overflow:hidden + max-height z Nextis CSS
  // (lub po starym kodzie). Wymuszamy visible + max-height:none zeby caly
  // nasz nowy .modern-delivery-box byl widoczny (v13: header + cena + dostawa
  // + akcja jest wyzsze niz oryginalny element).
  firstItem.style.overflow = "visible";
  firstItem.style.maxHeight = "none";
  const wrapper = firstItem.closest(".wrapper");
  if (wrapper) {
    wrapper.style.overflow = "visible";
    wrapper.style.maxHeight = "none";
  }
});
  }

  // Init + watchdog (3 poziomy obrony przeciw 'znikajaco po F5'):
  //   1. MutationObserver na body (szerszy zakres — jesli Nextis innerHTML='...'
  //      na .flex-product-detail, obserwator na body nadal lapie)
  //   2. Interval retry przez 8s (co 300ms) — brutalne ale niezawodne
  //   3. ASP.NET endRequest hook + BFCache pageshow
  async function init() {
    const productDetail = await waitForElement(".flex-product-detail");
    if (!productDetail) return;

    // Try initial mount
    mountModernBox();
    populateBrandPill();

    // Retry przez 8s, co 300ms. Pokrywa wszystkie race conditions z Nextis.
    let retries = 0;
    const retryInterval = setInterval(() => {
      retries++;
      mountModernBox(); // idempotent — guard sprawdza czy juz jest
      populateBrandPill(); // idempotent (skip jesli juz wstrzykniete)
      if (retries >= 26) clearInterval(retryInterval); // 8s
    }, 300);

    // Watchdog: obserwujemy CALE body (nie tylko .flex-product-detail) bo
    // Nextis moze wymienic caly subtree, wtedy observer na productDetail
    // przestaje istniec.
    const observer = new MutationObserver(() => {
      mountModernBox(); // idempotent
      populateBrandPill();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // ASP.NET UpdatePanel hook — re-mount po endRequest
    try {
      if (window.Sys && Sys.WebForms && Sys.WebForms.PageRequestManager) {
        Sys.WebForms.PageRequestManager.getInstance().add_endRequest(() => {
          setTimeout(mountModernBox, 50);
        });
      }
    } catch (e) {}
  }

  init();
  // BFCache (back/forward cache): pageshow z e.persisted=true znaczy ze strona
  // z cache. F5 czasem tez triggeruje pageshow (zaleznie od browser).
  window.addEventListener('pageshow', () => {
    setTimeout(mountModernBox, 0);
    setTimeout(mountModernBox, 500); // double-tap zeby zlapac late Nextis renders
  });
  // visibilitychange — gdy user wraca do taby po np. minimize, sprawdz mount
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setTimeout(mountModernBox, 0);
  });
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
