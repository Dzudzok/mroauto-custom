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

  // Manufacturer label (z .flex-manufacturer w .flex-product-detail)
  const manufacturerEl = document.querySelector(".flex-product-detail .flex-manufacturer .flex-value");
  const manufacturerName = manufacturerEl ? manufacturerEl.textContent.trim() : "";

  const box = document.createElement("div");
  box.className = "modern-delivery-box";
  box.innerHTML = `
    ${manufacturerName ? `
    <!-- BRAND HEADER: pill z nazwa producenta -->
    <div class="mro-brand-header">
      <div class="mro-brand-pill">
        <span class="mro-brand-pill-mark">${manufacturerName.slice(0, 3).toUpperCase()}</span>
        <span class="mro-brand-pill-name">${manufacturerName}</span>
      </div>
    </div>` : ""}

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

    <!-- FEATURES: 3 ikony (Expedice / Zaruka / Vraceni) -->
    <div class="mro-features-row">
      <div class="mro-feature">
        <svg class="mro-feature-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        <div class="mro-feature-text"><b>Expedice</b><br>do 24 hodin</div>
      </div>
      <div class="mro-feature">
        <svg class="mro-feature-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <div class="mro-feature-text"><b>Záruka</b><br>24 měsíců</div>
      </div>
      <div class="mro-feature">
        <svg class="mro-feature-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        <div class="mro-feature-text"><b>Vrácení</b><br>do 14 dní</div>
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
    // PRZENIESIENIE basketEl zamiast klonowania — patrz [[feedback-move-not-clone]]
    basketEl.classList.add("modern-basket");
    box.querySelector(".modern-basket-container").appendChild(basketEl);

    // BIG CTA: Nextis input button ma value='' (sama ikona przez CSS bg-image).
    // Dodajemy text "Do kosiku" + scope-class .modern-add-btn dla stylowania.
    const addBtn = basketEl.querySelector('input.flex-add-to-basket-button');
    if (addBtn) {
      addBtn.value = 'Do košíku';
      addBtn.classList.add('modern-add-btn');
    }
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

    // Retry przez 8s, co 300ms. Pokrywa wszystkie race conditions z Nextis.
    let retries = 0;
    const retryInterval = setInterval(() => {
      retries++;
      mountModernBox(); // idempotent — guard sprawdza czy juz jest
      if (retries >= 26) clearInterval(retryInterval); // 8s
    }, 300);

    // Watchdog: obserwujemy CALE body (nie tylko .flex-product-detail) bo
    // Nextis moze wymienic caly subtree, wtedy observer na productDetail
    // przestaje istniec.
    const observer = new MutationObserver(() => {
      mountModernBox(); // idempotent
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
