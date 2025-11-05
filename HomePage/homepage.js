(function(){
  // Test homepage script - pokaże alert i doda baner tylko na stronie głównej
  const targetSelector = '.flex-selected-categories-container';

  function initHome() {
    // 1. Pokaż alert że skrypt działa

    console.info('MROAUTO: homepage.js wystartował');



  }

  // Próbuj zainicjować z kilkoma powtórkami gdyby DOM nie był gotowy
  let attempts = 0;
  const tryInit = () => {
    attempts++;
    if (document.querySelector(targetSelector)) return initHome();
    if (attempts > 10) {
      console.warn('MROAUTO: nie udało się zainicjować homepage.js po 10 próbach');
      return;
    }
    setTimeout(tryInit, 300);
  };

  // Start!
  console.info('MROAUTO: próba inicjalizacji homepage.js...');
  tryInit();
})();
