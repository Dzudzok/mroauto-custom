document.addEventListener('DOMContentLoaded', function () {
    const openBtn = document.getElementById('openFiltersBtn');
    const modal = document.getElementById('filtersModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const applyBtn = document.getElementById('applyFiltersBtn');
    const clearBtn = document.getElementById('clearFiltersBtn');

    const manufacturersContainer = document.getElementById('manufacturersList');
    const otherParamsContainer = document.getElementById('otherParamsList');

    // Funkcja do parsowania filtrów z oryginalnego HTML
    function parseFilters() {
        const manufacturers = [];
        const otherParams = [];

        // Parsowanie producentów
        const manufacturerSpans = document.querySelectorAll('.flex-manufacturers .flex-checkbox-toogle-text');
        manufacturerSpans.forEach(span => {
            const text = span.textContent.trim();
            if (text) {
                manufacturers.push({
                    name: text,
                    value: span.previousElementSibling?.previousElementSibling?.querySelector('input')?.value || ''
                });
            }
        });

        // Parsowanie innych parametrów (GenericArticleAttributeFilter)
        const paramSpans = document.querySelectorAll('[id*="GenericArticleAttributeFilter"] .flex-checkbox-toogle-text');
        paramSpans.forEach(span => {
            const text = span.textContent.trim();
            if (text && !text.includes('Zrušit')) {
                otherParams.push({
                    name: text,
                    value: span.previousElementSibling?.previousElementSibling?.querySelector('input')?.value || ''
                });
            }
        });

        return { manufacturers, otherParams };
    }

    // Wypełnij listy filtrami
    function populateFilters() {
        const { manufacturers, otherParams } = parseFilters();

        // Wyczyść kontenery
        manufacturersContainer.innerHTML = '';
        otherParamsContainer.innerHTML = '';

        // Dodaj producentów
        manufacturers.forEach((item, index) => {
            const label = document.createElement('label');
            label.innerHTML = `
                <input type="checkbox" 
                       name="manufacturer" 
                       value="${item.value || item.name}" 
                       data-index="${index}"
                       data-type="manufacturer">
                ${item.name}
            `;
            manufacturersContainer.appendChild(label);
        });

        // Dodaj inne parametry
        otherParams.forEach((item, index) => {
            const label = document.createElement('label');
            label.innerHTML = `
                <input type="checkbox" 
                       name="param" 
                       value="${item.value || item.name}" 
                       data-index="${index}"
                       data-type="param">
                ${item.name}
            `;
            otherParamsContainer.appendChild(label);
        });
    }

    // Odśwież filtry przy załadowaniu strony i zmianie (mutacje)
    populateFilters();

    // Observer na zmiany w DOM (gdy filtry się odświeżają)
    const observer = new MutationObserver(() => {
        populateFilters();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Otwieranie modala
    openBtn.addEventListener('click', () => {
        populateFilters(); // Odśwież przed otwarciem
        modal.style.display = 'flex';
    });

    // Zamykanie modala
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Zastosuj filtry - symulacja kliknięcia oryginalnych checkboxów
    applyBtn.addEventListener('click', () => {
        // Odznacz wszystkie oryginalne checkboxy
        document.querySelectorAll('.flex-checkbox').forEach(cb => cb.checked = false);

        // Zaznacz wybrane w modalu
        document.querySelectorAll('#filtersModal input[type="checkbox"]:checked').forEach(cb => {
            const originalCheckbox = document.querySelector(`input[value="${cb.value}"]`);
            if (originalCheckbox) {
                originalCheckbox.checked = true;
                originalCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        // Wywołaj oryginalną funkcję filtrowania
        if (typeof getTecDocProducts === 'function') {
            getTecDocProducts(
                '.products-list',
                $('#Products2_SortMethod').val(),
                $('#OnStockOnly').is(':checked'),
                $('#PurchasePricePriorized').is(':checked'),
                $('#ViewMode').val(),
                'bmw', '1-f20', '114-i', 'brzdove-oblozeni',
                '16', '9620', '55488', '100030', '-1', '-1', 'osobni',
                true, $('#AreHiddenGroupsVisible').val(), true, false, 1, false,
                $('#PartsListArticleIds').val(), new Event('click')
            );
        }

        modal.style.display = 'none';
    });

    // Wyczyść filtry
    clearBtn.addEventListener('click', () => {
        document.querySelectorAll('#filtersModal input[type="checkbox"]').forEach(cb => cb.checked = false);
        if (typeof removeAllAttributeFilters === 'function') {
            removeAllAttributeFilters();
        }
        modal.style.display = 'none';
    });
});