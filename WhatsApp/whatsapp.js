/* Floating WhatsApp button — migrowane z Body_w_nextis 2026-05-15 (faza B2).
   CSS w WhatsApp/whatsapp.css, wstrzykiwane przez injector.js. */
(function () {
    'use strict';

    if (window.__MRO_WHATSAPP_INIT) return;
    window.__MRO_WHATSAPP_INIT = true;

    function mount() {
        if (!document.body) return;
        if (document.querySelector('.whatsapp-btn')) return;

        const btn = document.createElement('a');
        btn.href = 'https://wa.me/420776401167?text=Napište nám na WhatsApp';
        btn.className = 'whatsapp-btn';
        btn.target = '_blank';
        btn.rel = 'noopener';
        btn.setAttribute('aria-label', 'Napište nám na WhatsApp');
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
                <path fill="white" d="M12 0C5.373 0 0 5.373 0 12c0 2.135.557 4.21 1.61 6.03L0 24l6.06-1.595A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.65 0-3.246-.415-4.65-1.195l-.33-.174-3.59.945.948-3.54-.175-.337A9.956 9.956 0 0 1 2 12c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10zm5.13-6.97c-.28-.14-1.66-.82-1.92-.91-.26-.09-.45-.14-.64.14-.19.28-.74.91-.91 1.1-.17.19-.34.21-.63.07-.28-.14-1.19-.44-2.27-1.4-.84-.74-1.41-1.66-1.58-1.94-.17-.28-.02-.42.12-.56.13-.13.28-.34.42-.52.14-.19.19-.33.28-.56.09-.23.05-.43-.02-.6-.07-.17-.64-1.54-.88-2.11-.23-.56-.46-.47-.64-.47-.17 0-.36-.02-.55-.02-.19 0-.50.07-.77.35-.28.28-1.06 1.03-1.06 2.51 0 1.48 1.08 2.91 1.23 3.11.15.19 2.13 3.25 5.17 4.56.71.31 1.27.5 1.71.64.72.23 1.37.2 1.88.12.57-.09 1.66-.68 1.9-1.33.23-.66.23-1.23.16-1.34-.07-.11-.26-.17-.54-.31z"/>
            </svg>
        `;
        document.body.appendChild(btn);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount, { once: true });
    } else {
        mount();
    }
})();
