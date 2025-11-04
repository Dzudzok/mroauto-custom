/* injector.js – testy 1+2+3 */
(() => {
  const base = 'https://dzudzok.github.io/mroauto-custom/';
  const path = location.pathname.toLowerCase();

  // Homepage (test 1+2)
  const isHome = ['', '/cs', '/cs/'].includes(path) || path === '/';

  if (isHome) {
    // CSS dla homepage
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = base + 'homepage.css';
    document.head.appendChild(link);

    // HTML dla homepage
    document.addEventListener('DOMContentLoaded', async () => {
      const categoriesDiv = document.querySelector('.flex-selected-categories-container');
      if (categoriesDiv) {
        try {
          const res = await fetch(base + 'homepage.html');
          const html = await res.text();
          categoriesDiv.insertAdjacentHTML('afterend', html);
        } catch (e) { console.error('Błąd HTML:', e); }
      }
    });
  }

  // Produkt (test 3) – detect po path LUB selektorze
  const isProduct = path.includes('hledani') || path.includes('produkt') || !!document.querySelector('.flex-product-detail');

  if (isProduct) {
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = base + 'Product/product.css';
    document.head.appendChild(link);
  }
})();
