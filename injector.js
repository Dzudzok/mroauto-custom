/* injector.js – CSS + wstrzykiwanie HTML na homepage */
(() => {
  const base = 'https://dzudzok.github.io/mroauto-custom/';
  const path = location.pathname.toLowerCase();

  // Tylko na stronie głównej ( /  lub /cs  lub /cs/ )
  const isHome = ['', '/cs', '/cs/'].includes(path) || path === '/';

  if (isHome) {
    // Wstrzyknij CSS (jak w teście 1)
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = base + 'homepage.css';
    document.head.appendChild(link);

    // Wstrzyknij HTML między divami (po DOM ready)
    document.addEventListener('DOMContentLoaded', async () => {
      const categoriesDiv = document.querySelector('.flex-selected-categories-container');
      if (categoriesDiv) {
        try {
          const res = await fetch(base + 'homepage.html');
          const html = await res.text();
          categoriesDiv.insertAdjacentHTML('afterend', html);  // Wstaw PO categories, PRZED content
        } catch (e) { console.error('Błąd HTML:', e); }
      }
    });
  }
})();
