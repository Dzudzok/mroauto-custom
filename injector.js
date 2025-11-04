/*  injector.js – wczytuje CSS tylko na homepage  */
(() => {
  const base = 'https://dzudzok.github.io/mroauto-custom/';
  const path = location.pathname.toLowerCase();

  // tylko na stronie głównej ( /  lub /cs/  lub /cs )
  const isHome = ['', '/cs', '/cs/'].includes(path) || path === '/';

  if (isHome) {
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = base + 'homepage.css';
    document.head.appendChild(link);
  }
})();
