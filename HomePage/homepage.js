
// <!-- HomePage VIN search injector -->
(() => {
  const CANON = 'https://www.mroauto.cz/cs';
  const here  = location.href.replace(/\/+$/, '');
  if (here !== CANON) return;

  const REQUIRE_LOGIN = true;
  const REQUIRE_B2B   = true;
  const REQUIRE_FULL  = true;
  const CELLS         = 17;
  const COMPACT_BP = 540; // px – od tej szerokości w dół przechodzimy w tryb compact
  const REDIRECT = vin => 'https://www.mroauto.cz/cs/katalog/yq-katalog/vin/' + encodeURIComponent(vin);
  const LOGIN_URL = 'https://www.mroauto.cz/cs/prihlaseni'; // FIX: twardy adres

  const waitFor = (sel, {timeout=8000}={}) => new Promise(res=>{
    const el = document.querySelector(sel); if (el) return res(el);
    const obs = new MutationObserver(()=>{ const e=document.querySelector(sel); if(e){obs.disconnect();res(e);} });
    obs.observe(document, {childList:true, subtree:true});
    setTimeout(()=>{ obs.disconnect(); res(null); }, timeout);
  });

  function applyCompact(host){
  const compact = window.matchMedia(`(max-width:${COMPACT_BP}px)`).matches;
  host.classList.toggle('--compact', compact);
  }

  function isLoggedIn() {
    const userMenu = document.querySelector('#ctl00\\$ctl00\\$BodyContentPlaceHolder\\$UserMenu .customer-name');
    const loginForm = document.getElementById('ctl00$ctl00$BodyContentPlaceHolder$LoginForm');
    if (userMenu) return true;
    if (loginForm && !userMenu) return false;
    return !!userMenu;
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
    } catch(e) {}
    return false;
  }

  function injectCSS(){
    if (document.getElementById('mro-vin-css')) return;
    const style = document.createElement('style');
    style.id = 'mro-vin-css';
    style.textContent = `
  #mlpVehicleSearch{width:100%;margin:8px auto 18px;max-width:1210px;display:block!important}
  #mlpVehicleSearch .vehicleSearch__heading{margin:0 0 8px;font-weight:800;font-size:18px;color:#0b3b82}
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

  /* ===== MOBILE / COMPACT ===== */
  @media (max-width: 768px){
    #mlpVehicleSearch .vehicleSearch__form{grid-template-columns:1fr;row-gap:10px}
    #mlpVehicleSearch .vehicleSearch__btn{width:100%;height:52px}
    #mlpVehicleSearch .vehicleSearch__heading{font-size:16px}
  }
  #mlpVehicleSearch.--compact .vehicleSearch__label{
    gap:0; padding:8px 10px; border-radius:10px;
  }
  #mlpVehicleSearch.--compact .vehicleSearch__char,
  #mlpVehicleSearch.--compact .vehicleSearch__carret,
  #mlpVehicleSearch.--compact .vehicleSearch__charCounter{
    display:none !important;
  }
  #mlpVehicleSearch.--compact .vehicleSearch__input{
    position:static; opacity:1; pointer-events:auto; height:48px;
    border:1px solid #d8dee4; border-radius:8px; padding:0 12px;
    font-size:16px; letter-spacing:.5px; width:100%; outline:none;
    text-transform:uppercase;
  }
  #mlpVehicleSearch.--compact .vehicleSearch__input:focus{
    border-color:#005da3; box-shadow:0 0 0 3px rgba(0,93,163,.15);
  }
  `;
    document.head.appendChild(style);
  }


  function buildHost(){
    const host = document.createElement('div');
    host.id = 'mlpVehicleSearch';
    host.innerHTML = `
  <div class="vehicleSearch">
    <nav class="vehicleSearch__wrapper">
      <form class="vehicleSearch__form --active" novalidate>
              <label class="vehicleSearch__label">
        <h4 class="heading-h3 vehicleSearch__heading">Vyhledejte váš vůz podle VIN</h4>

          ${'<span class="vehicleSearch__char --long" data-length="17"></span>'.repeat(CELLS)}
          <input type="text" autocomplete="off" minlength="17" maxlength="17" value="" class="vehicleSearch__input" aria-label="VIN (17 znaků)">
<button class="vehicleSearch__btn" type="submit" title="Hledat">
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.5"
            fill="none" stroke="currentColor" stroke-width="2"
            vector-effect="non-scaling-stroke"/>
    <path d="M16.5 16.5 L21 21"
          fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  </svg>
</button>
                        <div class="vehicleSearch__charCounter --active">0/${CELLS}</div>
        </label>
      </form>

    </nav>
  </div>`;
    return host;
  }

  function wire(host, allowed){
    const form    = host.querySelector('form');
    const input   = host.querySelector('.vehicleSearch__input');
    const cells   = Array.from(host.querySelectorAll('.vehicleSearch__char'));
    const btn     = host.querySelector('.vehicleSearch__btn');
    const counter = host.querySelector('.vehicleSearch__charCounter');

    function sanitize(v){
      v = (v||'').toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/[IOQ]/g,'');
      return v.slice(0, CELLS);
    }
    function render(v){
      const chars = v.split('');
      cells.forEach((cell,i)=>{
        cell.textContent = '';
        cell.classList.toggle('--filled', i < chars.length);
        if (i < chars.length) cell.textContent = chars[i];
      });
      cells.forEach(c=>c.querySelector('.vehicleSearch__carret')?.remove());
      const caretIdx = Math.min(chars.length, CELLS-1);
      const caret = document.createElement('span');
      caret.className = 'vehicleSearch__carret';
      cells[caretIdx].appendChild(caret);

      counter.textContent = `${chars.length}/${CELLS}`;
      btn.disabled = allowed
        ? (REQUIRE_FULL ? (chars.length !== CELLS) : (chars.length < 5))
        : true;
    }

    host.addEventListener('click', (e)=>{ if (e.target.closest('.vehicleSearch__label')) input.focus(); });
    input.addEventListener('input', ()=>{ input.value = sanitize(input.value); render(input.value); });
    input.addEventListener('paste', (e)=>{ e.preventDefault(); const t=(e.clipboardData||window.clipboardData).getData('text'); input.value=sanitize(t); render(input.value); });
    input.addEventListener('focus', ()=> render(sanitize(input.value)));

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      if (!allowed) return;
      const vin = sanitize(input.value);
      if (REQUIRE_FULL && vin.length !== CELLS) return input.focus();
      if (!REQUIRE_FULL && vin.length < 5)     return input.focus();
      location.href = REDIRECT(vin);
    });

    // Click fix
    btn.style.position = 'relative';
    btn.style.zIndex   = '3';
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      if (btn.disabled) return;
      if (form.requestSubmit) form.requestSubmit();
      else form.dispatchEvent(new Event('submit', {cancelable:true, bubbles:true}));
    });

    // LOCKED overlay
    if (!allowed){
      host.classList.add('--locked');
      const overlay = document.createElement('div');
      overlay.className = 'vehicleSearch__overlay';
      overlay.innerHTML = `
        <div class="vehicleSearch__overlayContent">
          <span class="lock" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 1a5 5 0 0 0-5 5v3H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2V6a5 5 0 0 0-5-5Zm-3 8V6a3 3 0 0 1 6 0v3H9Z"/></svg>
          </span>
          <span>Vyhledávání podle VIN je dostupné <b>po přihlášení (B2B)</b>.</span>
          <a class="loginLink" href="${LOGIN_URL}">Přihlásit</a>  <!-- FIX: prawdziwy href -->
        </div>`;
      form.parentElement.style.position = 'relative';
      form.parentElement.appendChild(overlay);

      // klik w ramkę / link – bez preventDefault, leci pod HREF
      overlay.querySelector('.vehicleSearch__overlayContent').addEventListener('click', ()=>{
        location.href = LOGIN_URL;                                     // FIX
      });
    }

    render('');
  }

  function placeHost(host){
    const menu = document.querySelector('.flex-menu.flex-menu-items-5, .flex-menu-items-5, .flex-main-menu .flex-menu');
    const side = document.querySelector('.side-container.left, .side-container.left-column, .side-container.leftcol');
    let parent=null, before=null;
    if (menu && side && menu.parentElement === side.parentElement){ parent=menu.parentElement; before=side; }
    else if (menu){ parent=menu.parentElement||document.body; before=menu.nextSibling; }
    else if (side){ parent=side.parentElement||document.body; before=side; }
    if (!parent){ document.body.prepend(host); }
    else { parent.insertBefore(host, before || null); }
  }

  async function runInject(){
    injectCSS();

    const allowed =
      (!REQUIRE_LOGIN || isLoggedIn()) &&
      (!REQUIRE_B2B   || isB2B());

    await Promise.race([waitFor('.flex-menu.flex-menu-items-5, .flex-menu-items-5, .flex-main-menu .flex-menu', {timeout:3000}), new Promise(r=>setTimeout(r, 3000))]);
    await Promise.race([waitFor('.side-container.left, .side-container.left-column, .side-container.leftcol', {timeout:3000}), new Promise(r=>setTimeout(r, 3000))]);

    if (document.getElementById('mlpVehicleSearch')) return;
    const host = buildHost();
    applyCompact(host);
    window.addEventListener('resize', () => applyCompact(host), {passive:true});
    placeHost(host);
    wire(host, allowed);
  }

  runInject();
})();