/* Kafelki kategorii TecDoc — migrowane z Body_w_nextis 2026-05-15 (faza B5).
   Renderowane na stronach TecDoc po wyborze auta (listing kategorii).
   URL musi pasowac: /tecdoc/<vehType>/<mfr>/<model>/<engine>/<mfrId>/<modelId>/<engineId>
   Kafelek linkuje do: ${prefix}${slug}/${vehicleIDpath}/${id}/
   CSS w CategoryTiles/category-tiles.css.

   2026-05-16: Nextis renderuje te kafelki SAM server-side (klasy
   .product-shortcut-grid / .product-shortcut-tile). Nasz JS dziala jako
   FALLBACK — czeka 1.5s i jezeli Nextis nie wyrenderowal, my budujemy. */
(function () {
    'use strict';

    if (window.__MRO_CATEGORY_TILES_INIT) return;
    window.__MRO_CATEGORY_TILES_INIT = true;

    const cleanURL = location.origin + location.pathname;
    // Listing URL ma 7 segmentow po /tecdoc/. Detail page ma 9. My obslugujemy
    // tylko listing (gdzie Nextis renderuje grid). Trailing slash opcjonalny.
    const fullMatch = cleanURL.match(/(.*\/tecdoc\/[^\/]+\/[^\/]+\/[^\/]+\/[^\/]+\/)([^\/]+\/[^\/]+\/[^\/]+)\/?$/);
    if (!fullMatch) return;

    const prefix = fullMatch[1];
    const vehicleIDpath = fullMatch[2];

    const tiles = [
        { label: "Brzdové destičky",  icon: "/Image.ashx?type=4&id=395014", slug: "brzdove-oblozeni",         id: "100030" },
        { label: "Brzdový kotouč",    icon: "/Image.ashx?type=4&id=395015", slug: "brzdovy-kotouc",           id: "100032" },
        { label: "Motorový olej",     icon: "/Image.ashx?type=4&id=395017", slug: "olej",                     id: "101994" },
        { label: "Olejový filtr",     icon: "/Image.ashx?type=4&id=395016", slug: "olejovy-filtr",            id: "100259" },
        { label: "Palivový filtr",    icon: "/Image.ashx?type=4&id=395025", slug: "palivovy-filtr",           id: "100261" },
        { label: "Vzduchový filtr",   icon: "/Image.ashx?type=4&id=395018", slug: "vzduchovy-filtr",          id: "100260" },
        { label: "Kabinový filtr",    icon: "/Image.ashx?type=4&id=395027", slug: "kabinovy-vzduchovy-filtr", id: "100263" },
        { label: "Baterie",           icon: "/Image.ashx?type=4&id=395026", slug: "baterie",                  id: "100042" },
        { label: "Ramena",            icon: "/Image.ashx?type=4&id=395028", slug: "pricne-rameno",            id: "100571" },
        { label: "Stěrače",           icon: "/Image.ashx?type=4&id=395021", slug: "stiraci-gumicka",          id: "100133" },
        { label: "Čepy řízení",       icon: "/Image.ashx?type=4&id=395061", slug: "klouby",                   id: "100198" },
        { label: "Rozvody motoru",    icon: "/Image.ashx?type=4&id=395062", slug: "sada-rozvodoveho-remene",  id: "100453" },
        { label: "Spojková sada",     icon: "/Image.ashx?type=4&id=395063", slug: "sada-spojky",              id: "100051" },
        { label: "Ložisko kola",      icon: "/Image.ashx?type=4&id=395064", slug: "lozisko-kola",             id: "100579" },
        { label: "Tlumiče pérování",  icon: "/Image.ashx?type=4&id=395065", slug: "tlumic-perovani",          id: "100121" }
    ];

    function waitFor(selector, timeout = 5000) {
        return new Promise((resolve) => {
            const el = document.querySelector(selector);
            if (el) return resolve(el);
            const obs = new MutationObserver(() => {
                const node = document.querySelector(selector);
                if (node) { obs.disconnect(); resolve(node); }
            });
            obs.observe(document.documentElement, { childList: true, subtree: true });
            setTimeout(() => { obs.disconnect(); resolve(null); }, timeout);
        });
    }

    function buildTiles() {
        const container = document.createElement('div');
        container.className = 'product-shortcut-grid';
        for (const { label, icon, slug, id } of tiles) {
            const tile = document.createElement('a');
            tile.className = 'product-shortcut-tile';
            tile.href = `${prefix}${slug}/${vehicleIDpath}/${id}/`;
            tile.innerHTML = `
                <div class="tile-icon" style="background-image: url('${icon}');"></div>
                <div class="tile-label">${label}</div>
            `;
            container.appendChild(tile);
        }
        return container;
    }

    async function mount() {
        // Czekamy 1.5s na Nextis server-side render. Jezeli Nextis OK,
        // bailujemy out — nasze kafelki by stworzyly duplikat.
        const FALLBACK_DELAY = 1500;
        const start = Date.now();
        while (Date.now() - start < FALLBACK_DELAY) {
            if (document.querySelector('.product-shortcut-grid')) return;
            await new Promise(r => setTimeout(r, 100));
        }

        // Double-check race: w trakcie czekania mogl pojawic sie grid.
        if (document.querySelector('.product-shortcut-grid')) return;

        // Nextis sie nie wyrenderowal — fallback. Wstawiamy przed .shortcuts
        // (siatka 18 kategorii TecDoc) wewnatrz .shortcuts-container.
        const container = buildTiles();
        const shortcutsContainer = document.querySelector('.shortcuts-container');
        const shortcutsSection = shortcutsContainer && shortcutsContainer.querySelector('.shortcuts');

        if (shortcutsContainer && shortcutsSection) {
            shortcutsContainer.insertBefore(container, shortcutsSection);
        } else if (shortcutsContainer) {
            shortcutsContainer.insertBefore(container, shortcutsContainer.firstChild);
        } else {
            // Najgorszy fallback — wstaw na poczatek .flex-content
            const fc = document.querySelector('.flex-content');
            if (fc) fc.insertBefore(container, fc.firstChild);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount, { once: true });
    } else {
        mount();
    }
})();
