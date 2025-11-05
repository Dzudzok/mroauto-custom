/* injector.js – finalna wersja testowa */
(() => {
  // Base URL(s) where fragments and CSS are hosted. For local testing override via Tampermonkey by
  // setting window.MRO_BASE (string) or window.MRO_BASES (array of strings) before this script runs.
  // Default: GitHub Pages hosting for this repo.
  const defaultBase = 'https://dzudzok.github.io/mroauto-custom/';
  const bases = (Array.isArray(window.MRO_BASES) && window.MRO_BASES.length)
    ? window.MRO_BASES
    : [(window.MRO_BASE || defaultBase)];
  // convenience: primary base used for CSS injection (first available)
  const primaryBase = bases[0];
  const path = location.pathname.toLowerCase();
  
  // --- helpers for path matching ---
  const isExactPath = (testPath, allowedPaths) => {
    return allowedPaths.some(p => p === testPath);
  };

  const includesPath = (testPath, fragments) => {
    return fragments.some(p => p && testPath.includes(p));
  };

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
    link.href = href.startsWith('http') ? href : primaryBase + href;
    document.head.appendChild(link);
    console.log('MROAUTO: CSS injected', link.href);
  };
  // sanitizeHtmlString: parse fragment and return safe body HTML (remove meta CSP inserted outside <head>)
  const sanitizeHtmlString = (html) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Remove meta tags that set Content-Security-Policy (or similar) so they don't appear in body
      const metas = Array.from(doc.querySelectorAll('meta'));
      metas.forEach(m => {
        const http = (m.getAttribute('http-equiv') || '').toLowerCase();
        const name = (m.getAttribute('name') || '').toLowerCase();
        if (http.includes('content-security-policy') || name.includes('content-security-policy')) {
          m.remove();
        }
      });

      // Prefer body content if present; otherwise strip meta tags as a fallback
      if (doc.body && doc.body.innerHTML.trim()) {
        return doc.body.innerHTML;
      }
      // fallback: remove any meta tags from raw HTML
      return html.replace(/<meta[^>]*>/gi, '');
    } catch (e) {
      console.warn('MROAUTO: sanitizeHtmlString failed, using raw HTML', e);
      return html.replace(/<meta[^>]*>/gi, '');
    }
  };

  const injectHtml = async (htmlPath, targetSelector, position = 'afterend', waitTimeout = 5000) => {
    if (!htmlPath) return;
    try {
      // Try fetching the HTML fragment from each configured base until one succeeds.
      let res = null;
      let triedUrl = null;
      for (const b of bases) {
        const url = b + htmlPath;
        triedUrl = url;
        try {
          res = await fetch(url);
          if (res.ok) {
            // found it
            break;
          }
          console.warn('MROAUTO: próba fetch', res.status, res.statusText, 'dla', url);
        } catch (e) {
          console.warn('MROAUTO: fetch error dla', url, e);
        }
        res = null;
      }

      if (!res || !res.ok) {
        console.warn('MROAUTO: Nie znaleziono pliku pod żadną z baz dla', htmlPath, 'ostatnia próba:', triedUrl);
        console.info('MROAUTO: Spróbuj ustawić window.MRO_BASE lub window.MRO_BASES w Tampermonkey przed załadowaniem injector.js');
        return;
      }

      let html = await res.text();

      // sanitize fragment to avoid injecting <meta http-equiv="Content-Security-Policy"> into body
      const safeHtml = sanitizeHtmlString(html);

      if (targetSelector) {
        const target = await waitFor(targetSelector, waitTimeout);
        if (!target) {
          console.warn('MROAUTO: Nie znaleziono targetu dla', htmlPath, targetSelector);
          return;
        }
        target.insertAdjacentHTML(position, safeHtml);
        console.log('MROAUTO: HTML wstrzyknięty do', targetSelector, '(', htmlPath, ')');
      } else {
        // fallback: append to body
        document.body.insertAdjacentHTML('beforeend', safeHtml);
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
      name: 'global',
      pathIncludes: [],  // puste = wszystkie strony
      matchSelector: 'body',  // zawsze obecny
      css: 'global.css',
      html: 'global.html',
      js: 'global.js',
      targetSelector: 'body',
      position: 'afterbegin'
    },
    {
      name: 'homepage',
      pathIncludes: ['', '/', '/cs', '/cs/'],
      isExactPath: true,  // tylko dokładne dopasowanie ścieżki
      matchSelector: null,
      css: 'HomePage/homepage.css',
      html: 'HomePage/homepage.html',
      targetSelector: '.flex-selected-categories-container',
      position: 'afterend'
    },
    {
      name: 'product',
      pathIncludes: ['hledani', '/katalog/tecdoc/'],
      matchSelector: '.flex-product-detail',
      css: 'Product/product.css',
      html: 'Product/product.html',
      targetSelector: '.flex-product-detail',
      position: 'beforeend'
    },
    {
      name: 'productlist',
      pathIncludes: ['hledani', '/katalog/tecdoc/'],
      matchSelector: '[id^="ProductItem_"]',  // element z id zaczynającym się od ProductItem_
      css: 'ProductList/productlist.css',
      html: 'ProductList/productlist.html',
      targetSelector: '.flex-item.catalog-view',
      position: 'beforeend'
    },
    {
      name: 'basket',
      pathIncludes: ['/kosik'],
      matchSelector: '.basket, .cart, .flex-basket',
      html: 'Basket/basket.html',
      css: 'Basket/basket.css',
      targetSelector: '.basket, .cart, .flex-basket',
      position: 'beforeend'
    },
    {
      name: 'carselect',
      pathIncludes: ['/katalog/tecdoc/osobni'],
      matchSelector: '.vehicle-selector, .car-select',
      html: 'CarSelect/carselect.html',
      css: 'CarSelect/carselect.css',
      targetSelector: '.vehicle-selector, .car-select',
      position: 'beforeend'
    },
    {
      name: 'search',
      pathIncludes: [],  // na każdej stronie
      matchSelector: '.flex-smart-search',
      html: 'Search/search.html',
      css: 'Search/search.css',
      targetSelector: '.flex-smart-search-input',
      position: 'beforeend'
    },
    {
      name: 'blog',
      pathIncludes: ['/blog'],
      matchSelector: '.blog-mainpage',  // sprawdź czy to strona bloga
      html: 'Blog/blog.html',
      css: 'Blog/blog.css',
      targetSelector: '.blog-mainpage', // wstrzyknij do znalezionego elementu
      position: 'beforeend'
    },
    {
      name: 'universal',
      pathIncludes: ['/katalog/univerzalni-dily'],
      matchSelector: '.flex-universal-parts',
      html: 'UniversalParts/universal.html',
      css: 'UniversalParts/universal.css',
      targetSelector: '.flex-universal-parts',
      position: 'beforeend'
    },
    {
      name: 'contact',
      pathIncludes: ['/clanek/kontakt-mroauto-cz'],
      html: 'Contact/contact.html',
      css: 'Contact/contact.css',
      targetSelector: '.flex-content',
      position: 'beforeend'
    },
    {
      name: 'about',
      pathIncludes: ['/clanek/o-nas-cz'],
      html: 'AboutUs/aboutus.html',
      css: 'AboutUs/aboutus.css',
      targetSelector: '.flex-content',
      position: 'beforeend'
    },
    {
      name: 'privacy',
      pathIncludes: ['/clanek/obchodni-podminky-cz2'],
      html: 'Privacy/privacy.html',
      css: 'Privacy/privacy.css',
      targetSelector: '.flex-content',
      position: 'beforeend'
    },
    {
      name: 'shipping',
      pathIncludes: ['/clanek/platba-cena-doprava-cz'],
      html: 'Shipping/shipping.html',
      css: 'Shipping/shipping.css',
      targetSelector: '.flex-content',
      position: 'beforeend'
    },
    {
      name: 'downloads',
      pathIncludes: ['/clanek/soubory-ke-stazeni-cz'],
      html: 'Downloads/downloads.html',
      css: 'Downloads/downloads.css',
      targetSelector: '.flex-content',
      position: 'beforeend'
    },
    {
      name: 'actions',
      pathIncludes: ['/akce/'],
      html: 'Actions/actions.html',
      css: 'Actions/actions.css',
      targetSelector: '.flex-content',
      position: 'beforeend'
    }
  ];

  // --- process rules ---
  resources.forEach((r) => {
    // match by pathIncludes (exact or partial) OR by selector presence
    const pathMatch = r.pathIncludes && (r.isExactPath ? isExactPath(path, r.pathIncludes) : includesPath(path, r.pathIncludes));
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


