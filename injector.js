(() => {
  const defaultBase = 'https://dzudzok.github.io/mroauto-custom/';
  const bases = (Array.isArray(window.MRO_BASES) && window.MRO_BASES.length)
    ? window.MRO_BASES
    : [(window.MRO_BASE || defaultBase)];

  const primaryBase = bases[0];
  const path = location.pathname.toLowerCase();
  

  const isExactPath = (testPath, allowedPaths) => {
    return allowedPaths.some(p => p === testPath);
  };

  const includesPath = (testPath, fragments) => {
    return fragments.some(p => p && testPath.includes(p));
  };


  const injectCss = (href) => {
    try {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = (href.startsWith('http') ? href : primaryBase + href);
      document.head.appendChild(link);
    } catch (e) {
      console.warn('MROAUTO: injectCss failed', href, e);
    }
  };

  const sanitizeHtmlString = (htmlString) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
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

        observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
        if (timeout) setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
      } catch (e) {
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
      js: 'Product/product.js',
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
      matchSelector: ['[id^="ProductItem_"]', '.flex-tecdoc-vehicle-info-box'],
      css: 'ProductList/productlist.css',
      html: 'ProductList/productlist.html',
      js: 'ProductList/productlist.js',
      targetSelector: '.flex-item.catalog-view',
      position: 'beforeend'
    },
    {
      name: 'basket',
      pathIncludes: ['/kosik'],
      matchSelector: '.basket, .cart, .flex-basket',
      html: 'Basket/basket.html',
      css: 'Basket/basket.css',
      js: 'Basket/basket.js',
      targetSelector: '.basket, .cart, .flex-basket',
      position: 'beforeend'
    },
    {
      name: 'carselect',
      pathIncludes: ['/katalog/tecdoc/osobni'],
      matchSelector: '.vehicle-selector, .car-select, .flex-tecdoc-manufacturers',
      html: 'CarSelect/carselect.html',
      css: 'CarSelect/carselect.css',
      js: 'CarSelect/carselect.js',
      targetSelector: '.vehicle-selector, .car-select, .flex-tecdoc-manufacturers',
      position: 'beforeend'
    },
    {
      name: 'carselectmodels',
      pathIncludes: ['/katalog/tecdoc/osobni'],
      matchSelector: '.flex-tecdoc-models',
      html: 'CarSelect/carselectmodels.html',
      css: 'CarSelect/carselectmodels.css',
      js: 'CarSelect/carselectmodels.js',
      targetSelector: '.flex-tecdoc-models',
      position: 'beforeend'
    },
    {
      name: 'carselectengines',
      pathIncludes: ['/katalog/tecdoc/osobni'],
      matchSelector: '.flex-tecdoc-engines',
      html: 'CarSelect/carselectengines.html',
      css: 'CarSelect/carselectengines.css',
      js: 'CarSelect/carselectengines.js',
      targetSelector: '.flex-tecdoc-engines',
      position: 'beforeend'
    },
    {
      name: 'search',
      pathIncludes: [],
      matchSelector: '.flex-smart-search',
      html: 'Search/search.html',
      css: 'Search/search.css',
      js: 'Search/search.js',
      targetSelector: '.flex-smart-search-input',
      position: 'beforeend'
    },
    {
      name: 'blog',
      pathIncludes: ['/blog'],
      matchSelector: '.blog-mainpage',
      html: 'Blog/blog.html',
      css: 'Blog/blog.css',
      js: 'Blog/blog.js',
      targetSelector: '.blog-mainpage',
      position: 'beforeend'
    },
    {
      name: 'universal',
      pathIncludes: ['/katalog/univerzalni-dily'],
      matchSelector: '.flex-universal-parts',
      html: 'UniversalParts/universal.html',
      css: 'UniversalParts/universal.css',
      js: 'UniversalParts/universal.js',
      targetSelector: '.flex-universal-parts',
      position: 'beforeend'
    },
    {
      name: 'contact',
      pathIncludes: ['/clanek/kontakt-mroauto-cz'],
      html: 'Contact/contact.html',
      css: 'Contact/contact.css',
      js: 'Contact/contact.js',
      targetSelector: '.flex-content',
      position: 'beforeend'
    },
    {
      name: 'about',
      pathIncludes: ['/clanek/o-nas-cz'],
      html: 'AboutUs/aboutus.html',
      css: 'AboutUs/aboutus.css',
      js: 'AboutUs/aboutus.js',
      targetSelector: '.flex-content',
      position: 'beforeend'
    },
    {
      name: 'privacy',
      pathIncludes: ['/clanek/obchodni-podminky-cz2'],
      html: 'Privacy/privacy.html',
      css: 'Privacy/privacy.css',
      js: 'Privacy/privacy.js',
      targetSelector: '.flex-content',
      position: 'beforeend'
    },
    {
      name: 'shipping',
      pathIncludes: ['/clanek/platba-cena-doprava-cz'],
      html: 'Shipping/shipping.html',
      css: 'Shipping/shipping.css',
      js: 'Shipping/shipping.js',
      targetSelector: '.flex-content',
      position: 'beforeend'
    },
    {
      name: 'downloads',
      pathIncludes: ['/clanek/soubory-ke-stazeni-cz'],
      html: 'Downloads/downloads.html',
      css: 'Downloads/downloads.css',
      js: 'Downloads/downloads.js',
      targetSelector: '.flex-content',
      position: 'beforeend'
    },
    {
      name: 'objednavka',
      pathIncludes: ['/objednavka', '/cs/objednavka'],
      matchSelector: '.order, .checkout, .mro-order-step, .flex-registration-step-2',
      html: 'Order/objednavka.html',
      css: 'Order/objednavka.css',
      js: 'Order/objednavka.js',
      targetSelector: '.flex-content, .mro-order-step, body, .flex-registration-step-2',
      position: 'beforeend'
    },
    {
      name: 'summary',
      pathIncludes: ['/rekapitulace-objednavky'],
      matchSelector: '.order-summary, .mro-order-step, .summary, .flex-order-controls',
      html: 'Order/summary.html',
      css: 'Order/summary.css',
      js: 'Order/summary.js',
      targetSelector: '.flex-content, .mro-order-step, body, .flex-order-controls',
      position: 'beforeend'
    },
    {
      name: 'actions',
      pathIncludes: ['/akce/'],
      html: 'Actions/actions.html',
      css: 'Actions/actions.css',
      js: 'Actions/actions.js',
      targetSelector: '.flex-content',
      position: 'beforeend'
    }

  ];

  resources.forEach((r) => {
    const hasPathCondition = r.pathIncludes && r.pathIncludes.length > 0;
    const pathMatch = hasPathCondition && (r.isExactPath ? isExactPath(path, r.pathIncludes) : includesPath(path, r.pathIncludes));
    
    // Handle matchSelector as array or string
    let selectorMatch = false;
    if (r.matchSelector) {
      if (Array.isArray(r.matchSelector)) {
        // For arrays: use .every() if ALL selectors must exist, .some() if ANY is enough
        selectorMatch = r.matchSelector.every(sel => document.querySelector(sel));
      } else {
        selectorMatch = !!document.querySelector(r.matchSelector);
      }
    }

    // Use AND logic if both path and selector defined, OR if only one is defined
    const shouldInject = (hasPathCondition && r.matchSelector) 
      ? (pathMatch && selectorMatch)  // Both must match
      : (pathMatch || selectorMatch);  // At least one must match

    if (shouldInject) {
      if (r.css) injectCss(r.css);
      if (r.html) {
        injectHtml(r.html, r.targetSelector, r.position || 'afterend', 7000);
      }
      if (r.js) {
        injectJs(r.js);
      }
    }
  });

})();


