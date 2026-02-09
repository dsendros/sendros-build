// DC Zoning Dashboard - app.js

// ===== Configuration =====
const CONFIG = {
    API_BASE: 'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCOZ/Zone_Mapservice/MapServer',
    CALENDAR_PROXY: '/api/calendar',
    LAYER_ZONING: 46,
    LAYER_DESIGN_REVIEW: 44,
    DEFAULT_DAYS_BACK: 180,
    PAGE_SIZE: 1000,
    CALENDAR_MONTHS_BACK: 1,
    CALENDAR_MONTHS_FORWARD: 1,
    STORAGE_KEYS: {
        VIEW_MODE: 'zoning_dashboard_view'
    }
};

// Field mappings for each layer
const FIELD_MAP = {
    layer46: ['Case_ID', 'case_number', 'Case_Type', 'case_type_relief', 'reliefSought', 'Premise_Address', 'Description', 'existingZoning', 'requestedZoning', 'SSL', 'ANCSMD', 'dateFiled'],
    layer44: ['DR_CaseNumber', 'DR_CaseType', 'DR_Narrative', 'DR_Status', 'DR_URL', 'DR_DateFiled']
};

// ===== Application State =====
const AppState = {
    cases: [],
    filteredCases: [],
    filters: {
        dateFrom: null,
        dateTo: null,
        caseTypes: ['ZC', 'BZA'],
        searchText: ''
    },
    viewMode: 'table',
    sortBy: 'hearingDate',
    sortDir: 'asc',
    selectedCase: null,
    loading: false,
    error: null,
    calendarData: [],
    calendarAvailable: null,
    calendarError: null
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
async function fetchAllPages(layerUrl, params) {
    const allFeatures = [];
    let offset = 0;

    while (true) {
        params.set('resultOffset', offset);
        params.set('resultRecordCount', CONFIG.PAGE_SIZE);

        const url = `${layerUrl}/query?${params}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'API error');
        }

        const features = data.features || [];
        allFeatures.push(...features);

        if (data.exceededTransferLimit) {
            offset += features.length;
        } else {
            break;
        }
    }

    return allFeatures;
}

async function fetchZoningCases() {
    const layerUrl = `${CONFIG.API_BASE}/${CONFIG.LAYER_ZONING}`;

    const params = new URLSearchParams({
        where: '1=1',
        outFields: FIELD_MAP.layer46.join(','),
        f: 'json',
        orderByFields: 'dateFiled DESC'
    });

    const features = await fetchAllPages(layerUrl, params);

    // Deduplicate by Case_ID (multiple records per case for different parcels)
    const seen = new Map();
    for (const f of features) {
        const caseId = f.attributes.Case_ID;
        if (!seen.has(caseId)) {
            seen.set(caseId, f.attributes);
        }
    }

    return Array.from(seen.values()).map(attrs => normalizeZoningCase(attrs));
}

async function fetchDesignReviewCases() {
    const layerUrl = `${CONFIG.API_BASE}/${CONFIG.LAYER_DESIGN_REVIEW}`;

    const params = new URLSearchParams({
        where: '1=1',
        outFields: FIELD_MAP.layer44.join(','),
        f: 'json'
    });

    const features = await fetchAllPages(layerUrl, params);
    let cases = features.map(f => normalizeDesignReviewCase(f.attributes));

    return cases;
}

// ===== Calendar Functions =====
function getCalendarMonthRange() {
    const now = new Date();
    const months = [];
    for (let offset = -CONFIG.CALENDAR_MONTHS_BACK; offset <= CONFIG.CALENDAR_MONTHS_FORWARD; offset++) {
        const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    return months;
}

function parseLongDate(str) {
    // Parses "Wednesday, February 11, 2026" -> Date
    const date = new Date(str);
    if (isNaN(date)) return null;
    return date;
}

function extractHearingType(heading) {
    if (/closed\s+meeting/i.test(heading)) return 'Closed Meeting';
    if (/hearing/i.test(heading)) return 'Public Hearing';
    if (/meeting/i.test(heading)) return 'Public Meeting';
    return heading;
}

function extractBodyType(heading) {
    if (/board\s+of\s+zoning\s+adjustment|bza/i.test(heading)) return 'BZA';
    if (/zoning\s+commission|zc/i.test(heading)) return 'ZC';
    return null;
}

function extractVote(text) {
    if (!text) return null;
    const match = text.match(/\b(\d+-\d+-\d+)\b/);
    return match ? match[1] : null;
}

function extractNextAction(text) {
    if (!text) return null;
    // If result text is longer than a simple verdict, it likely contains action info
    const simpleResults = ['approved', 'denied', 'withdrawn', 'postponed', 'rescheduled'];
    const lower = text.toLowerCase().trim();
    if (simpleResults.includes(lower)) return null;
    // If it contains date-like info or action phrases, return the full text
    if (text.length > 15 || /\b(due|order|action|february|march|april|may|june|july|august|september|october|november|december|january)\b/i.test(text)) {
        return text;
    }
    return null;
}

function parseCalendarHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const entries = [];

    // Structure: accordion-item > accordion-header > button > div.row.w-100 (date/type/time)
    //            accordion-item > accordion-collapse > accordion-body (h3, table with cases)
    const items = doc.querySelectorAll('.accordion-item');

    for (const item of items) {
        // Header row contains date, meeting type, and time in col-sm-3 / col-sm-2 divs
        const headerRow = item.querySelector('div.row.w-100');
        if (!headerRow) continue;

        const cols = headerRow.querySelectorAll('[class*="col-sm-"]');
        // cols: [0]=dot, [1]=date, [2]=meeting type, [3]=time, [4]=extra
        if (cols.length < 4) continue;

        const hearingDate = parseLongDate(cols[1].textContent.trim());
        if (!hearingDate) continue;

        // Meeting type from header (e.g. "BZA Public Hearing")
        const meetingTypeText = cols[2].textContent.trim();
        const currentBodyType = extractBodyType(meetingTypeText);
        const currentType = extractHearingType(meetingTypeText);

        // Time from header
        const timeText = cols[3].textContent.trim();
        const timeMatch = timeText.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
        const currentTime = timeMatch ? timeMatch[1].trim() : null;

        // Cases from the table inside accordion-body
        const body = item.querySelector('.accordion-body');
        if (!body) continue;

        for (const table of body.querySelectorAll('table')) {
            for (const tr of table.querySelectorAll('tbody tr')) {
                const cells = tr.querySelectorAll('td');
                if (cells.length < 2) continue;

                const caseLink = cells[0].querySelector('a');
                const caseNumber = cells[0].textContent.trim();
                const caseName = cells[1].textContent.trim();
                const resultText = cells.length > 2 ? cells[2].textContent.trim() : '';

                let caseId = null;
                if (caseLink) {
                    const href = caseLink.getAttribute('href') || '';
                    const idMatch = href.match(/case_id=([^&]+)/i);
                    if (idMatch) caseId = decodeURIComponent(idMatch[1]);
                }

                entries.push({
                    caseNumber: caseNumber,
                    caseId: caseId || caseNumber,
                    caseName: caseName,
                    hearingDate: hearingDate,
                    hearingTime: currentTime,
                    hearingType: currentType,
                    bodyType: currentBodyType,
                    hearingResult: resultText || null,
                    hearingVote: extractVote(resultText),
                    nextAction: extractNextAction(resultText)
                });
            }
        }
    }

    return entries;
}

async function fetchCalendarMonth(year, month) {
    const url = `${CONFIG.CALENDAR_PROXY}?year=${year}&month=${month}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Calendar HTTP ${response.status}`);
    const html = await response.text();
    return parseCalendarHTML(html);
}

async function fetchAllCalendarData() {
    const months = getCalendarMonthRange();
    const results = await Promise.allSettled(
        months.map(m => fetchCalendarMonth(m.year, m.month))
    );

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    // If ALL fetches failed, propagate the error so the caller knows
    if (fulfilled.length === 0 && rejected.length > 0) {
        throw rejected[0].reason || new Error('All calendar fetches failed');
    }

    if (rejected.length > 0) {
        console.warn(`Calendar: ${rejected.length} of ${results.length} month fetches failed`);
    }

    return fulfilled.flatMap(r => r.value);
}

// ===== Data Normalization =====
function normalizeZoningCase(attrs) {
    const dateFiled = attrs.dateFiled ? new Date(attrs.dateFiled) : null;
    const caseNumber = attrs.Case_ID || '';

    const url = caseNumber
        ? `https://app.dcoz.dc.gov/Home/ViewCase?case_id=${encodeURIComponent(caseNumber)}`
        : '';

    return {
        id: caseNumber || `zc-${Math.random().toString(36).substr(2, 9)}`,
        caseNumber: caseNumber,
        caseType: attrs.Case_Type || 'ZC',
        caseTypeRelief: attrs.case_type_relief || attrs.reliefSought || '',
        address: attrs.Premise_Address || '',
        description: attrs.Description || '',
        existingZoning: attrs.existingZoning || '',
        requestedZoning: attrs.requestedZoning || '',
        ssl: attrs.SSL || '',
        url: url,
        anc: attrs.ANCSMD || '',
        status: null,
        dateFiled: dateFiled,
        source: 'layer46',
        hearingDate: null,
        hearingTime: null,
        hearingType: null,
        hearingResult: null,
        hearingVote: null,
        nextAction: null
    };
}

function normalizeDesignReviewCase(attrs) {
    const dateFiled = parseDRDate(attrs.DR_DateFiled);
    const caseNumber = attrs.DR_CaseNumber || '';

    let url = attrs.DR_URL;
    if (!url && caseNumber) {
        url = `https://app.dcoz.dc.gov/Home/ViewCase?case_id=${encodeURIComponent(caseNumber)}`;
    }

    return {
        id: caseNumber || `dr-${Math.random().toString(36).substr(2, 9)}`,
        caseNumber: caseNumber,
        caseType: 'ZC',
        caseTypeRelief: attrs.DR_CaseType || '',
        address: '',
        description: attrs.DR_Narrative || '',
        existingZoning: '',
        requestedZoning: '',
        ssl: '',
        url: url,
        anc: '',
        status: attrs.DR_Status || '',
        dateFiled: dateFiled,
        source: 'layer44',
        hearingDate: null,
        hearingTime: null,
        hearingType: null,
        hearingResult: null,
        hearingVote: null,
        nextAction: null
    };
}

// ===== Calendar Merge =====
function mergeCalendarData(cases, calendarEntries) {
    // Build lookup from case ID/number to calendar entries
    const calendarMap = new Map();
    for (const entry of calendarEntries) {
        const key = entry.caseId;
        if (!calendarMap.has(key)) {
            calendarMap.set(key, []);
        }
        calendarMap.get(key).push(entry);
        // Also index by caseNumber if different from caseId
        if (entry.caseNumber !== entry.caseId && !calendarMap.has(entry.caseNumber)) {
            calendarMap.set(entry.caseNumber, []);
        }
        if (entry.caseNumber !== entry.caseId) {
            calendarMap.get(entry.caseNumber).push(entry);
        }
    }

    let matchCount = 0;
    const matchedCaseIds = new Set();
    for (const c of cases) {
        const hearings = calendarMap.get(c.id) || calendarMap.get(c.caseNumber);
        if (hearings && hearings.length > 0) {
            // Only show future hearings — pick the soonest upcoming one
            const now = new Date();
            const future = hearings.filter(h => h.hearingDate > now);
            if (future.length === 0) continue;
            const next = future.sort((a, b) => a.hearingDate - b.hearingDate)[0];
            c.hearingDate = next.hearingDate;
            c.hearingTime = next.hearingTime;
            c.hearingType = next.hearingType;
            c.hearingResult = next.hearingResult;
            c.hearingVote = next.hearingVote;
            c.nextAction = next.nextAction;
            matchCount++;
            // Track all caseIds that matched
            for (const h of hearings) {
                matchedCaseIds.add(h.caseId);
            }
        }
    }

    // Log unmatched calendar entries for investigation
    const unmatched = calendarEntries.filter(e => !matchedCaseIds.has(e.caseId));
    if (unmatched.length > 0) {
        console.log(`Calendar merge: ${matchCount} matched, ${unmatched.length} unmatched entries:`);
        console.table(unmatched.map(e => ({
            caseId: e.caseId,
            caseNumber: e.caseNumber,
            hearingDate: e.hearingDate?.toLocaleDateString() || 'N/A',
            bodyType: e.bodyType,
            hearingType: e.hearingType
        })));
    }

    return matchCount;
}

// ===== Data Loading =====
async function loadAllCases() {
    AppState.loading = true;
    AppState.error = null;
    showLoadingState();

    try {
        const [zoningCases, drCases, calendarResult] = await Promise.all([
            fetchZoningCases(),
            fetchDesignReviewCases(),
            fetchAllCalendarData()
                .then(data => ({ ok: true, data }))
                .catch(err => ({ ok: false, error: err }))
        ]);

        AppState.cases = [...zoningCases, ...drCases];

        if (calendarResult.ok) {
            AppState.calendarAvailable = true;
            AppState.calendarData = calendarResult.data;
            AppState.calendarError = null;
            const matchCount = mergeCalendarData(AppState.cases, calendarResult.data);
            console.log(`Calendar: ${calendarResult.data.length} entries, ${matchCount} matched to cases`);
        } else {
            AppState.calendarAvailable = false;
            AppState.calendarData = [];
            AppState.calendarError = calendarResult.error.message;
            console.warn('Calendar data unavailable:', calendarResult.error);
        }

        applyFiltersAndSort();
        hideLoadingState();
        renderResults();
        renderCalendarStatus();
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

    // Hearing date range filter
    if (AppState.filters.dateFrom) {
        results = results.filter(c => c.hearingDate && c.hearingDate >= AppState.filters.dateFrom);
    }
    if (AppState.filters.dateTo) {
        const endOfDay = new Date(AppState.filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        results = results.filter(c => c.hearingDate && c.hearingDate <= endOfDay);
    }

    // Case type filter
    if (AppState.filters.caseTypes.length > 0 && AppState.filters.caseTypes.length < 2) {
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
            (c.anc && c.anc.toLowerCase().includes(search)) ||
            (c.hearingType && c.hearingType.toLowerCase().includes(search)) ||
            (c.hearingResult && c.hearingResult.toLowerCase().includes(search)) ||
            (c.nextAction && c.nextAction.toLowerCase().includes(search)) ||
            (c.caseName && c.caseName.toLowerCase().includes(search))
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
function getHearingBadgeClass(c) {
    if (!c.hearingDate) return '';
    return 'hearing-upcoming';
}

function renderCalendarStatus() {
    const el = document.getElementById('calendar-status');
    if (AppState.calendarAvailable === null) {
        el.classList.add('hidden');
        return;
    }

    el.classList.remove('hidden');
    if (AppState.calendarAvailable) {
        const matched = AppState.cases.filter(c => c.hearingDate).length;
        el.className = 'calendar-status calendar-ok';
        el.textContent = matched > 0
            ? `Calendar: ${AppState.calendarData.length} hearings loaded, ${matched} matched to cases`
            : `Calendar loaded, no matching hearings found in current date range`;
    } else {
        el.className = 'calendar-status calendar-warn';
        el.textContent = 'Hearing dates unavailable (calendar could not be reached)';
    }
}

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
            <td>${escapeHtml(c.address || '-')}</td>
            <td>${escapeHtml(c.caseTypeRelief || '-')}</td>
            <td>${escapeHtml(c.anc || '-')}</td>
            <td>${c.hearingDate
                ? `<span class="hearing-badge ${getHearingBadgeClass(c)}">${formatDate(c.hearingDate)}</span>`
                : '-'}</td>
            <td>${escapeHtml(c.hearingType || '-')}</td>
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
                </div>
                <span class="case-type-badge ${c.caseType.toLowerCase()}">
                    ${c.caseType}
                </span>
            </div>
            ${c.address ? `<div class="case-address">${escapeHtml(c.address)}</div>` : ''}
            ${c.caseTypeRelief ? `<div class="case-relief">${escapeHtml(c.caseTypeRelief)}</div>` : ''}
            ${c.description ? `<div class="case-description">${escapeHtml(truncateText(c.description, 150))}</div>` : ''}
            ${c.anc ? `<div class="case-anc">ANC: ${escapeHtml(c.anc)}</div>` : ''}
            ${c.hearingDate ? `
                <div class="case-hearing">
                    <span class="hearing-badge ${getHearingBadgeClass(c)}">
                        ${c.hearingType ? escapeHtml(c.hearingType) : 'Hearing'}: ${formatDate(c.hearingDate)}${c.hearingTime ? ' at ' + escapeHtml(c.hearingTime) : ''}
                    </span>
                    ${c.hearingResult ? `<span class="hearing-result">${escapeHtml(c.hearingResult)}</span>` : ''}
                </div>
            ` : ''}
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
${caseData.anc ? `<dt>ANC/SMD</dt><dd>${escapeHtml(caseData.anc)}</dd>` : ''}
                ${caseData.ssl ? `<dt>SSL</dt><dd><a href="https://maps.dcoz.dc.gov/" target="_blank" rel="noopener">${escapeHtml(caseData.ssl)}</a></dd>` : ''}
                ${caseData.status ? `<dt>Status</dt><dd>${escapeHtml(caseData.status)}</dd>` : ''}
            </dl>
        </div>

        ${caseData.hearingDate ? `
            <div class="detail-section">
                <h3>Hearing Information</h3>
                <dl class="detail-list">
                    <dt>Hearing Date</dt><dd>${formatDate(caseData.hearingDate)}</dd>
                    ${caseData.hearingTime ? `<dt>Time</dt><dd>${escapeHtml(caseData.hearingTime)}</dd>` : ''}
                    ${caseData.hearingType ? `<dt>Type</dt><dd>${escapeHtml(caseData.hearingType)}</dd>` : ''}
                    ${caseData.hearingResult ? `<dt>Result</dt><dd>${escapeHtml(caseData.hearingResult)}</dd>` : ''}
                    ${caseData.hearingVote ? `<dt>Vote</dt><dd>${escapeHtml(caseData.hearingVote)}</dd>` : ''}
                    ${caseData.nextAction ? `<dt>Next Action</dt><dd>${escapeHtml(caseData.nextAction)}</dd>` : ''}
                </dl>
            </div>
        ` : ''}

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
        applyFiltersAndSort();
        renderResults();
    });

    document.getElementById('date-to').addEventListener('change', (e) => {
        AppState.filters.dateTo = e.target.value ? new Date(e.target.value + 'T00:00:00') : null;
        applyFiltersAndSort();
        renderResults();
    });

    // Clear date range
    document.getElementById('date-clear').addEventListener('click', () => {
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
        AppState.filters.dateFrom = null;
        AppState.filters.dateTo = null;
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
    // No defaults — all cases show on initial load
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
