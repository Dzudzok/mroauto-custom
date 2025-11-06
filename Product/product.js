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

    const style = document.createElement("style");
  style.textContent = `
    .modern-delivery-box {
      border-radius: 12px;
      padding: 1rem;
      font-family: inherit;
      margin: 1rem 0;
      display: flex;
      flex-direction: column;
      gap: 0.8em;
    }
    .modern-line1 {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1em;
      flex-wrap: wrap;
      margin-left: 5px;
	  flex-direction: row-reverse;
    }
    .modern-stock {
      padding: 0.4em;
      border-radius: 8px;
      font-weight: bold;
      font-size: 1.1em;
    }
    .modern-stock.in-stock {
      background: #d4ffd0;
      color: #3b5060;
      border: 1px solid #dcdcdc;
      box-shadow: 1px 0px 3px 2px #d9d9d970;
    }
    .modern-stock.not-available {
      background: #fee2e2;
      color: #991b1b;
    }
    .modern-price {
      font-size: 1.8em;
      font-weight: bold;
      color: #3b5060;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
	  text-shadow: 2px 2px 2px #0000001f;
    }
    .modern-vat {
      display: block;
      font-size: 0.5em;
      color: #6b7280;
	  font-weight: 300;
		margin-top: 7px;
    }
    .modern-basket {
      display: flex;
      align-items: center;
      gap: 0.5em;
    }
    .modern-line2 {
      display: flex;
	  flex-direction: row-reverse;
      justify-content: space-between;
      align-items: stretch;
      font-size: 1.15em;
      color: #3b5060;
      flex-wrap: wrap;
      gap: 0.5em;
    }
    @media (max-width: 480px) {
      .modern-line2 {
        align-items: stretch;
        flex-wrap: unset;
		flex-direction: row;
      }
	  .modern-line1 {
      	flex-direction: row;
	  }
      .modern-basket-container {
        justify-content: flex-end;
      }
      .modern-price {
        font-size: 1.6em;
      }
	   .modern-date {
		max-width: 50%;
	   }
    }

    .modern-line2 small {
      font-size: 0.85em;
      margin-top: 11px;
      font-weight: 500;
	  color: #58595a;
    }
    .modern-deadline {
      font-size: 0.7em;
      color: #58595a;
    }
    .modern-date {
      display: flex;
      gap: 0.12em;
      flex-direction: column;
      margin-top: 15px;
      font-weight: bold;
      margin-left: 6px;
      border: 1px solid #dcdcdc;
      background: #ebf2f8;
      box-shadow: 1px 0px 3px 2px #d9d9d970;
      border-radius: 8px;
      padding: 10px 10px 10px 10px;
	  color: #00569d;
    }
    .modern-basket-container {
      display: flex;
      align-items: center;
      gap: 0.5em;
     margin-left: 5px;
    }
	.modern-price>strong {
    border-bottom: 2px solid #e30613;
	}
  `;
  document.head.appendChild(style);

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
  box.innerHTML = `
    <div class="modern-line1">
      <div class="modern-stock ${isAvailable ? "in-stock" : "not-available"} processed" ${tooltipAttr ? `data-flex-html-tooltip="${tooltipAttr}"` : ""}>
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

  if (tooltipBlock) {
    tooltipBlock.style.display = "none";
    const toggleBtn = box.querySelector(".show-branches");
    toggleBtn?.addEventListener("click", () => {
      const isVisible = tooltipBlock.style.display === "block";
      tooltipBlock.style.display = isVisible ? "none" : "block";
    });
  }

	if (isAvailable) {
	  const basketClone = basketEl.cloneNode(true);
	  basketClone.classList.add("modern-basket");

	  const amountInput = basketClone.querySelector("input[type=text][id]");
	  const addButton = basketClone.querySelector("input[type=button][onclick]");

	  if (amountInput && addButton) {
		const newId = "modern_amount_" + Math.floor(Math.random() * 1000000);
		amountInput.setAttribute("id", newId);

		const oldOnClick = addButton.getAttribute("onclick");
		const newOnClick = oldOnClick.replace(/find\('.*?'\)/, `find('#${newId}')`);
		addButton.setAttribute("onclick", newOnClick);
	  }

	  box.querySelector(".modern-basket-container").appendChild(basketClone);
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
    async function init() {
        // Wait for one of the target containers to appear
        const found = await Promise.race([
            waitForElement('div.flex-oe-numbers-list'),
            waitForElement('div.flex-car-applications-list')
        ]);

        if (!found) {
            console.log('MROAUTO: Product description containers not found, skipping formatting');
            return;
        }

        console.log('MROAUTO: Product.js - Description formatting initialized');

        // Run initial formatting
        formatListText();
        attachToggleEvents();

        // Setup observer for dynamic content
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
    }

    // Call init
    init();
})();
