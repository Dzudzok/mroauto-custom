/* injector.js – finalna wersja testowa */
(() => {
  // Base URL where fragments and CSS are hosted. For local testing override to 'http://localhost:8000/'.
  const base = 'https://dzudzok.github.io/mroauto-custom/';
  const path = location.pathname.toLowerCase();

  // --- waitFor: resolves when selector appears or null on timeout ---
  const waitFor = (selector, timeout = 5000) => {
    return new Promise((resolve) => {
      try {
        const el = document.querySelector(selector);
        if (el) return resolve(el);

        const observer = new MutationObserver(() => {
          const node = document.querySelector(selector);
          if (node) {
            observer.disconnect();
            resolve(node);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, timeout);
      } catch (e) {
        console.error('MROAUTO: waitFor error', e);
        resolve(null);
      }
    });
  };

  // --- helpers to inject CSS and HTML ---
  const injectCss = (href) => {
    if (!href) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href.startsWith('http') ? href : base + href;
    document.head.appendChild(link);
    console.log('MROAUTO: CSS injected', link.href);
  };

  const injectHtml = async (htmlPath, targetSelector, position = 'afterend', waitTimeout = 5000) => {
    if (!htmlPath) return;
    try {
      const res = await fetch(base + htmlPath);
      const html = await res.text();

      if (targetSelector) {
        const target = await waitFor(targetSelector, waitTimeout);
        if (!target) {
          console.warn('MROAUTO: Nie znaleziono targetu dla', htmlPath, targetSelector);
          return;
        }
        target.insertAdjacentHTML(position, html);
        console.log('MROAUTO: HTML wstrzyknięty do', targetSelector, '(', htmlPath, ')');
      } else {
        // fallback: append to body
        document.body.insertAdjacentHTML('beforeend', html);
        console.log('MROAUTO: HTML wstrzyknięty do body (fallback)', htmlPath);
      }
    } catch (e) {
      console.error('MROAUTO: Błąd ładowania', htmlPath, e);
    }
  };

  // --- resource routing table ---
  // Each rule: name, match by pathIncludes (any), matchSelector (DOM selector to check presence), css, html, targetSelector, position
  const resources = [
    {
      name: 'homepage',
      pathIncludes: ['', '/', '/cs'],
      matchSelector: null,
      css: 'homepage.css',
      html: 'homepage.html',
      targetSelector: '.flex-selected-categories-container',
      position: 'afterend'
    },
    {
      name: 'product',
      pathIncludes: ['hledani', 'produkt'],
      matchSelector: '.flex-product-detail',
      css: 'Product/product.css'
    },
    {
      name: 'productlist',
      pathIncludes: ['productlist', 'produkty', 'kategorie'],
      matchSelector: '.flex-product-list, .flex-content, .catalog, .products, .flex-products',
      css: 'ProductList/productlist.css', // optional - add file if you create it
      html: 'ProductList/productlist.html',
      // try to insert at the first reasonable container
      targetSelector: '.flex-product-list, .flex-content, .catalog, .products, .flex-products',
      position: 'beforeend'
    }

  ];

  // --- process rules ---
  resources.forEach((r) => {
    // match by pathIncludes OR by selector presence
    const pathMatch = r.pathIncludes && r.pathIncludes.some(p => p && path.includes(p));
    const selectorMatch = r.matchSelector && document.querySelector(r.matchSelector);

    if (pathMatch || selectorMatch) {
      if (r.css) injectCss(r.css);
      if (r.html) {
        // inject HTML asynchronously; targetSelector may be a list of selectors separated by comma
        injectHtml(r.html, r.targetSelector, r.position || 'afterend', 7000);
      }
    }
  });

})();


