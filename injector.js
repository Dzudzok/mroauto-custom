(() => {
  // Guard przeciw podwojnemu wykonaniu (ASP.NET UpdatePanel / partial postback moze
  // ponownie wstrzyknac <script src="injector.js">. Bez tego HTML/CSS leci 2x).
  if (window.__MRO_INJECTOR_RAN) {
    console.info('MROAUTO: injector.js juz wykonany, pomijam.');
    return;
  }
  window.__MRO_INJECTOR_RAN = true;

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
      targetSelector: 'head',
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
    // Wpisy ponizej zostawione tylko z `css` — pliki HTML/JS sa puste 0-bajtowe.
    // Folder na dysku zachowany jako miejsce pod przyszly modul. Reszta wpisow
    // (basket, carselect*, search, blog, contact, about, privacy, shipping,
    // downloads, objednavka, summary, actions) usunieta 2026-05-15 (faza A, A1)
    // bo wszystkie pliki byly stub'ami — fetche 0 B/404 marnowaly requesty.
    // Rollback: git checkout pre-faza-A -- injector.js
    {
      name: 'productlist', // tylko na strankach s obrazem autem po stromie tecdoc
      pathIncludes: ['hledani', '/katalog/tecdoc/'],
      matchSelector: ['[id^="ProductItem_"]', '.flex-tecdoc-vehicle-info-box'],
      css: 'ProductList/productlist.css'
    },
    {
      name: 'productlistsearch', // tylko na strankach z lista produktw bez auta
      pathIncludes: ['hledani', '/katalog/tecdoc/'],
      matchSelector: '[id^="ProductItem_"]',
      css: 'ProductListSearch/productlistsearch.css'
    },
    {
      name: 'universal',
      pathIncludes: ['/katalog/univerzalni-dily'],
      matchSelector: '.flex-universal-parts',
      css: 'UniversalParts/universal.css'
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


