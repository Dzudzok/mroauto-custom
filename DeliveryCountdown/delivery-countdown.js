/* Tooltip delivery countdown — migrowane z Body_w_nextis 2026-05-15 (faza B4).
   Fixed badge top-right ze odliczaniem deadline transportu + tooltip z trasami kurierskimi.
   Tylko dla zalogowanych. Element .transport-deadline-countdown renderuje Nextis,
   skrypt tylko go dekoruje (tooltip, kolor timera, listenery).

   CSS w DeliveryCountdown/delivery-countdown.css. Material Icons i FontAwesome
   sa juz ladowane w Head_w_nextis — nie laduje ich ponownie. Bootstrap Icons
   nieuzywane w tym module — wyciete. */
(function () {
    'use strict';

    if (window.__MRO_DELIVERY_COUNTDOWN_INIT) return;
    window.__MRO_DELIVERY_COUNTDOWN_INIT = true;

    const routes = [
        { city: "Ostrava",        route: "1 Trasa", orderBy: "22:00:00", departure: "07:15:00" },
        { city: "Ostrava",        route: "2 Trasa", orderBy: "09:00:00", departure: "11:00:00" },
        { city: "Ostrava",        route: "3 Trasa", orderBy: "11:00:00", departure: "13:00:00" },
        { city: "Karviná",        route: "1 Trasa", orderBy: "22:00:00", departure: "07:15:00" },
        { city: "Karviná",        route: "2 Trasa", orderBy: "09:00:00", departure: "11:00:00" },
        { city: "Karviná",        route: "3 Trasa", orderBy: "11:00:00", departure: "13:00:00" },
        { city: "Bruntál",        route: "1 Trasa", orderBy: "22:00:00", departure: "07:15:00" },
        { city: "Český Těšín",    route: "1 Trasa", orderBy: "22:00:00", departure: "07:15:00" },
        { city: "Český Těšín",    route: "2 Trasa", orderBy: "09:00:00", departure: "11:00:00" },
        { city: "Opava",          route: "1 Trasa", orderBy: "22:00:00", departure: "07:15:00" },
        { city: "Opava",          route: "2 Trasa", orderBy: "09:00:00", departure: "11:00:00" },
        { city: "Opava",          route: "3 Trasa", orderBy: "11:00:00", departure: "13:00:00" },
        { city: "Orlová",         route: "1 Trasa", orderBy: "22:00:00", departure: "07:15:00" },
        { city: "Orlová",         route: "2 Trasa", orderBy: "09:00:00", departure: "11:00:00" },
        { city: "Orlová",         route: "3 Trasa", orderBy: "11:00:00", departure: "13:00:00" },
        { city: "Havířov",        route: "1 Trasa", orderBy: "22:00:00", departure: "07:15:00" },
        { city: "Havířov",        route: "2 Trasa", orderBy: "09:00:00", departure: "11:00:00" },
        { city: "Havířov",        route: "3 Trasa", orderBy: "11:00:00", departure: "13:00:00" },
        { city: "Frýdek-Místek",  route: "1 Trasa", orderBy: "22:00:00", departure: "07:15:00" },
        { city: "Frýdek-Místek",  route: "2 Trasa", orderBy: "09:00:00", departure: "11:00:00" },
        { city: "Frýdek-Místek",  route: "3 Trasa", orderBy: "11:00:00", departure: "13:00:00" },
        { city: "Kopřivnice",     route: "1 Trasa", orderBy: "22:00:00", departure: "07:15:00" },
        { city: "Olomouc",        route: "1 Trasa", orderBy: "22:00:00", departure: "07:15:00" },
        { city: "Olomouc",        route: "2 Trasa", orderBy: "09:00:00", departure: "12:30:00" },
        { city: "Hranice",        route: "1 Trasa", orderBy: "22:00:00", departure: "07:15:00" },
        { city: "Hranice",        route: "2 Trasa", orderBy: "09:00:00", departure: "12:30:00" }
    ];

    function timeToSeconds(timeStr) {
        const [hours, minutes, seconds] = timeStr.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    function getCurrentTimeInSeconds() {
        const now = new Date();
        return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    }

    function getNextWorkday() {
        const now = new Date();
        let dayOffset = 0;
        let day = now.getDay();

        while (dayOffset === 0 || day === 0 || day === 6) {
            dayOffset++;
            day = (day + 1) % 7;
        }
        now.setDate(now.getDate() + dayOffset);
        return now;
    }

    function formatTimeWithoutSeconds(timeStr) {
        const [hours, minutes] = timeStr.split(':');
        return `${hours}:${minutes}`;
    }

    function getCurrentRoutes() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const currentTimeInSeconds = getCurrentTimeInSeconds();

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            getNextWorkday(); // zachowane jak w oryginale (efekt uboczny? — bez efektu)
            return routes.map(route => ({ ...route, isNextDay: true }));
        }

        const cities = [...new Set(routes.map(route => route.city))];
        const currentRoutes = [];

        cities.forEach(city => {
            const cityRoutes = routes.filter(route => route.city === city);
            let nextRoute = null;
            let minTimeDiff = Infinity;

            for (const route of cityRoutes) {
                const orderByInSeconds = timeToSeconds(route.orderBy);
                const timeDiff = orderByInSeconds - currentTimeInSeconds;

                if (timeDiff >= 0 && timeDiff < minTimeDiff) {
                    minTimeDiff = timeDiff;
                    nextRoute = route;
                }
            }

            if (!nextRoute) {
                nextRoute = { ...cityRoutes[0], isNextDay: true };
            }

            currentRoutes.push(nextRoute);
        });

        return currentRoutes;
    }

    function init() {
        const isLoggedIn = document.querySelector('.flex-user-menu');
        if (!isLoggedIn) return;

        const countdownTimer = document.querySelector('.transport-deadline-countdown');
        if (!countdownTimer) return;

        const label = countdownTimer.querySelector('span:not(.transport-deadline-countdown-timer)') || countdownTimer.firstChild;
        if (label) {
            label.textContent = 'Čas do uzavření trasy : ';
        }

        function updateTooltip() {
            const currentRoutes = getCurrentRoutes();
            const tooltip = countdownTimer.querySelector('.mro-delivery-tooltip') || document.createElement('div');
            tooltip.className = 'mro-delivery-tooltip';

            if (currentRoutes.length === 0) {
                tooltip.innerHTML = `
                    <div class="mro-delivery-items">
                        <div class="mro-delivery-item"><i class="fas fa-shipping-fast"></i><span>Žádné trasy k dispozici.</span></div>
                    </div>
                `;
            } else {
                const routeItems = currentRoutes.map(route => {
                    const orderByFormatted = formatTimeWithoutSeconds(route.orderBy);
                    const departureFormatted = formatTimeWithoutSeconds(route.departure);
                    const isFirstRouteWithNextDayDeparture = route.orderBy === "22:00:00" && route.departure === "07:15:00";
                    const departureDayText = isFirstRouteWithNextDayDeparture ? ' (následující den)' : '';
                    const dayText = route.isNextDay && !isFirstRouteWithNextDayDeparture ? ' (následující den)' : '';

                    return `
                        <div class="mro-delivery-item">
                            <i class="fas fa-shipping-fast"></i>
                            <span>${route.city}: ${route.route} - Objednat do ${orderByFormatted}, Vyjezd ${departureFormatted}${departureDayText}${dayText}</span>
                        </div>
                    `;
                }).join('');

                tooltip.innerHTML = `
                    <div class="mro-delivery-items">
                        ${routeItems}
                    </div>
                    <div class="mro-delivery-info">
                        Jedná se o informaci o uzavření trasy. U zboží máte přesné informace o tom, na kterou trasu zboží můžeme expedovat.
                    </div>
                `;
            }

            if (!tooltip.parentElement) {
                countdownTimer.appendChild(tooltip);
            }
        }

        updateTooltip();
        setInterval(updateTooltip, 60 * 1000);

        const timerElement = countdownTimer.querySelector('.transport-deadline-countdown-timer');
        if (!timerElement) return;

        function updateColor() {
            const timeText = timerElement.textContent.trim();
            const [hours, minutes, seconds] = timeText.split(':').map(Number);
            const totalSeconds = (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);

            if (totalSeconds < 5 * 60) {
                timerElement.style.color = '#ff0000';
            } else {
                timerElement.style.color = '#007d00';
            }
        }

        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.target === timerElement) {
                    updateColor();
                }
            });
        });

        observer.observe(timerElement, {
            childList: true,
            characterData: true,
            subtree: true
        });

        updateColor();

        window.addEventListener('scroll', function () {
            if (window.pageYOffset > 100) {
                countdownTimer.classList.add('scrolled');
            } else {
                countdownTimer.classList.remove('scrolled');
            }
        }, { passive: true });

        countdownTimer.addEventListener('click', function () {
            countdownTimer.classList.toggle('active');
        });

        document.addEventListener('click', function (event) {
            if (!countdownTimer.contains(event.target)) {
                countdownTimer.classList.remove('active');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0), { once: true });
    } else {
        setTimeout(init, 0);
    }
})();
