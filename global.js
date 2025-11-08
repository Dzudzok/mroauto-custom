/* MROAUTO – VIN Search (robust boot: ASP.NET UpdatePanel, BFCache, SSR/CSR) */
(() => {
  'use strict';

  /* ===== KONFIG ===== */
  const REQUIRE_LOGIN = true;
  const REQUIRE_B2B   = true;
  const REQUIRE_FULL  = true;
  const CELLS         = 17;
  const COMPACT_BP    = 540; // mobile => zwykły input
  const LOGIN_URL     = 'https://www.mroauto.cz/cs/prihlaseni';
  const REDIRECT      = vin => 'https://www.mroauto.cz/cs/katalog/yq-katalog/vin/' + encodeURIComponent(vin);

  /* Uruchamiaj TYLKO na głównym językowym rootcie (/cs lub /cs/) */
  function isHomeCS(url = location) {
    try {
      const path = (url.pathname || '').toLowerCase();
      // dopuszczamy: /cs, /cs/, pusty (czasem Nextis przekierowuje), bezpiecznie nie blokuj dla podstron z główną sekcją
      return path === '/cs' || path === '/cs/' || path === '/';
    } catch { return true; }
  }

  /* ===== HELPERS ===== */
  const waitFor = (sel, { timeout = 8000 } = {}) => new Promise(res => {
    const el = document.querySelector(sel);
    if (el) return res(el);
    const obs = new MutationObserver(() => {
      const e = document.querySelector(sel);
      if (e) { obs.disconnect(); res(e); }
    });
    obs.observe(document, { childList: true, subtree: true });
    setTimeout(() => { obs.disconnect(); res(null); }, timeout);
  });

  function isLoggedIn() {
    try {
      const userMenu  = document.querySelector('#ctl00\\$ctl00\\$BodyContentPlaceHolder\\$UserMenu .customer-name');
      const loginForm = document.getElementById('ctl00$ctl00$BodyContentPlaceHolder$LoginForm');
      if (userMenu) return true;
      if (loginForm && !userMenu) return false;
      return !!userMenu;
    } catch { return false; }
  }

  function isB2B() {
    try {
      if (window.__MRO_IS_B2B === true) return true;

      const userRoot = document.getElementById('ctl00$ctl00$BodyContentPlaceHolder$UserMenu');
      if (userRoot) {
        if (userRoot.querySelector('.customer .id, .customer .name')) return true;
        const nameTxt = (userRoot.querySelector('.customer-name')?.textContent || '').trim();
        const legalRe = /(s\.r\.o\.|a\.s\.|sp\. z o\.o\.|s\.c\.|gmbh|ag|sarl|s\.à r\.l\.|kft|srl|oy|bv|nv|oü|s\.a\.|sa)\b/i;
        if (legalRe.test(nameTxt)) return true;
        if (nameTxt && nameTxt === nameTxt.toUpperCase() && nameTxt.length >= 6) return true;
      }
      const txt = (document.getElementById('ctl00$ctl00$BodyContentPlaceHolder$UserMenu')?.textContent || '').trim();
      if (/\bIČ\b|\bIČO\b|\bDIČ\b/i.test(txt)) return true;
      if (/\bcustomerType=B2B\b/i.test(document.cookie)) return true;
      if (document.querySelector('[data-customer-type="b2b"], .user-is-b2b')) return true;
      if (window.nextisUser && (window.nextisUser.isB2B || /B2B/i.test(window.nextisUser.customerType||''))) return true;
    } catch {}
    return false;
  }

  /* ===== STYLES ===== */
  function injectCSS() {
    if (document.getElementById('mro-vin-css')) return;
    const style = document.createElement('style');
    style.id = 'mro-vin-css';
    style.textContent = `
#mlpVehicleSearch{width:100%;margin:8px auto 18px;max-width:1210px;display:block!important}
#mlpVehicleSearch .vehicleSearch__heading{margin:10px 10px 0px;font-weight:800;font-size:18px;color:#0b3b82}
#mlpVehicleSearch .vehicleSearch__form{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;position:relative}
#mlpVehicleSearch .vehicleSearch__label{position:relative;display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px;border:1px solid #d8dee4;border-radius:12px;background:#fff;box-shadow:0 4px 6px rgba(0,0,0,.1),0 1px 3px rgba(0,0,0,.05)}
#mlpVehicleSearch .vehicleSearch__char{display:inline-grid;place-items:center;width:36px;height:44px;border-radius:10px;border:1px dashed #e5e7eb;color:#111;font-weight:700}
#mlpVehicleSearch .vehicleSearch__char.--filled{border-style:solid;border-color:#4CAF50}
#mlpVehicleSearch .vehicleSearch__carret{width:2px;height:22px;background:#005da3;animation:mroBlink 1s infinite;display:inline-block}
@keyframes mroBlink{0%,49%{opacity:1}50%,100%{opacity:.1}}
#mlpVehicleSearch .vehicleSearch__input{position:absolute;inset:0;opacity:0;pointer-events:auto;width:100%;height:100%;text-transform:uppercase}
#mlpVehicleSearch .vehicleSearch__btn{height:48px;min-width:54px;border-radius:12px;border:1px solid #1e40af;background:linear-gradient(180deg,#2563eb,#1e40af);color:#fff;font-weight:800;padding:0 14px;cursor:pointer;display:inline-grid;place-items:center;position:relative;z-index:3}
#mlpVehicleSearch .vehicleSearch__btn:disabled{opacity:.5;cursor:not-allowed}
#mlpVehicleSearch .vehicleSearch__charCounter{font-size:13px;color:#6b7280}

/* LOCKED overlay */
#mlpVehicleSearch.--locked .vehicleSearch__form{filter:blur(1.2px)}
#mlpVehicleSearch .vehicleSearch__overlay{position:absolute;inset:0;display:flex;justify-content:center;align-items:center;pointer-events:auto;z-index:10}
#mlpVehicleSearch .vehicleSearch__overlayContent{
  display:inline-flex;align-items:center;gap:10px;background:rgb(15 23 42 / 37%);
  color:#fff;padding:10px 14px;border-radius:10px;box-shadow:0 10px 24px rgba(0,0,0,.18);cursor:pointer
}
#mlpVehicleSearch .vehicleSearch__overlayContent a{color:#93c5fd;text-decoration:underline}

/* MOBILE: zwykły input */
@media (max-width:${COMPACT_BP}px){
  #mlpVehicleSearch .vehicleSearch__form{grid-template-columns:1fr;row-gap:10px}
  #mlpVehicleSearch .vehicleSearch__btn{width:100%;height:52px}
  #mlpVehicleSearch .vehicleSearch__heading{font-size:16px}
  #mlpVehicleSearch .vehicleSearch__char,
  #mlpVehicleSearch .vehicleSearch__carret,
  #mlpVehicleSearch .vehicleSearch__charCounter{display:none!important}
  #mlpVehicleSearch .vehicleSearch__input{
    position:static;opacity:1;height:48px;border:1px solid #d8dee4;border-radius:8px;
    padding:0 12px;font-size:16px;letter-spacing:.5px;outline:none;width:100%;text-transform:uppercase
  }
  #mlpVehicleSearch .vehicleSearch__input:focus{border-color:#005da3;box-shadow:0 0 0 3px rgba(0,93,163,.15)}
}
`;
    document.head.appendChild(style);
  }

  /* ===== DOM BUDOWA ===== */
  function buildHost() {
    const host = document.createElement('div');
    host.id = 'mlpVehicleSearch';
    host.innerHTML = `
      <div class="vehicleSearch">
        <nav class="vehicleSearch__wrapper">
          <h4 class="vehicleSearch__heading">Vyhledejte váš vůz podle VIN</h4>
          <form class="vehicleSearch__form --active" novalidate>
            <label class="vehicleSearch__label">
              ${'<span class="vehicleSearch__char"></span>'.repeat(CELLS)}
              <input type="text" inputmode="latin" autocomplete="off" minlength="${CELLS}" maxlength="${CELLS}"
                     value="" class="vehicleSearch__input" aria-label="VIN (17 znaků)">
              <div class="vehicleSearch__charCounter --active">0/${CELLS}</div>
            </label>
            <button class="vehicleSearch__btn" type="submit" title="Hledat" disabled>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"></circle>
                <path d="M16.5 16.5 L21 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke"></path>
              </svg>
            </button>
          </form>
        </nav>
      </div>`;
    return host;
  }

  /* ===== LOGIKA VIN ===== */
  function wire(host, allowed) {
    const form    = host.querySelector('form');
    const input   = host.querySelector('.vehicleSearch__input');
    const cells   = Array.from(host.querySelectorAll('.vehicleSearch__char'));
    const btn     = host.querySelector('.vehicleSearch__btn');
    const counter = host.querySelector('.vehicleSearch__charCounter');

    function sanitize(v) {
      v = (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/[IOQ]/g, '');
      return v.slice(0, CELLS);
    }

    function render(v) {
      const chars = v.split('');
      // desktop: kratki
      if (window.innerWidth > COMPACT_BP) {
        cells.forEach((cell, i) => {
          cell.textContent = '';
          cell.classList.toggle('--filled', i < chars.length);
          if (i < chars.length) cell.textContent = chars[i];
        });
        cells.forEach(c => c.querySelector('.vehicleSearch__carret')?.remove());
        const caretIdx = Math.min(chars.length, CELLS - 1);
        const caret = document.createElement('span');
        caret.className = 'vehicleSearch__carret';
        cells[caretIdx].appendChild(caret);
        if (counter) counter.textContent = `${chars.length}/${CELLS}`;
      }
      btn.disabled = allowed
        ? (REQUIRE_FULL ? (chars.length !== CELLS) : (chars.length < 5))
        : true;
    }

    host.addEventListener('click', (e) => {
      if (e.target.closest('.vehicleSearch__label')) input.focus();
    });

    input.addEventListener('input', () => {
      input.value = sanitize(input.value);
      render(input.value);
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const t = (e.clipboardData || window.clipboardData)?.getData('text') || '';
      input.value = sanitize(t);
      render(input.value);
    });

    input.addEventListener('focus', () => render(sanitize(input.value)));
    window.addEventListener('resize', () => render(sanitize(input.value)), { passive: true });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!allowed) return;
      const vin = sanitize(input.value);
      if (REQUIRE_FULL && vin.length !== CELLS) return input.focus();
      if (!REQUIRE_FULL && vin.length < 5)     return input.focus();
      location.href = REDIRECT(vin);
    });

    // LOCKED overlay
    if (!allowed) {
      host.classList.add('--locked');
      const overlay = document.createElement('div');
      overlay.className = 'vehicleSearch__overlay';
      overlay.innerHTML = `
        <div class="vehicleSearch__overlayContent" title="Přihlásit">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="currentColor" d="M12 1a5 5 0 0 0-5 5v3H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2V6a5 5 0 0 0-5-5Zm-3 8V6a3 3 0 0 1 6 0v3H9Z"></path>
          </svg>
          <span>Vyhledávání podle VIN je dostupné <b>po přihlášení (B2B)</b>.</span>
          <a class="loginLink" href="${LOGIN_URL}">Přihlásit</a>
        </div>`;
      form.parentElement.style.position = 'relative';
      form.parentElement.appendChild(overlay);
      overlay.querySelector('.vehicleSearch__overlayContent')
             .addEventListener('click', () => { location.href = LOGIN_URL; });
    }

    // z-index dla przycisku
    btn.style.position = 'relative';
    btn.style.zIndex   = '3';

    render('');
  }

  /* ===== UMIESZCZENIE W LAYOUT ===== */
  function placeHost(host) {
    const menu = document.querySelector('.flex-main-menu .flex-menu, .flex-menu.flex-menu-items-5, .flex-menu-items-5');
    const side = document.querySelector('.side-container.left, .side-container.left-column, .side-container.leftcol');
    let parent = null, before = null;
    if (menu && side && menu.parentElement === side.parentElement) {
      parent = menu.parentElement; before = side;
    } else if (menu) {
      parent = menu.parentElement || document.body; before = menu.nextSibling;
    } else if (side) {
      parent = side.parentElement || document.body; before = side;
    }
    if (!parent) document.body.prepend(host);
    else parent.insertBefore(host, before || null);
  }

  /* ===== BOOT / RE-BOOT ===== */
  let booting = false;
  async function mountVIN() {
    if (booting) return;
    booting = true;

    try {
      if (!isHomeCS()) { booting = false; return; }
      injectCSS();

      // czekamy na podstawowy layout, ale nie blokujemy zbyt długo
      await Promise.race([
        waitFor('.flex-main-menu .flex-menu, .flex-menu.flex-menu-items-5, .flex-menu-items-5', { timeout: 3000 }),
        new Promise(r => setTimeout(r, 3000))
      ]);

      await Promise.race([
        waitFor('.side-container.left, .side-container.left-column, .side-container.leftcol', { timeout: 3000 }),
        new Promise(r => setTimeout(r, 3000))
      ]);

      if (document.getElementById('mlpVehicleSearch')) { booting = false; return; }

      const allowed = (!REQUIRE_LOGIN || isLoggedIn()) && (!REQUIRE_B2B || isB2B());
      const host = buildHost();
      placeHost(host);
      wire(host, allowed);

      // watchdog: jeżeli Nextis podmieni layout i usunie hosta → próbujemy zamontować znowu
      const mo = new MutationObserver(() => {
        if (!document.getElementById('mlpVehicleSearch') && isHomeCS()) {
          // minimalny debounce, żeby nie odpalać w pętli
          mo.disconnect();
          booting = false;
          setTimeout(mountVIN, 50);
        }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });

    } finally {
      booting = false;
    }
  }

  function setupAspNetHooks() {
    try {
      if (setupAspNetHooks._done) return;
      if (window.Sys && Sys.WebForms && Sys.WebForms.PageRequestManager) {
        const prm = Sys.WebForms.PageRequestManager.getInstance();
        prm.add_endRequest(() => { mountVIN(); });
        // opcjonalnie: przed requestem można wyczyścić stan, ale nie trzeba
        setupAspNetHooks._done = true;
      }
    } catch {}
  }

  // Zdarzenia startujące:
  const start = () => { setupAspNetHooks(); mountVIN(); };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
  window.addEventListener('load', start);
  window.addEventListener('pageshow', (e) => { if (e.persisted) start(); }); // BFCache „wstecz”
})();
