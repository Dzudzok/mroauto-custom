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



// <!-- Global Helper Functions -->
window.MRO_HELPERS = window.MRO_HELPERS || {};

// Universal function to wait for DOM elements
window.MRO_HELPERS.waitForElement = function(selector, timeout = 5000) {
    return new Promise((resolve) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);

        const observer = new MutationObserver(() => {
            const node = document.querySelector(selector);
            if (node) {
                observer.disconnect();
                resolve(node);
            }
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
    });
};

// Check if DOM is ready
window.MRO_HELPERS.onReady = function(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
};

console.log('MROAUTO: Global helpers loaded');

// <!-- Global manufacturer logos updater -->
(function($) {
    const logoIds = {
        "a.b.s.": "370258",
        "abs": "370258",
        "brembo": "370290",
        "sunrich": "370432",
        "a.i.c.": "370259",
        "ate": "370467",
        "abe": "370260",
        "kolbenschmidt": "370665",
        "ackoja": "370261",
        "millers": "370671",
        "dupli color": "370668",
        "kavo parts": "370655",
        "knecht": "370656",
        "bgpoint": "370675",
        "gh": "370682",
        "gm opel": "370672",
        "mahle original": "370652",
        "pmo": "370662",
        "mroauto": "369355",
        "ruville": "370667",
        "4f": "370677",
        "fai autoparts": "370666",
        "loro": "370664",
        "denso": "370663",
        "pmo oil": "370662",
        "centra": "370658",
        "adbl": "370262",
        "profipower": "370657",
        "airtex": "370263",
        "hengst filter": "370654",
        "liqui moly": "370653",
        "aisin": "370264",
        "shell": "370669",
        "mobil": "370670",
        "ajusa": "370265",
        "mannfilter": "370650",
        "alca": "370266",
        "alco filters": "370267",
        "alkar": "370268",
        "teknorot": "370651",
        "amio": "370269",
        "aral": "370270",
        "vasco": "370649",
        "argo": "370271",
        "aspl": "370272",
        "ashika": "370273",
        "asta": "370274",
        "autofren": "370275",
        "autogh": "370276",
        "autolog": "370277",
        "automega": "370278",
        "barum": "370279",
        "bga": "370280",
        "bilstein": "370281",
        "bizol": "370282",
        "blic": "370283",
        "blue print": "370284",
        "bm catalysts": "370285",
        "bmw": "370286",
        "boll": "370287",
        "bosal": "370288",
        "bosch": "370289",
        "bremi": "370291",
        "brumm": "370292",
        "bts turbo": "370293",
        "bugiad": "370294",
        "caffaro": "370295",
        "corteco": "370647",
        "oe": "370648",
        "castrol": "370296",
        "champion": "370297",
        "clean filters": "370298",
        "cofle": "370299",
        "continental": "370300",
        "contitech": "370300",
        "CONTINENTAL CTAM": "370300",
        "gates": "370659",
        "cs germany": "370301",
        "daco germany": "370302",
        "dayco": "370303",
        "debica": "370304",
        "delphi": "370305",
        "denckermann": "370307",
        "dpa": "370308",
        "drmotor": "370309",
        "Dr.Motor Automotive": "370309",
        "dri": "370310",
        "dys": "370311",
        "electric-life": "370312",
        "elf": "370313",
        "elring": "370314",
        "elstock": "370315",
        "eneos": "370316",
        "energy": "370317",
        "eps": "370318",
        "era": "370319",
        "exedy": "370320",
        "fa1": "370321",
        "fae": "370322",
        "schaeffler fag": "370323",
        "fai": "370324",
        "fanfaro": "370325",
        "febest": "370326",
        "febi": "383439",
        "febi bilstein": "383439",
        "ferodo": "370328",
        "filtron": "370329",
        "fortuna": "370330",
        "freccia": "370331",
        "frenkit": "370332",
        "frogum": "370333",
        "fte": "370334",
        "fuchs": "370335",
        "fulda": "370336",
        "garret": "370337",
        "general ricambi": "370338",
        "goetze": "370339",
        "goodride": "370340",
        "goodyear": "370341",
        "graf": "370342",
        "breyko": "370555",
        "gsp": "370343",
        "hankook": "370344",
        "hella": "370554",
        "hazet": "370345",
        "hccargo": "370346",
        "hearth buss": "370347",
        "hengst filters": "370348",
        "hepu": "370349",
        "hitachi": "370350",
        "hutchinson": "370351",
        "ijs group": "370352",
        "impergom": "370353",
        "japanparts": "370354",
        "jpn": "370354",
        "jp group": "370355",
        "k&n": "370356",
        "k2": "370357",
        "kamoka": "370358",
        "kenwood": "370359",
        "kilen": "370360",
        "kleen-flo": "370361",
        "ks tools": "370362",
        "kyb": "370363",
        "lauber": "370364",
        "lcc": "370365",
        "linex": "370366",
        "liquimoly": "370367",
        "lotos oil": "370368",
        "lucas": "370369",
        "schaeffler luk": "370370",
        "m-tech": "370371",
        "magneti marelli": "370372",
        "magnum technology": "370373",
        "mahle": "370374",
        "mammooth": "370375",
        "mannol": "370468",
        "sct mannol": "370468",
        "sct-mannol": "370468",
        "SCT - MANNOL": "370468",
        "sct  mannol": "370468",
        "castrol filters": "370296",
        "mastersport": "370377",
        "mastersport germany": "370377",
        "master-sport germany": "370377",
        "maxgear": "370378",
        "meat&doria": "370379",
        "metelli": "370381",
        "meyle": "370382",
        "michelin": "370383",
        "moje auto": "370384",
        "momo": "370385",
        "motip": "370386",
        "motoair": "370387",
        "motul": "370388",
        "mts": "370389",
        "muller filter": "370390",
        "narva": "370391",
        "neolux": "370392",
        "ngk": "370393",
        "nissens": "370394",
        "nrf": "370395",
        "opel": "370672",
        "orlen": "370399",
        "osram": "370400",
        "ams-OSRAM": "370400",
        "oximo": "370402",
        "oyodo": "370403",
        "pascal": "370405",
        "payen": "370406",
        "petronas": "370408",
        "philips": "370409",
        "pirelli": "370411",
        "proplast": "370413",
        "purflux": "370414",
        "rapro": "370415",
        "remsa": "370416",
        "rooks": "370417",
        "rymec": "370418",
        "sachs": "370419",
        "sailun": "370420",
        "sata": "370421",
        "selta": "370422",
        "sidem": "370423",
        "skf": "370424",
        "skv germany": "370425",
        "esen skv": "370425",
        "sonax": "370426",
        "specol": "370427",
        "spidan": "370428",
        "stardax": "370429",
        "statim": "370430",
        "stp": "370431",
        "sunny": "370432",
        "tagred": "370433",
        "trw": "370469",
        "tedgum": "370434",
        "tenzi": "370435",
        "textar": "370436",
        "topex": "370437",
        "topran": "370438",
        "total": "370439",
        "toyo tires": "370440",
        "trucktec": "370441",
        "turtle wax": "370442",
        "tyc": "370443",
        "ufi": "370444",
        "vag": "370445",
        "vaico": "370446",
        "valeo": "370447",
        "valvoline": "370448",
        "van wezel": "370450",
        "varta": "370451",
        "vdo": "370452",
        "CONTINENTAL/VDO": "370452",
        "vemo": "370453",
        "victor reinz": "370454",
        "reinz": "370454",
        "vigor": "370455",
        "vika": "370456",
        "vorel": "370457",
        "walker": "370458",
        "yamato": "370460",
        "yato": "370461",
        "ysparts": "370462",
        "yuasa": "370463",
        "zimmermann": "370464",
        "3rg": "370473",
        "abakus": "370474",
        "asmet": "370475",
        "borsehung": "370477",
        "lemforder": "370471",
        "calorstat": "370478",
        "carcommerce": "370479",
        "carmotion": "370480",
        "carpoint": "370481",
        "casco": "370482",
        "chempoil": "370483",
        "dolz": "370484",
        "drive+": "370485",
        "dt spare parts": "370486",
        "dunlop": "370487",
        "exide": "370488",
        "facet": "370489",
        "falken": "370490",
        "fast": "370491",
        "firestone": "370492",
        "gkn": "370493",
        "glyco": "370494",
        "gt-bergman": "370495",
        "herthbuss": "370496",
        "hiflofilter": "370497",
        "imperial": "370498",
        "izawit": "370499",
        "japko": "370501",
        "jmj": "370502",
        "jom": "370503",
        "jurid": "370504",
        "kegel": "370505",
        "kleber": "370506",
        "klokkerholm": "370507",
        "koni": "370508",
        "kraft": "370509",
        "kumho": "370510",
        "lesjofors": "370511",
        "lpr": "370512",
        "meguiars": "370514",
        "metalcaucho": "370515",
        "miragilo": "370516",
        "nankang": "370517",
        "neo tools": "370518",
        "nipparts": "370520",
        "nk": "370521",
        "nokian": "370522",
        "nty": "370523",
        "optimal": "370524",
        "pemco": "370525",
        "pioneer": "370526",
        "pipercross": "370527",
        "polmo": "370528",
        "quaro": "370529",
        "quick brake": "370530",
        "rezaw": "370531",
        "romix": "370532",
        "rowe": "370533",
        "sunrich": "370644",
        "polcar": "370645",
        "samko": "370534",
        "sasic": "370535",
        "snr": "370536",
        "sparco": "370537",
        "steinhof": "370538",
        "swag": "370539",
        "tecmax": "370540",
        "thermotec": "370541",
        "tomex": "370542",
        "triangle": "370543",
        "triscan": "370544",
        "ulo": "370545",
        "uniroyal": "370546",
        "virage": "370547",
        "vredestein": "370548",
        "wahler": "370549",
        "BorgWarner (Wahler)": "370549",
        "wunder-baum": "370550",
        "wynns": "370551",
        "yokohama": "370552",
        "monroe": "370553",
        "schaeffler ina": "370472"
    };
    const mroautoBaseUrl = 'https://www.mroauto.cz/Image.ashx?type=4&id=';
    const defaultLogoUrl = 'https://www.mroauto.cz/Image.ashx?type=4&id=370449';

    function normalizeManufacturer(text) {
        return text.trim().replace(/[()]/g, '').toLowerCase().normalize('NFKD').replace(/[^\w\s]/g, '');
    }

    function updateManufacturer($item) {
        const $manufacturerSpan = $item.find('.flex-manufacturer');
        const manufacturer = normalizeManufacturer($manufacturerSpan.text());
        const logoId = logoIds[manufacturer];
        const logoUrl = logoId ? mroautoBaseUrl + logoId : defaultLogoUrl;
        let $logoSpan = $item.find('.flex-logo');

        $manufacturerSpan.text(manufacturer);
        if (!$logoSpan.length) {
            $item.prepend('<span class="flex-logo"></span>');
            $logoSpan = $item.find('.flex-logo');
        }
        if ($logoSpan.find('img').attr('src') !== logoUrl) {
            $logoSpan.html(`<img src="${logoUrl}" alt="${manufacturer} Logo" loading="lazy">`);
        }
    }

	function updateManufacturers(changedItems) {
		const $items = changedItems || $('.flex-product-by-number:not(.processed)');

		const observer = new IntersectionObserver((entries, obs) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					const $item = $(entry.target);
					updateManufacturer($item);
					$item.addClass('processed');
					obs.unobserve(entry.target); 
				}
			});
		}, { threshold: 0.1 });

		$items.each(function () {
			observer.observe(this);
		});
	}


    function updateHeaderLogos(changedItems) {
        const $items = changedItems || $('.flex-header-container:not(.processed)');
        $items.each(function() {
            const $this = $(this);
            const $manufacturerSpan = $this.find('.manufacturer');
            const manufacturer = normalizeManufacturer($manufacturerSpan.text());
            const logoId = logoIds[manufacturer];
            const logoUrl = logoId ? mroautoBaseUrl + logoId : defaultLogoUrl;
            const $logoImg = $this.find('.manufacturer-logo img');

            if (!$logoImg.length) {
                $manufacturerSpan.before(`<span class="manufacturer-logo"><img src="${logoUrl}" alt="${manufacturer} Logo" loading="lazy"></span>`);
            } else if ($logoImg.attr('src') !== logoUrl) {
                $logoImg.attr({ src: logoUrl, alt: `${manufacturer} Logo` });
            }
            $this.addClass('processed');
        });
    }

    function updateInformationHeaders(changedItems) {
        const $items = changedItems || $('.flex-informations:not(.processed)');
        $items.each(function() {
            const $this = $(this);
            const $h1 = $this.find('h1');
            const $manufacturerSpan = $this.find('.flex-manufacturer .flex-value');

            if (!$manufacturerSpan.length) {
                return;
            }

            const manufacturer = normalizeManufacturer($manufacturerSpan.text());
            const logoId = logoIds[manufacturer] || '370449';
            const logoUrl = mroautoBaseUrl + logoId;

            const $logoSpan = $h1.find('.info-manufacturer-logo');
            if (!$logoSpan.length) {
                $h1.prepend(`<span class="info-manufacturer-logo"><img src="${logoUrl}" alt="${manufacturer} Logo" loading="lazy"></span>`);
            } else if ($logoSpan.find('img').attr('src') !== logoUrl) {
                $logoSpan.html(`<img src="${logoUrl}" alt="${manufacturer} Logo" loading="lazy">`);
            }
            $this.addClass('processed');
        });
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            const delay = $('.flex-product-by-number').length > 100 ? wait * 2 : wait;
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    $(document).ready(function() {
        const $whisperer = $('.flex-smart-search-whisperer');
        const $body = $(document.body);

        updateManufacturers();
        updateHeaderLogos();
        updateInformationHeaders();

        $('#SmartSearchInput').on('input', debounce(updateManufacturers, 300));

        const observer = new MutationObserver(function(mutations) {
            const changedItems = [];
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    $(mutation.addedNodes).each(function() {
                        if ($(this).is('.flex-product-by-number') && !$(this).hasClass('processed')) {
                            changedItems.push(this);
                        }
                    });
                }
            });
            if (changedItems.length) {
                updateManufacturers($(changedItems));
            }
        });

        const headerObserver = new MutationObserver(function(mutations) {
            const changedItems = [];
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    $(mutation.addedNodes).each(function() {
                        if ($(this).is('.flex-header-container') && !$(this).hasClass('processed')) {
                            changedItems.push(this);
                        }
                    });
                }
            });
            if (changedItems.length) {
                updateHeaderLogos($(changedItems));
            }
        });

        const infoObserver = new MutationObserver(function(mutations) {
            const changedItems = [];
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    $(mutation.addedNodes).each(function() {
                        if ($(this).is('.flex-informations') && !$(this).hasClass('processed')) {
                            changedItems.push(this);
                        }
                    });
                }
            });
            if (changedItems.length) {
                updateInformationHeaders($(changedItems));
            }
        });

        if ($whisperer.length) {
            observer.observe($whisperer[0], { childList: true, subtree: true });
        }
        headerObserver.observe($body[0], { childList: true, subtree: true });
        infoObserver.observe($body[0], { childList: true, subtree: true });
    });
})(jQuery);