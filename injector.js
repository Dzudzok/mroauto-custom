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

  // --- helpers ---
  const injectCss = (href) => {
    try {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = (href.startsWith('http') ? href : primaryBase + href);
      document.head.appendChild(link);
      console.info('MROAUTO: injected CSS', link.href);
    } catch (e) {
      console.warn('MROAUTO: injectCss failed', href, e);
    }
  };

  const sanitizeHtmlString = (htmlString) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      // remove any meta tags with CSP-like attributes to avoid injecting <meta http-equiv> into body
      const metas = Array.from(doc.querySelectorAll('meta'));
      metas.forEach(m => {
        const eq = (m.getAttribute('http-equiv') || '').toLowerCase();
        const name = (m.getAttribute('name') || '').toLowerCase();
        if (eq.includes('content-security-policy') || name.includes('content-security-policy')) m.remove();
      });
      return doc.body.innerHTML;
    } catch (e) {
      return htmlString;
    }
  };

  const injectHtml = async (htmlPath, targetSelector, position = 'afterend', timeout = 5000) => {
    const basesToTry = Array.isArray(bases) ? bases : [bases];
    for (const b of basesToTry) {
      const url = (htmlPath.startsWith('http') ? htmlPath : (b + htmlPath));
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
          console.info('MROAUTO: fetch not ok', url, res.status);
          continue;
        }
        const text = await res.text();
        const safe = sanitizeHtmlString(text);
        const selectors = (targetSelector || 'body').split(',').map(s => s.trim()).filter(Boolean);
        selectors.forEach(sel => {
          waitFor(sel, timeout).then((el) => {
            if (!el) return;
            try {
              el.insertAdjacentHTML(position, safe);
              console.info('MROAUTO: injected HTML', url, 'into', sel);
            } catch (e) {
              console.warn('MROAUTO: failed to insert HTML into', sel, e);
            }
          });
        });
        return true;
      } catch (e) {
        console.warn('MROAUTO: fetch error', url, e);
        continue;
      }
    }
    return false;
  };

  const injectJs = (src) => {
    try {
      const script = document.createElement('script');
      script.src = (src.startsWith('http') ? src : primaryBase + src);
      script.defer = false;
      script.async = false;
      document.body.appendChild(script);
      console.info('MROAUTO: injected JS', script.src);
    } catch (e) {
      console.warn('MROAUTO: injectJs failed', src, e);
    }
  };
  
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

        // start observing for DOM changes and set a timeout fallback
        observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
        if (timeout) setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
      } catch (e) {
        // on any exception just resolve null
        resolve(null);
      }
    });
  };
  const resources = [
    {
      name: 'global',
      pathIncludes: [],
      matchSelector: 'body',
  css: 'global.css',
  html: 'global.html',
      targetSelector: 'body',
      position: 'afterbegin'
    },
    {
      name: 'homepage',
      pathIncludes: ['', '/', '/cs', '/cs/'],
      isExactPath: true,
      matchSelector: null,
  css: 'HomePage/homepage.css',
  html: 'HomePage/homepage.html',
  js: 'HomePage/homepage.js',
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
      name: 'product-top',
      pathIncludes: ['hledani', '/katalog/tecdoc/'],
      matchSelector: '.flex-product-detail',
      html: 'Product/top.html',
      targetSelector: '.flex-product-detail',
      position: 'afterbegin'
    },
    {
      name: 'product-bottom',
      pathIncludes: ['hledani', '/katalog/tecdoc/'],
      matchSelector: '.flex-product-detail',
      html: 'Product/bottom.html',
      targetSelector: '.flex-product-detail',
      position: 'beforeend'
    },
    {
      name: 'productlist',
      pathIncludes: ['hledani', '/katalog/tecdoc/'],
      matchSelector: '[id^="ProductItem_"]',
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
  matchSelector: '.vehicle-selector, .car-select, .flex-tecdoc-manufacturers',
  html: 'CarSelect/carselect.html',
  css: 'CarSelect/carselect.css',
      targetSelector: '.vehicle-selector, .car-select, .flex-tecdoc-manufacturers',
      position: 'beforeend'
    },
    {
      name: 'carselectmodels',
      pathIncludes: ['/katalog/tecdoc/osobni'],
      matchSelector: '.flex-tecdoc-models',
      html: 'CarSelect/carselectmodels.html',
      css: 'CarSelect/carselectmodels.css',
      targetSelector: '.flex-tecdoc-models',
      position: 'beforeend'
    },
    {
      name: 'carselectengines',
      pathIncludes: ['/katalog/tecdoc/osobni'],
      matchSelector: '.flex-tecdoc-engines',
      html: 'CarSelect/carselectengines.html',
      css: 'CarSelect/carselectengines.css',
      targetSelector: '.flex-tecdoc-engines',
      position: 'beforeend'
    },
    {
      name: 'search',
      pathIncludes: [],  // on every page
  matchSelector: '.flex-smart-search',
  html: 'Search/search.html',
  css: 'Search/search.css',
      targetSelector: '.flex-smart-search-input',
      position: 'beforeend'
    },
    {
      name: 'blog',
      pathIncludes: ['/blog'],
  matchSelector: '.blog-mainpage',
  html: 'Blog/blog.html',
  css: 'Blog/blog.css',
      targetSelector: '.blog-mainpage',
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
      name: 'order',
  pathIncludes: ['/objednavka', '/cs/objednavka'],
  matchSelector: '.order, .checkout, .mro-order-step, .flex-registration-step-2',
  html: 'Order/objednavka.html',
  css: 'Order/objednavka.css',
      targetSelector: '.flex-content, .mro-order-step, body, .flex-registration-step-2',
      position: 'beforeend'
    },
    {
      name: 'summary',
  pathIncludes: ['/rekapitulace-objednavky'],
  matchSelector: '.order-summary, .mro-order-step, .summary, .flex-order-controls',
  html: 'Order/summary.html',
  css: 'Order/summary.css',
      targetSelector: '.flex-content, .mro-order-step, body, .flex-order-controls',
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
      if (r.js) {
        // inject JS after HTML/CSS requests triggered (script will execute when loaded)
        injectJs(r.js);
      }
    }
  });

})();


