// DC Zoning Dashboard - app.js

// ===== Configuration =====
const CONFIG = {
    API_BASE: 'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Planning_Landuse_and_Zoning_WebMercator/MapServer',
    LAYER_ZONING: 34,
    LAYER_DESIGN_REVIEW: 45,
    DEFAULT_DAYS_BACK: 180,
    PAGE_SIZE: 2000,
    STORAGE_KEYS: {
        VIEW_MODE: 'zoning_dashboard_view'
    }
};

// Field mappings for each layer
const FIELD_MAP = {
    layer34: ['CASE_NUMBER', 'CASE_TYPE', 'CASE_TYPE_RELIEF', 'PREMISE_ADDRESS', 'DESCRIPTION', 'EXISTINGZONING', 'REQUESTEDZONING', 'SSL', 'URL', 'ANCSMD', 'DATEFILED'],
    layer45: ['DR_CASENUMBER', 'DR_CASEYPE', 'DR_NARRATIVE', 'DR_STATUS', 'DR_URL', 'DR_DATEFILED']
};

// ===== Application State =====
const AppState = {
    cases: [],
    filteredCases: [],
    filters: {
        dateFrom: null,
        dateTo: null,
        caseTypes: ['ZC', 'BZA', 'DR'],
        searchText: ''
    },
    viewMode: 'table',
    sortBy: 'dateFiled',
    sortDir: 'desc',
    selectedCase: null,
    loading: false,
    error: null
};

// ===== Utility Functions =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(date) {
    if (!date || !(date instanceof Date) || isNaN(date)) return '-';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateForInput(date) {
    return formatDateForAPI(date);
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
}

function parseDRDate(dateStr) {
    if (!dateStr) return null;
    // DR dates are strings like "1/11/2016" or "2016-01-11"
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[0] - 1, parts[1]);
        }
    }
    return new Date(dateStr);
}

function getDefaultDateFrom() {
    const date = new Date();
    date.setDate(date.getDate() - CONFIG.DEFAULT_DAYS_BACK);
    return date;
}

// ===== API Functions =====
async function fetchZoningCases(dateFrom) {
    const whereClause = dateFrom
        ? `DATEFILED >= DATE '${formatDateForAPI(dateFrom)}'`
        : '1=1';

    const params = new URLSearchParams({
        where: whereClause,
        outFields: FIELD_MAP.layer34.join(','),
        f: 'json',
        resultRecordCount: CONFIG.PAGE_SIZE
    });

    const url = `${CONFIG.API_BASE}/${CONFIG.LAYER_ZONING}/query?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch zoning cases: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || 'API error');
    }

    return (data.features || []).map(f => normalizeZoningCase(f.attributes));
}

async function fetchDesignReviewCases(dateFrom) {
    const params = new URLSearchParams({
        where: '1=1',
        outFields: FIELD_MAP.layer45.join(','),
        f: 'json',
        resultRecordCount: CONFIG.PAGE_SIZE
    });

    const url = `${CONFIG.API_BASE}/${CONFIG.LAYER_DESIGN_REVIEW}/query?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch design review cases: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || 'API error');
    }

    let cases = (data.features || []).map(f => normalizeDesignReviewCase(f.attributes));

    // Filter by date client-side (DR_DATEFILED is a string field)
    if (dateFrom) {
        cases = cases.filter(c => c.dateFiled && c.dateFiled >= dateFrom);
    }

    return cases;
}

// ===== Data Normalization =====
function normalizeZoningCase(attrs) {
    const dateFiled = attrs.DATEFILED ? new Date(attrs.DATEFILED) : null;
    const rawCaseNumber = attrs.CASE_NUMBER || '';
    // Split "13-01 0848" to get just "13-01" (case number without SSL suffix)
    const caseNumber = rawCaseNumber.split(' ')[0];

    // Build IZIS URL if not provided
    let url = attrs.URL;
    if (!url && caseNumber) {
        url = `https://app.dcoz.dc.gov/Home/ViewCase?case_id=${encodeURIComponent(caseNumber)}`;
    }

    return {
        id: rawCaseNumber || `zc-${Math.random().toString(36).substr(2, 9)}`,
        caseNumber: caseNumber,
        caseType: attrs.CASE_TYPE || 'ZC',
        caseTypeRelief: attrs.CASE_TYPE_RELIEF || '',
        address: attrs.PREMISE_ADDRESS || '',
        description: attrs.DESCRIPTION || '',
        existingZoning: attrs.EXISTINGZONING || '',
        requestedZoning: attrs.REQUESTEDZONING || '',
        ssl: attrs.SSL || '',
        url: url,
        anc: attrs.ANCSMD || '',
        status: null,
        dateFiled: dateFiled,
        source: 'layer34'
    };
}

function normalizeDesignReviewCase(attrs) {
    const dateFiled = parseDRDate(attrs.DR_DATEFILED);
    const caseNumber = attrs.DR_CASENUMBER || '';

    // Build IZIS URL if not provided
    let url = attrs.DR_URL;
    if (!url && caseNumber) {
        url = `https://app.dcoz.dc.gov/Home/ViewCase?case_id=${encodeURIComponent(caseNumber)}`;
    }

    return {
        id: caseNumber || `dr-${Math.random().toString(36).substr(2, 9)}`,
        caseNumber: caseNumber,
        caseType: 'DR',
        caseTypeRelief: attrs.DR_CASEYPE || '',
        address: '',
        description: attrs.DR_NARRATIVE || '',
        existingZoning: '',
        requestedZoning: '',
        ssl: '',
        url: url,
        anc: '',
        status: attrs.DR_STATUS || '',
        dateFiled: dateFiled,
        source: 'layer45'
    };
}

// ===== Data Loading =====
async function loadAllCases() {
    AppState.loading = true;
    AppState.error = null;
    showLoadingState();

    try {
        const dateFrom = AppState.filters.dateFrom || getDefaultDateFrom();

        const [zoningCases, drCases] = await Promise.all([
            fetchZoningCases(dateFrom),
            fetchDesignReviewCases(dateFrom)
        ]);

        AppState.cases = [...zoningCases, ...drCases];
        applyFiltersAndSort();
        hideLoadingState();
        renderResults();
    } catch (error) {
        console.error('Failed to load cases:', error);
        AppState.error = error.message;
        hideLoadingState();
        showErrorState(error.message);
    } finally {
        AppState.loading = false;
    }
}

// ===== Filter & Sort Logic =====
function applyFiltersAndSort() {
    let results = [...AppState.cases];

    // Date range filter
    if (AppState.filters.dateFrom) {
        results = results.filter(c => c.dateFiled && c.dateFiled >= AppState.filters.dateFrom);
    }
    if (AppState.filters.dateTo) {
        const endOfDay = new Date(AppState.filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        results = results.filter(c => c.dateFiled && c.dateFiled <= endOfDay);
    }

    // Case type filter
    if (AppState.filters.caseTypes.length > 0 && AppState.filters.caseTypes.length < 3) {
        results = results.filter(c => AppState.filters.caseTypes.includes(c.caseType));
    }

    // Text search (includes ANC)
    if (AppState.filters.searchText) {
        const search = AppState.filters.searchText.toLowerCase();
        results = results.filter(c =>
            (c.caseNumber && c.caseNumber.toLowerCase().includes(search)) ||
            (c.address && c.address.toLowerCase().includes(search)) ||
            (c.description && c.description.toLowerCase().includes(search)) ||
            (c.caseTypeRelief && c.caseTypeRelief.toLowerCase().includes(search)) ||
            (c.anc && c.anc.toLowerCase().includes(search))
        );
    }

    // Sort
    results.sort((a, b) => {
        let valA = a[AppState.sortBy];
        let valB = b[AppState.sortBy];

        // Handle null/undefined
        if (valA == null && valB == null) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;

        // Handle dates
        if (valA instanceof Date && valB instanceof Date) {
            valA = valA.getTime();
            valB = valB.getTime();
        }

        // Compare
        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        } else {
            comparison = String(valA).localeCompare(String(valB));
        }

        return AppState.sortDir === 'desc' ? -comparison : comparison;
    });

    AppState.filteredCases = results;
}

// ===== UI State Functions =====
function showLoadingState() {
    document.getElementById('loading-state').classList.remove('hidden');
    document.getElementById('table-view').classList.add('hidden');
    document.getElementById('card-view').classList.add('hidden');
    document.getElementById('error-state').classList.add('hidden');
    document.getElementById('empty-state').classList.add('hidden');
}

function hideLoadingState() {
    document.getElementById('loading-state').classList.add('hidden');
}

function showErrorState(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-state').classList.remove('hidden');
}

function showEmptyState() {
    document.getElementById('empty-state').classList.remove('hidden');
}

// ===== Rendering Functions =====
function renderResults() {
    updateResultsSummary();

    if (AppState.filteredCases.length === 0) {
        document.getElementById('table-view').classList.add('hidden');
        document.getElementById('card-view').classList.add('hidden');
        showEmptyState();
        return;
    }

    document.getElementById('empty-state').classList.add('hidden');

    if (AppState.viewMode === 'table') {
        document.getElementById('table-view').classList.remove('hidden');
        document.getElementById('card-view').classList.add('hidden');
        renderTableView();
    } else {
        document.getElementById('table-view').classList.add('hidden');
        document.getElementById('card-view').classList.remove('hidden');
        renderCardView();
    }
}

function updateResultsSummary() {
    const count = AppState.filteredCases.length;
    const total = AppState.cases.length;
    const countText = count === total
        ? `Showing ${count} cases`
        : `Showing ${count} of ${total} cases`;

    document.querySelector('.results-count').textContent = countText;
    renderActiveFilters();
}

function renderActiveFilters() {
    const container = document.getElementById('active-filters');
    const chips = [];

    if (AppState.filters.searchText) {
        chips.push(`<span class="filter-chip">Search: "${escapeHtml(truncateText(AppState.filters.searchText, 20))}" <span class="remove" data-filter="search">&times;</span></span>`);
    }

    container.innerHTML = chips.join('');

    // Attach event listeners to remove buttons
    container.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const filter = e.target.dataset.filter;
            if (filter === 'search') {
                AppState.filters.searchText = '';
                document.getElementById('search-input').value = '';
            }
            applyFiltersAndSort();
            renderResults();
        });
    });
}

function renderTableView() {
    const tbody = document.getElementById('table-body');

    tbody.innerHTML = AppState.filteredCases.map(c => `
        <tr data-case-id="${escapeHtml(c.id)}">
            <td>
                <a class="case-link" data-url="${escapeHtml(c.url)}" data-case-id="${escapeHtml(c.id)}">
                    ${escapeHtml(c.caseNumber)}
                </a>
            </td>
            <td>
                <span class="case-type-badge ${c.caseType.toLowerCase()}">
                    ${c.caseType}
                </span>
            </td>
            <td>${escapeHtml(c.address || c.caseTypeRelief || '-')}</td>
            <td>${escapeHtml(c.anc || '-')}</td>
            <td>${formatDate(c.dateFiled)}</td>
        </tr>
    `).join('');

    attachTableEventListeners();
}

function renderCardView() {
    const grid = document.getElementById('cards-grid');

    grid.innerHTML = AppState.filteredCases.map(c => `
        <div class="case-card" data-case-id="${escapeHtml(c.id)}">
            <div class="case-card-header">
                <div>
                    <a class="case-link" data-url="${escapeHtml(c.url)}" data-case-id="${escapeHtml(c.id)}">
                        ${escapeHtml(c.caseNumber)}
                    </a>
                    <div class="case-date">${formatDate(c.dateFiled)}</div>
                </div>
                <span class="case-type-badge ${c.caseType.toLowerCase()}">
                    ${c.caseType}
                </span>
            </div>
            ${c.address ? `<div class="case-address">${escapeHtml(c.address)}</div>` : ''}
            ${c.caseTypeRelief ? `<div class="case-relief">${escapeHtml(c.caseTypeRelief)}</div>` : ''}
            ${c.description ? `<div class="case-description">${escapeHtml(truncateText(c.description, 150))}</div>` : ''}
            ${c.anc ? `<div class="case-anc">ANC: ${escapeHtml(c.anc)}</div>` : ''}
        </div>
    `).join('');

    attachCardEventListeners();
}

function renderDetailModal(caseData) {
    const modal = document.getElementById('detail-modal');
    const body = document.getElementById('modal-body');

    body.innerHTML = `
        <div class="detail-header">
            <h2>${escapeHtml(caseData.caseNumber)}</h2>
            <span class="case-type-badge ${caseData.caseType.toLowerCase()}">
                ${caseData.caseType}
            </span>
        </div>

        ${caseData.url ? `
            <a href="${escapeHtml(caseData.url)}" target="_blank" rel="noopener" class="izis-link btn btn-primary">
                View in IZIS
            </a>
        ` : ''}

        <div class="detail-section">
            <h3>Case Information</h3>
            <dl class="detail-list">
                ${caseData.caseTypeRelief ? `<dt>Relief Type</dt><dd>${escapeHtml(caseData.caseTypeRelief)}</dd>` : ''}
                ${caseData.address ? `<dt>Address</dt><dd><a href="https://www.google.com/maps/search/${encodeURIComponent(caseData.address + ', Washington, DC')}" target="_blank" rel="noopener">${escapeHtml(caseData.address)}</a></dd>` : ''}
                ${caseData.dateFiled ? `<dt>Date Filed</dt><dd>${formatDate(caseData.dateFiled)}</dd>` : ''}
                ${caseData.anc ? `<dt>ANC/SMD</dt><dd>${escapeHtml(caseData.anc)}</dd>` : ''}
                ${caseData.ssl ? `<dt>SSL</dt><dd><a href="https://maps.dcoz.dc.gov/" target="_blank" rel="noopener">${escapeHtml(caseData.ssl)}</a></dd>` : ''}
                ${caseData.status ? `<dt>Status</dt><dd>${escapeHtml(caseData.status)}</dd>` : ''}
            </dl>
        </div>

        ${caseData.existingZoning || caseData.requestedZoning ? `
            <div class="detail-section">
                <h3>Zoning</h3>
                <dl class="detail-list">
                    ${caseData.existingZoning ? `<dt>Existing</dt><dd>${escapeHtml(caseData.existingZoning)}</dd>` : ''}
                    ${caseData.requestedZoning ? `<dt>Requested</dt><dd>${escapeHtml(caseData.requestedZoning)}</dd>` : ''}
                </dl>
            </div>
        ` : ''}

        ${caseData.description ? `
            <div class="detail-section">
                <h3>Description</h3>
                <p class="detail-description">${escapeHtml(caseData.description)}</p>
            </div>
        ` : ''}
    `;

    modal.classList.remove('hidden');
    AppState.selectedCase = caseData;
}

function closeModal() {
    document.getElementById('detail-modal').classList.add('hidden');
    AppState.selectedCase = null;
}

// ===== Event Handlers =====
function attachTableEventListeners() {
    // Case number links - open IZIS in new tab
    document.querySelectorAll('#table-body .case-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = e.target.dataset.url;
            if (url) {
                window.open(url, '_blank');
            }
        });
    });

    // Row click - show detail panel
    document.querySelectorAll('#table-body tr').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.classList.contains('case-link')) return;
            const caseId = row.dataset.caseId;
            const caseData = AppState.cases.find(c => c.id === caseId);
            if (caseData) {
                renderDetailModal(caseData);
            }
        });
    });
}

function attachCardEventListeners() {
    document.querySelectorAll('.case-card').forEach(card => {
        // Case number link
        const link = card.querySelector('.case-link');
        if (link) {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = link.dataset.url;
                if (url) {
                    window.open(url, '_blank');
                }
            });
        }

        // Card click - show detail
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('case-link')) return;
            const caseId = card.dataset.caseId;
            const caseData = AppState.cases.find(c => c.id === caseId);
            if (caseData) {
                renderDetailModal(caseData);
            }
        });
    });
}

function setupFilterListeners() {
    // Date range
    document.getElementById('date-from').addEventListener('change', (e) => {
        AppState.filters.dateFrom = e.target.value ? new Date(e.target.value + 'T00:00:00') : null;
        loadAllCases(); // Reload from API with new date
    });

    document.getElementById('date-to').addEventListener('change', (e) => {
        AppState.filters.dateTo = e.target.value ? new Date(e.target.value + 'T00:00:00') : null;
        applyFiltersAndSort();
        renderResults();
    });

    // Case type checkboxes
    document.querySelectorAll('.case-type-filter').forEach(cb => {
        cb.addEventListener('change', () => {
            AppState.filters.caseTypes = Array.from(
                document.querySelectorAll('.case-type-filter:checked')
            ).map(el => el.value);
            applyFiltersAndSort();
            renderResults();
        });
    });

    // Search input (debounced)
    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            AppState.filters.searchText = e.target.value;
            applyFiltersAndSort();
            renderResults();
        }, 300);
    });

    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            AppState.viewMode = btn.dataset.view;
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            savePreferences();
            renderResults();
        });
    });

    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
        loadAllCases();
    });

    // Filters toggle
    document.getElementById('filters-toggle').addEventListener('click', () => {
        const toggle = document.getElementById('filters-toggle');
        const body = document.getElementById('filters-body');
        toggle.classList.toggle('collapsed');
        body.classList.toggle('collapsed');
    });
}

function setupSortListeners() {
    document.querySelectorAll('.cases-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortBy = th.dataset.sort;

            // Toggle direction if same column
            if (AppState.sortBy === sortBy) {
                AppState.sortDir = AppState.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                AppState.sortBy = sortBy;
                AppState.sortDir = 'desc';
            }

            // Update header classes
            document.querySelectorAll('.cases-table th').forEach(h => {
                h.classList.remove('sort-active', 'sort-desc');
            });
            th.classList.add('sort-active');
            if (AppState.sortDir === 'desc') {
                th.classList.add('sort-desc');
            }

            applyFiltersAndSort();
            renderResults();
        });
    });
}

function setupModalListeners() {
    const modal = document.getElementById('detail-modal');

    // Close button
    modal.querySelector('.modal-close').addEventListener('click', closeModal);

    // Click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

// ===== Preferences =====
function savePreferences() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.VIEW_MODE, AppState.viewMode);
}

function loadPreferences() {
    const savedView = localStorage.getItem(CONFIG.STORAGE_KEYS.VIEW_MODE);
    if (savedView && (savedView === 'table' || savedView === 'cards')) {
        AppState.viewMode = savedView;
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === savedView);
        });
    }
}

// ===== Initialization =====
function setDefaultDateRange() {
    const today = new Date();
    const defaultFrom = getDefaultDateFrom();

    document.getElementById('date-from').value = formatDateForInput(defaultFrom);
    document.getElementById('date-to').value = formatDateForInput(today);

    AppState.filters.dateFrom = defaultFrom;
    AppState.filters.dateTo = today;
}

function initApp() {
    loadPreferences();
    setDefaultDateRange();
    setupFilterListeners();
    setupSortListeners();
    setupModalListeners();
    loadAllCases();
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
