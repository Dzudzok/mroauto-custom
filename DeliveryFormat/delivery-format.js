/* Formater dat dostawy + tooltip dat — migrowane z Body_w_nextis 2026-05-15 (faza B3).
   Formatuje:
     - .flex-delivery-to-time-text — daty dostaw (np. "Dodání zboží dnes" → "Dodání zboží dnes 15.05.2026")
     - .flex-html-tooltip-content .order-time-current — tooltipy z GLS / Rozvoz / Osobně na pobočce
     - .flex-html-tooltip-content .order-time-other-branches — restrukturyzacja listy oddzialow
   MutationObserver na document.body lapuje elementy pojawiajace sie dynamicznie (tooltipy po hover). */
(function ($) {
    'use strict';

    if (window.__MRO_DELIVERY_FORMAT_INIT) return;
    window.__MRO_DELIVERY_FORMAT_INIT = true;

    if (typeof $ === 'undefined') {
        console.warn('MROAUTO: delivery-format.js wymaga jQuery, pomijam.');
        return;
    }

    function reformatDeliveryDates(container = document) {
        $(container).find('.flex-delivery-to-time-text:not(.processed)').each(function () {
            const $this = $(this);
            let currentText = $this.text().trim();

            if (/\d{2}\.\d{2}\.\d{4}/u.test(currentText)) {
                return;
            }

            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const dayAfterTomorrow = new Date(today);
            dayAfterTomorrow.setDate(today.getDate() + 2);

            const formatDate = (date) => {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}.${month}.${year}`;
            };

            if (currentText.includes('Dodání zboží dnes')) {
                currentText = currentText.replace('Dodání zboží dnes', `Dodání zboží dnes ${formatDate(today)}`);
            } else if (currentText.includes('Dodání zboží zítra')) {
                currentText = currentText.replace('Dodání zboží zítra', `Dodání zboží zítra ${formatDate(tomorrow)}`);
            } else if (currentText.includes('Dodání zboží pozítří')) {
                currentText = currentText.replace('Dodání zboží pozítří', `Dodání zboží pozítří ${formatDate(dayAfterTomorrow)}`);
            }

            const parts = currentText.match(/([\p{L}\s]+)\s*(\d{1,2}\/\d{1,2}\/\d{4})/u);
            if (parts) {
                const prefix = parts[1];
                const dateStr = parts[2];
                const [month, day, year] = dateStr.split('/');
                const formattedDate = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
                currentText = `${prefix} ${formattedDate}`;
            }

            $this.text(currentText);
            $this.addClass('processed');
        });
    }

    function reformatTooltipDates(container = document) {
        $(container).find('.flex-html-tooltip-content .order-time-current td.value:not(.processed)').each(function () {
            const $this = $(this);
            let currentText = $this.text().trim();
            const $keyCell = $this.prev('td.key');

            if ($keyCell.text().includes('GLS Kurýrní Služba') || $keyCell.text().includes('Rozvoz')) {
                if (/\d{2}\.\d{2}\.\d{4}\s*\d{2}:\d{2}/u.test(currentText)) {
                    return;
                }

                let uniqueDates = [...new Set(currentText.split(/\s+/).filter(word => /\d{1,2}\/\d{1,2}\/\d{4}|\d{2}\.\d{2}\.\d{4}/.test(word)))];
                if (uniqueDates.length > 0) {
                    currentText = currentText.replace(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{2}\.\d{2}\.\d{4})\s*(?=\d{1,2}\/\d{1,2}\/\d{4}|\d{2}\.\d{2}\.\d{4})/g, '');
                }

                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                const dayAfterTomorrow = new Date(today);
                dayAfterTomorrow.setDate(today.getDate() + 2);

                const formatDate = (date) => {
                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = date.getFullYear();
                    return `${day}.${month}.${year}`;
                };

                if (currentText.includes('Dodání zboží dnes')) {
                    currentText = currentText.replace('Dodání zboží dnes', `Dodání zboží dnes ${formatDate(today)}`);
                } else if (currentText.includes('Dodání zboží zítra')) {
                    currentText = currentText.replace('Dodání zboží zítra', `Dodání zboží zítra ${formatDate(tomorrow)}`);
                } else if (currentText.includes('Dodání zboží pozítří')) {
                    currentText = currentText.replace('Dodání zboží pozítří', `Dodání zboží pozítří ${formatDate(dayAfterTomorrow)}`);
                }

                const parts = currentText.match(/([\p{L}\s]+)\s*(\d{1,2}\/\d{1,2}\/\d{4}|\d{2}\.\d{2}\.\d{4})\s*(\d{2}:\d{2})/u);
                if (parts) {
                    const prefix = parts[1];
                    let dateStr = parts[2];
                    const time = parts[3];

                    if (dateStr.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
                        const [month, day, year] = dateStr.split('/');
                        dateStr = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
                    }

                    $this.text(`${prefix} ${dateStr} ${time}`);
                }
            }

            if ($keyCell.text().includes('Osobně na pobočce')) {
                if (/[\p{L}\s]+\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/u.test(currentText)) {
                    return;
                }

                const words = currentText.split(/\s+/);
                let dayName = '';
                let timeRange = '';

                for (let i = 0; i < words.length; i++) {
                    if (!/\d/.test(words[i]) && words[i] !== '-') {
                        dayName = words[i];
                        timeRange = currentText.slice(currentText.indexOf(words[i + 1])).trim();
                        break;
                    }
                }

                if (dayName && timeRange) {
                    const [startTime12h, endTime12h] = timeRange.split(/\s*-\s*/);
                    if (startTime12h && endTime12h) {
                        const startTime = convertTo24Hour(startTime12h);
                        const endTime = convertTo24Hour(endTime12h);
                        $this.text(`${dayName} ${startTime} - ${endTime}`);
                    }
                }
            }

            $this.addClass('processed');
        });

        $(container).find('.flex-html-tooltip-content .order-time-other-branches table tbody:not(.processed)').each(function () {
            const $tbody = $(this);
            const requiredStocks = [
                'Sklad MROAUTO (ihned)',
                'Hlavní sklad (6H)',
                'Ostrava - Pobočka',
                'Havirov - Pobočka',
                'Externí skl. (24-72h)'
            ];

            const existingStocks = {};
            $tbody.find('tr').each(function () {
                const key = $(this).find('td.key').text().trim();
                const value = $(this).find('td.value').text().trim();
                existingStocks[key] = value;
            });

            $tbody.empty();
            requiredStocks.forEach(stock => {
                const quantity = existingStocks[stock] || '0 ks';
                const newRow = `<tr><td class="key">${stock}</td><td class="value">${quantity}</td></tr>`;
                $tbody.append(newRow);
            });

            $tbody.addClass('processed');
        });
    }

    function convertTo24Hour(timeStr) {
        const [time, modifier] = timeStr.split(/\s+/);
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours, 10);

        if (modifier && modifier.toUpperCase() === 'PM' && hours !== 12) {
            hours += 12;
        } else if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
        }

        return `${String(hours).padStart(2, '0')}:${minutes}`;
    }

    $(document).ready(function () {
        reformatDeliveryDates();
        reformatTooltipDates();
    });

    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        reformatDeliveryDates(node);
                        reformatTooltipDates(node);
                    }
                });
            }
        });
    });

    // observer.observe wymaga document.body — odpalamy w callback DOMContentLoaded
    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, { childList: true, subtree: true });
        }, { once: true });
    }
})(window.jQuery);
