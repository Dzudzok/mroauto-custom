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
      js: 'global.js',
      targetSelector: 'body',
      position: 'afterbegin'
    },
    {
      name: 'homepage',
      pathIncludes: ['', '/', '/cs', '/cs/'],
      isExactPath: true,
      matchSelector: null,
      css: 'HomePage/homepage.css',
      js: 'HomePage/homepage.js',
      html: 'HomePage/homepage.html',
      targetSelector: '.flex-selected-categories-container',
      position: 'afterend'
    },
    {
      name: 'product',
      pathIncludes: ['hledani', '/katalog/tecdoc/'],
      matchSelector: '.flex-product-detail',
      css: 'Product/product.css',
      js: 'Product/product.js',
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
      js: 'ProductList/productlist.js',
      html: 'ProductList/productlist.html',
      targetSelector: '.flex-item.catalog-view',
      position: 'beforeend'
    },
    {
      name: 'basket',
      pathIncludes: ['/kosik'],
      matchSelector: '.basket, .cart, .flex-basket',
      js: 'Basket/basket.js',
      html: 'Basket/basket.html',
      css: 'Basket/basket.css',
      targetSelector: '.basket, .cart, .flex-basket',
      position: 'beforeend'
    },
    {
      name: 'carselect',
      pathIncludes: ['/katalog/tecdoc/osobni'],
      matchSelector: '.vehicle-selector, .car-select, .flex-tecdoc-manufacturers',
      js: 'CarSelect/carselect.js',
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
      js: 'Search/search.js',
      html: 'Search/search.html',
      css: 'Search/search.css',
      targetSelector: '.flex-smart-search-input',
      position: 'beforeend'
    },
    {
      name: 'blog',
      pathIncludes: ['/blog'],
      matchSelector: '.blog-mainpage',
      js: 'Blog/blog.js',
      html: 'Blog/blog.html',
      css: 'Blog/blog.css',
      targetSelector: '.blog-mainpage',
      position: 'beforeend'
    },
    {
      name: 'universal',
      pathIncludes: ['/katalog/univerzalni-dily'],
      matchSelector: '.flex-universal-parts',
      js: 'UniversalParts/universal.js',
      html: 'UniversalParts/universal.html',
      css: 'UniversalParts/universal.css',
      targetSelector: '.flex-universal-parts',
      position: 'beforeend'
    },
    {
      name: 'contact',
      pathIncludes: ['/clanek/kontakt-mroauto-cz'],
      js: 'Contact/contact.js',
      html: 'Contact/contact.html',
      css: 'Contact/contact.css',
      targetSelector: '.flex-content',
      position: 'beforeend'
    },
    {
      name: 'about',
      pathIncludes: ['/clanek/o-nas-cz'],
      js: 'AboutUs/aboutus.js',
      html: 'AboutUs/aboutus.html',
      css: 'AboutUs/aboutus.css',
      targetSelector: '.flex-content',
      position: 'beforeend'
    },
    {
      name: 'privacy',
      pathIncludes: ['/clanek/obchodni-podminky-cz2'],
      js: 'Privacy/privacy.js',
      html: 'Privacy/privacy.html',
      css: 'Privacy/privacy.css',
      targetSelector: '.flex-content',
      position: 'beforeend'
    },
    {
      name: 'shipping',
      pathIncludes: ['/clanek/platba-cena-doprava-cz'],
      js: 'Shipping/shipping.js',
      html: 'Shipping/shipping.html',
      css: 'Shipping/shipping.css',
      targetSelector: '.flex-content',
      position: 'beforeend'
    },
    {
      name: 'downloads',
      pathIncludes: ['/clanek/soubory-ke-stazeni-cz'],
      js: 'Downloads/downloads.js',
      html: 'Downloads/downloads.html',
      css: 'Downloads/downloads.css',
      targetSelector: '.flex-content',
      position: 'beforeend'
    },
    {
      name: 'order',
      pathIncludes: ['/objednavka', '/cs/objednavka'],
      matchSelector: '.order, .checkout, .mro-order-step, .flex-registration-step-2',
      js: 'Order/objednavka.js',
      html: 'Order/objednavka.html',
      css: 'Order/objednavka.css',
      targetSelector: '.flex-content, .mro-order-step, body, .flex-registration-step-2',
      position: 'beforeend'
    },
    {
      name: 'summary',
      pathIncludes: ['/rekapitulace-objednavky'],
      matchSelector: '.order-summary, .mro-order-step, .summary, .flex-order-controls',
      js: 'Order/summary.js',
      html: 'Order/summary.html',
      css: 'Order/summary.css',
      targetSelector: '.flex-content, .mro-order-step, body, .flex-order-controls',
      position: 'beforeend'
    },
    {
      name: 'actions',
      pathIncludes: ['/akce/'],
      js: 'Actions/actions.js',
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


