(function(){
  // Test homepage script - pokaże alert i doda baner tylko na stronie głównej
  const targetSelector = '.flex-selected-categories-container';

  function initHome() {
    // 1. Pokaż alert że skrypt działa
    alert('🏠 homepage.js działa!');
    console.info('MROAUTO: homepage.js wystartował');

    // 2. Znajdź container
    const target = document.querySelector(targetSelector);
    if (!target) {
      console.warn('MROAUTO: nie znaleziono containera strony głównej!');
      return;
    }

    // 3. Dodaj wyraźny baner testowy
    const testBanner = document.createElement('div');
    testBanner.innerHTML = `
      <div style="
        background: linear-gradient(45deg, #2196F3, #00BCD4);
        color: white;
        padding: 15px;
        margin: 10px 0;
        border-radius: 8px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        font-size: 16px;
        text-align: center;
      ">
        <strong>✨ homepage.js aktywny!</strong>
        <br>
        <span style="font-size:14px">Ten baner pojawia się tylko na stronie głównej</span>
      </div>
    `;
    
    // Wstaw na górze containera
    target.insertAdjacentElement('afterbegin', testBanner);
    console.info('MROAUTO: dodano testowy baner');
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
