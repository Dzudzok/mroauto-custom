/* injector.js – finalna wersja testowa */
(() => {
  const base = 'https://dzudzok.github.io/mroauto-custom/';
  const path = location.pathname.toLowerCase();

  // === Funkcja czekająca na element ===
  const waitFor = (selector, timeout = 5000) => {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  };

  // === HOMEPAGE: CSS + HTML ===
  const isHome = ['', '/cs', '/cs/'].includes(path) || path === '/';

  if (isHome) {
    // 1. CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = base + 'homepage.css';
    document.head.appendChild(link);

    // 2. HTML – czekamy na categories div
    (async () => {
      const categoriesDiv = await waitFor('.flex-selected-categories-container');
      if (!categoriesDiv) {
        console.warn('MROAUTO: Nie znaleziono .flex-selected-categories-container');
        return;
      }

      try {
        const res = await fetch(base + 'homepage.html');
        const html = await res.text();
        categoriesDiv.insertAdjacentHTML('afterend', html);
        console.log('MROAUTO: Nowy blok HTML dodany!');
      } catch (e) {
        console.error('Błąd ładowania homepage.html:', e);
      }
    })();
  }

  // === PRODUKT: tylko CSS ===
  const isProduct = path.includes('hledani') || path.includes('produkt') || !!document.querySelector('.flex-product-detail');

  if (isProduct) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = base + 'Product/product.css';
    document.head.appendChild(link);
  }
})();
