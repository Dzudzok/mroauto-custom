/* MROAUTO Garage widget — migrowane z Body_w_nextis 2026-05-15 (faza B6).
   FAB button bottom-right (obok WhatsApp) + modal z lista aut + zapis do Cloud Run API.
   Tylko dla zalogowanych (wymaga .flex-user-menu + .customer .id z ID:<n>).
   CSS w Garage/garage.css. */
(function () {
    'use strict';

    if (window.__mroGarageInit) return;
    window.__mroGarageInit = true;

    const API_BASE = "https://garage-api-21528677511.europe-central2.run.app";

    // ---------- HELPERS ----------
    function getCustomerId() {
        const el = document.querySelector(".customer .id");
        if (el) {
            const m = el.textContent.match(/ID:\s*(\d+)/i);
            if (m) return m[1];
        }
        return null;
    }

    function ensureGarageToken(cid) {
        const key = `mro:garageToken:${cid}`;
        let token = localStorage.getItem(key);
        if (!token) {
            const a = new Uint8Array(16);
            crypto.getRandomValues(a);
            token = Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
            localStorage.setItem(key, token);
        }
        return token;
    }

    function normalizeVehicleUrl(path) {
        try {
            if (!path) return path;
            const seg = path.split("/").filter(Boolean);
            const i = seg.indexOf("osobni");
            if (i < 0) return path;

            const brand = seg[i + 1];
            const model = seg[i + 2];
            const engine = seg[i + 3];

            // pomin kategorie (np. olejovy-filtr) az do pierwszej liczby
            let k = i + 4;
            while (k < seg.length && !/^\d+$/.test(seg[k])) k++;

            // zbierz max 3 liczby (rok, tecdocID, engineID itp.)
            const nums = [];
            while (k < seg.length && /^\d+$/.test(seg[k]) && nums.length < 3) {
                nums.push(seg[k]);
                k++;
            }

            return ["/cs", "katalog", "tecdoc", "osobni", brand, model, engine, ...nums].join("/");
        } catch (e) {
            return path;
        }
    }

    function isVehicleDetailUrl(path) {
        const seg = path.split("/").filter(Boolean);
        const i = seg.indexOf("osobni");
        if (i < 0) return false;
        // musi byc co najmniej: osobni/brand/model/engine/num1/num2/num3
        return seg.length >= i + 7;
    }

    function cleanVehicleLabel(label) {
        if (!label) return "";
        let out = label.replace(/^Náhradní\s+autodíly\s+/i, "").trim();

        const categories = [
            "olejový filtr",
            "vzduchový filtr",
            "palivový filtr",
            "kabinový filtr",
            "brzdový kotouč",
            "brzdové destičky",
            "spoječka",
            "alternátor",
            "chladič",
            "tlumič",
        ];

        for (const cat of categories) {
            const regex = new RegExp(cat + "$", "i");
            out = out.replace(regex, "").trim();
        }

        return out.replace(/\s{2,}/g, " ");
    }

    function getCurrentVehicle() {
        const path = location.pathname;
        const h = document.querySelector("h1");
        const label = h ? h.textContent.trim() : "Vozidlo";
        return { label, urlPath: path, tecdocVehicleId: path.split("/").pop() };
    }

    function showToast(msg) {
        const t = document.createElement("div");
        t.className = "garage-toast";
        t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(() => t.classList.add("show"));
        setTimeout(() => {
            t.classList.remove("show");
            setTimeout(() => t.remove(), 300);
        }, 2500);
    }

    // ---------- API ----------
    async function apiList(cid) {
        const r = await fetch(`${API_BASE}/garage?cid=${cid}`);
        if (!r.ok) throw new Error('apiList failed: ' + r.status);
        return r.json();
    }

    async function apiDelete(cid, token, id) {
        const r = await fetch(`${API_BASE}/garage/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cid, garageToken: token, turnstileToken: "dev" }),
        });
        if (!(r.ok || r.status === 204)) throw new Error('apiDelete failed: ' + r.status);
    }

    async function apiSave(cid, token, vehicle) {
        const r = await fetch(`${API_BASE}/garage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cid, garageToken: token, vehicle, turnstileToken: "dev" }),
        });
        if (!r.ok) throw new Error('apiSave failed: ' + r.status);
    }

    // ---------- INIT ----------
    function init() {
        const isLoggedIn = !!document.querySelector(".flex-user-menu");
        if (!isLoggedIn) {
            console.debug("[Garage] uzivatel neni prihlasen — UI se nevykresli.");
            return;
        }

        const cid = getCustomerId();
        if (!cid) {
            console.debug("[Garage] chybi CustomerID — garage nespustim.");
            return;
        }

        const GARAGE_TOKEN = ensureGarageToken(cid);

        // ---------- UI ----------
        let modal, listEl, statusEl;

        function createUI() {
            // FAB button
            const btn = document.createElement("button");
            btn.className = "garage-btn";
            btn.innerHTML = "🚗 Garáž";
            btn.addEventListener("click", openModal);
            document.body.appendChild(btn);

            // Modal
            modal = document.createElement("div");
            modal.className = "garage-modal";
            modal.innerHTML = `
                <div class="garage-card">
                    <div class="garage-header">
                        <span>Moje garáž</span>
                        <button class="btn-light" id="garage-close">✖</button>
                    </div>
                    <div class="garage-body">
                        <div id="garage-status">Načítání…</div>
                        <div id="garage-list" class="garage-list" style="display:none;"></div>
                    </div>
                    <div class="garage-footer">
                        <button class="btn-light" id="garage-go">➕ Přidat auto</button>
                        <button class="btn-primary" id="garage-save">💾 Uložit aktuální</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);

            modal.querySelector("#garage-close").onclick = closeModal;
            modal.querySelector("#garage-go").onclick = () => {
                localStorage.setItem("pendingGarageAdd", "1");
                location.href = "/cs/katalog/tecdoc/osobni";
            };
            modal.querySelector("#garage-save").onclick = saveCurrentVehicle;

            listEl = modal.querySelector("#garage-list");
            statusEl = modal.querySelector("#garage-status");

            modal.addEventListener("click", (e) => {
                if (e.target === modal) closeModal();
            });

            addInlineGarageButton();
        }

        function addInlineGarageButton() {
            const host = document.querySelector(".flex-add-to-license-plate");
            if (host && !document.getElementById("garage-inline-btn")) {
                const btn = document.createElement("input");
                btn.type = "button";
                btn.id = "garage-inline-btn";
                btn.className = "flex-add-to-license-plate-popup-button";
                btn.value = "➕ Přidat do Garáže";
                btn.style.marginLeft = "8px";
                btn.onclick = () => saveCurrentVehicle();
                host.appendChild(btn);
            }
        }

        function openModal() {
            modal.style.display = "flex";
            loadGarage();
        }

        function closeModal() {
            modal.style.display = "none";
        }

        async function loadGarage() {
            try {
                statusEl.textContent = "Načítání…";
                listEl.style.display = "none";
                const items = await apiList(cid);
                renderList(items);
            } catch (e) {
                statusEl.textContent = "Chyba načítání.";
            }
        }

        function renderList(items) {
            if (!items || !items.length) {
                statusEl.textContent = "Žádná uložená vozidla.";
                statusEl.style.display = "block";
                listEl.style.display = "none";
                return;
            }
            statusEl.style.display = "none";
            listEl.style.display = "grid";
            listEl.innerHTML = "";

            items.forEach((it) => {
                const row = document.createElement("div");
                row.className = "garage-item";

                const left = document.createElement("div");
                left.className = "garage-left";
                const img = document.createElement("img");
                img.className = "garage-thumb";
                img.src = it.thumbUrl || "";
                if (!it.thumbUrl) img.style.display = "none";
                const txt = document.createElement("div");
                txt.innerHTML = `<div class="garage-title">${it.label || "Vozidlo"}</div>
                                 <div class="garage-meta">TD:${it.tecdocVehicleId || "?"}</div>`;
                left.append(img, txt);

                const right = document.createElement("div");
                right.className = "garage-actions";
                const btnUse = document.createElement("button");
                btnUse.className = "btn-primary";
                btnUse.textContent = "Použít";
                btnUse.onclick = () => {
                    if (it.urlPath) location.href = it.urlPath;
                    else showToast("Aktivní vozidlo nastaveno.");
                };
                const btnDel = document.createElement("button");
                btnDel.className = "btn-danger";
                btnDel.textContent = "Smazat";
                btnDel.onclick = async () => {
                    if (!confirm("Smazat vozidlo?")) return;
                    try {
                        await apiDelete(cid, GARAGE_TOKEN, it.id);
                        loadGarage();
                    } catch (e) {
                        showToast("Chyba mazání");
                    }
                };
                right.append(btnUse, btnDel);

                row.append(left, right);
                listEl.appendChild(row);
            });
        }

        async function saveCurrentVehicle() {
            let v = getCurrentVehicle();
            v.urlPath = normalizeVehicleUrl(v.urlPath || location.pathname);
            v.label = cleanVehicleLabel(v.label);

            try {
                await apiSave(cid, GARAGE_TOKEN, v);
                loadGarage();
                showToast("Uloženo do Garáže");
            } catch (e) {
                showToast("Chyba ukládání");
            }
        }

        createUI();

        // Pending-add flow: jesli user kliknal "Pridat auto" w modalu na innej stronie,
        // localStorage flag jest ustawiony — po dojechaniu na detail strony auta,
        // automatycznie zapisz pojazd.
        if (localStorage.getItem("pendingGarageAdd") === "1") {
            if (isVehicleDetailUrl(location.pathname)) {
                const observer = new MutationObserver(() => {
                    const h1 = document.querySelector("h1");
                    if (h1) {
                        saveCurrentVehicle();
                        localStorage.removeItem("pendingGarageAdd");
                        observer.disconnect();
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });

                const h1 = document.querySelector("h1");
                if (h1) {
                    saveCurrentVehicle();
                    localStorage.removeItem("pendingGarageAdd");
                    observer.disconnect();
                }
            } else {
                // auto-czyszczenie po 10 minutach jesli nie dotarl na detail
                setTimeout(() => {
                    localStorage.removeItem("pendingGarageAdd");
                }, 10 * 60 * 1000);
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
