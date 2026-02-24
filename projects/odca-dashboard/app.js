// ODCA Audit Recommendations Dashboard — app.js

// ===== Configuration =====
const CONFIG = {
    STORAGE_KEYS: {
        VIEW_MODE:   'odca_dashboard_view',
        SAVED:       'odca_dashboard_saved',      // legacy key (migration only)
        NOTES:       'odca_dashboard_notes',
        SAVE_LISTS:  'odca_dashboard_save_lists'
    }
};

// ===== Agency Names (TODO 3) =====
const AGENCY_NAMES = {
    "CFSA":  "Child and Family Services Agency",
    "DBH":   "Dept of Behavioral Health",
    "DCPS":  "DC Public Schools",
    "DFS":   "Dept of Forensic Sciences",
    "DGS":   "Dept of General Services",
    "DHCD":  "Dept of Housing and Community Development",
    "DHS":   "Dept of Human Services",
    "DOC":   "Dept of Corrections",
    "DOH":   "Dept of Health",
    "DOES":  "Dept of Employment Services",
    "DPR":   "Dept of Parks and Recreation",
    "DPW":   "Dept of Public Works",
    "DYRS":  "Dept of Youth Rehabilitation Services",
    "DDOT":  "DC Dept of Transportation",
    "OANC":  "Office of Advisory Neighborhood Commissions",
    "OAG":   "Office of the Attorney General",
    "OCA":   "Office of the City Administrator",
    "OCP":   "Office of Contracting and Procurement",
    "OCFO":  "Office of the Chief Financial Officer",
    "OCTO":  "Office of the Chief Technology Officer",
    "OPC PCB": "Office of Police Complaints",
    "VZO":   "Vision Zero Office",
    "MPD":   "Metropolitan Police Dept",
    "DC Council - JPS":     "DC Council Committee on Judiciary & Public Safety",
    "DC Council - TE":      "DC Council Committee on Transportation & Environment",
    "DC Council - YA":      "DC Council Committee on Youth Affairs",
    "DC Council - Health":  "DC Council Committee on Health",
    "DC Council - Housing": "DC Council Committee on Housing",
    "DC Council - PWO":     "DC Council Committee on Public Works & Operations",
};

function agencyDisplayName(agency) {
    if (!agency) return '';
    if (agency.includes('\n')) {
        return agency.split('\n').map(a => AGENCY_NAMES[a.trim()] || a.trim()).join(' / ');
    }
    return AGENCY_NAMES[agency] || agency;
}

// ===== Application State =====
const AppState = {
    recommendations: [],  // all from ODCA_DATA
    filtered: [],
    filters: {
        searchText: '',
        agencies: new Set(),
        statuses: new Set(),
        reports: new Set(),
        dateFrom: '',
        dateTo: '',
        savedOnly: false
    },
    sortBy: 'report_date',
    sortDir: 'desc',
    viewMode: 'reports',
    scorecardSort: { by: 'pct', dir: 'desc' },
    expandedScorecardAgencies: new Set(),  // agency strings (TODO 1)
    expandedScorecardReports: new Set(),   // "agency||reportName" strings (TODO 1)
    selectedRec: null,
    notes: {},
    saveLists: { 'Default': new Set() },
    currentListName: 'Default',
    saved: new Set()  // live reference to saveLists[currentListName]
};

// ===== Utility Functions =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
}

function statusBadgeClass(status) {
    if (!status) return 'no-info';
    const s = status.toLowerCase();
    if (s === 'implemented') return 'implemented';
    if (s === 'in progress') return 'in-progress';
    if (s === 'not yet started') return 'not-started';
    if (s.startsWith('no action')) return 'no-action';
    if (s.startsWith('no information')) return 'no-info';
    return 'no-info';
}

function statusBadgeLabel(status) {
    if (!status) return 'Unknown';
    const s = status.toLowerCase();
    if (s.startsWith('no action')) return 'No action intended';
    if (s.startsWith('no information')) return 'No info available';
    return status;
}

function statusBadgeHtml(status) {
    const cls = statusBadgeClass(status);
    const label = statusBadgeLabel(status);
    return `<span class="status-badge ${cls}">${escapeHtml(label)}</span>`;
}

// ===== Multi-Select Helpers =====
function buildMultiSelect(containerId, options) {
    const container = document.getElementById(containerId);
    const dropdown = container.querySelector('.multi-select-dropdown');
    dropdown.innerHTML = options.map(opt => `
        <label class="multi-select-option">
            <input type="checkbox" value="${escapeHtml(opt.value)}">
            <span>${escapeHtml(opt.label)}</span>
        </label>
    `).join('');
}

function getMultiSelectValues(containerId) {
    const container = document.getElementById(containerId);
    const checked = new Set();
    container.querySelectorAll('.multi-select-dropdown input[type="checkbox"]:checked').forEach(cb => {
        checked.add(cb.value);
    });
    return checked;
}

function clearMultiSelect(containerId) {
    const container = document.getElementById(containerId);
    container.querySelectorAll('.multi-select-dropdown input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
}

// TODO 3: for single-selection, read label from <span> sibling and strip count suffix
function updateMultiSelectTrigger(containerId, defaultLabel) {
    const container = document.getElementById(containerId);
    const trigger = container.querySelector('.multi-select-trigger');
    const checked = getMultiSelectValues(containerId);
    if (checked.size === 0) {
        trigger.textContent = defaultLabel;
    } else if (checked.size === 1) {
        const cb = container.querySelector('.multi-select-dropdown input:checked');
        trigger.textContent = cb
            ? cb.parentElement.querySelector('span').textContent.replace(/\s*\(\d+\)$/, '')
            : [...checked][0];
    } else {
        trigger.textContent = `${checked.size} selected`;
    }
}

// TODO 5: restore multi-select checkboxes from a Set of values
function restoreMultiSelect(containerId, values, defaultLabel) {
    const container = document.getElementById(containerId);
    container.querySelectorAll('.multi-select-dropdown input[type="checkbox"]').forEach(cb => {
        cb.checked = values.has(cb.value);
    });
    updateMultiSelectTrigger(containerId, defaultLabel);
}

function closeAllDropdowns() {
    document.querySelectorAll('.multi-select-dropdown').forEach(d => d.classList.add('hidden'));
    document.querySelectorAll('.multi-select').forEach(m => m.classList.remove('open'));
}

// ===== Data Initialization =====
function initData() {
    if (typeof ODCA_DATA === 'undefined' || ODCA_DATA.length === 0) {
        document.getElementById('no-data-state').classList.remove('hidden');
        document.getElementById('results-summary').classList.add('hidden');
        return false;
    }

    AppState.recommendations = ODCA_DATA.map(r => ({
        ...r,
        _date: r.report_date ? new Date(r.report_date + 'T00:00:00') : null
    }));

    populateAgencyMultiSelect();
    populateReportMultiSelect();

    return true;
}

// TODO 3 + 4: full agency names with rec counts
function populateAgencyMultiSelect() {
    const counts = new Map();
    AppState.recommendations.forEach(r => {
        if (r.agency) counts.set(r.agency, (counts.get(r.agency) || 0) + 1);
    });
    const agencies = [...counts.keys()].sort((a, b) => a.localeCompare(b));
    buildMultiSelect('agency-multi', agencies.map(a => ({
        value: a,
        label: `${agencyDisplayName(a)} (${counts.get(a)})`
    })));
}

// TODO 4: report names with rec counts
function populateReportMultiSelect() {
    const counts = new Map();
    AppState.recommendations.forEach(r => {
        if (r.report_name) counts.set(r.report_name, (counts.get(r.report_name) || 0) + 1);
    });
    const reports = [...counts.keys()].sort((a, b) => a.localeCompare(b));
    buildMultiSelect('report-multi', reports.map(name => ({
        value: name,
        label: `${name} (${counts.get(name)})`
    })));
}

// ===== Filter & Sort Logic =====
function applyFiltersAndSort() {
    let results = [...AppState.recommendations];

    if (AppState.filters.savedOnly) {
        results = results.filter(r => AppState.saved.has(r.id));
    }

    if (AppState.filters.agencies.size > 0) {
        results = results.filter(r => AppState.filters.agencies.has(r.agency));
    }

    if (AppState.filters.statuses.size > 0) {
        results = results.filter(r => AppState.filters.statuses.has(r.status));
    }

    if (AppState.filters.reports.size > 0) {
        results = results.filter(r => AppState.filters.reports.has(r.report_name));
    }

    if (AppState.filters.dateFrom) {
        results = results.filter(r => r.report_date && r.report_date >= AppState.filters.dateFrom);
    }

    if (AppState.filters.dateTo) {
        results = results.filter(r => r.report_date && r.report_date <= AppState.filters.dateTo);
    }

    if (AppState.filters.searchText) {
        const search = AppState.filters.searchText.toLowerCase();
        results = results.filter(r =>
            (r.recommendation && r.recommendation.toLowerCase().includes(search)) ||
            (r.notes_2026 && r.notes_2026.toLowerCase().includes(search)) ||
            (r.report_name && r.report_name.toLowerCase().includes(search)) ||
            (r.agency && r.agency.toLowerCase().includes(search))
        );
    }

    results.sort((a, b) => {
        let valA, valB;

        if (AppState.sortBy === 'report_date') {
            valA = a._date ? a._date.getTime() : -Infinity;
            valB = b._date ? b._date.getTime() : -Infinity;
        } else if (AppState.sortBy === 'rec_no') {
            valA = a.rec_no;
            valB = b.rec_no;
        } else {
            valA = a[AppState.sortBy];
            valB = b[AppState.sortBy];
        }

        if (valA == null && valB == null) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;

        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        } else {
            comparison = String(valA).localeCompare(String(valB));
        }

        return AppState.sortDir === 'desc' ? -comparison : comparison;
    });

    AppState.filtered = results;
}

// ===== Rendering =====
function renderResults() {
    updateResultsSummary();

    const allViews = ['table-view', 'report-view', 'scorecard-view', 'chart-view', 'empty-state'];
    allViews.forEach(id => document.getElementById(id).classList.add('hidden'));

    if (AppState.filtered.length === 0 && AppState.viewMode !== 'scorecard' && AppState.viewMode !== 'charts') {
        document.getElementById('empty-state').classList.remove('hidden');
        serializeHash();  // TODO 5
        return;
    }

    const viewMap = {
        table: 'table-view',
        reports: 'report-view',
        scorecard: 'scorecard-view',
        charts: 'chart-view'
    };
    const viewId = viewMap[AppState.viewMode] || 'report-view';
    document.getElementById(viewId).classList.remove('hidden');

    if (AppState.viewMode === 'table') renderTableView();
    else if (AppState.viewMode === 'reports') renderReportView();
    else if (AppState.viewMode === 'scorecard') renderScorecardView();
    else if (AppState.viewMode === 'charts') renderChartView();

    serializeHash();  // TODO 5
}

function updateResultsSummary() {
    const count = AppState.filtered.length;
    const total = AppState.recommendations.length;
    const countText = count === total
        ? `Showing ${count} recommendation${count !== 1 ? 's' : ''}`
        : `Showing ${count} of ${total} recommendations`;
    document.querySelector('.results-count').textContent = countText;
    renderActiveFilters();
    updateSavedButton();
}

function renderActiveFilters() {
    const container = document.getElementById('active-filters');
    const chips = [];

    if (AppState.filters.searchText) {
        chips.push(`<span class="filter-chip">Search: "${escapeHtml(truncateText(AppState.filters.searchText, 20))}" <span class="remove" data-filter="search">&times;</span></span>`);
    }
    if (AppState.filters.agencies.size > 0) {
        // TODO 3: show full agency name in chip
        const label = AppState.filters.agencies.size === 1
            ? escapeHtml(agencyDisplayName([...AppState.filters.agencies][0]))
            : `${AppState.filters.agencies.size} selected`;
        chips.push(`<span class="filter-chip">Agency: ${label} <span class="remove" data-filter="agencies">&times;</span></span>`);
    }
    if (AppState.filters.statuses.size > 0) {
        const label = AppState.filters.statuses.size === 1
            ? escapeHtml(statusBadgeLabel([...AppState.filters.statuses][0]))
            : `${AppState.filters.statuses.size} selected`;
        chips.push(`<span class="filter-chip">Status: ${label} <span class="remove" data-filter="statuses">&times;</span></span>`);
    }
    if (AppState.filters.reports.size > 0) {
        const label = AppState.filters.reports.size === 1
            ? escapeHtml(truncateText([...AppState.filters.reports][0], 30))
            : `${AppState.filters.reports.size} selected`;
        chips.push(`<span class="filter-chip">Report: ${label} <span class="remove" data-filter="reports">&times;</span></span>`);
    }
    if (AppState.filters.dateFrom) {
        chips.push(`<span class="filter-chip">From: ${escapeHtml(formatDate(AppState.filters.dateFrom))} <span class="remove" data-filter="dateFrom">&times;</span></span>`);
    }
    if (AppState.filters.dateTo) {
        chips.push(`<span class="filter-chip">To: ${escapeHtml(formatDate(AppState.filters.dateTo))} <span class="remove" data-filter="dateTo">&times;</span></span>`);
    }

    container.innerHTML = chips.join('');

    container.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const filter = e.target.dataset.filter;
            if (filter === 'search') {
                AppState.filters.searchText = '';
                document.getElementById('search-input').value = '';
            } else if (filter === 'agencies') {
                AppState.filters.agencies = new Set();
                clearMultiSelect('agency-multi');
                updateMultiSelectTrigger('agency-multi', 'All Agencies');
            } else if (filter === 'statuses') {
                AppState.filters.statuses = new Set();
                clearMultiSelect('status-multi');
                updateMultiSelectTrigger('status-multi', 'All Statuses');
            } else if (filter === 'reports') {
                AppState.filters.reports = new Set();
                clearMultiSelect('report-multi');
                updateMultiSelectTrigger('report-multi', 'All Reports');
            } else if (filter === 'dateFrom') {
                AppState.filters.dateFrom = '';
                document.getElementById('date-from-input').value = '';
            } else if (filter === 'dateTo') {
                AppState.filters.dateTo = '';
                document.getElementById('date-to-input').value = '';
            }
            applyFiltersAndSort();
            renderResults();
        });
    });
}

// TODO 3: agency td shows full name
function renderTableView() {
    const tbody = document.getElementById('table-body');

    tbody.innerHTML = AppState.filtered.map(r => {
        const isSaved = AppState.saved.has(r.id);
        const hasNote = !!AppState.notes[r.id];
        const reportNameHtml = r.report_url
            ? `<a href="${escapeHtml(r.report_url)}" target="_blank" rel="noopener" class="report-name-link">${escapeHtml(r.report_name || '-')}</a>`
            : escapeHtml(r.report_name || '-');
        return `
        <tr data-rec-id="${escapeHtml(r.id)}">
            <td class="col-save" data-save-cell>
                <input type="checkbox" data-rec-id="${escapeHtml(r.id)}" ${isSaved ? 'checked' : ''} title="Save recommendation" aria-label="Save">
                ${hasNote ? '<span class="note-dot" title="Has personal note"></span>' : ''}
            </td>
            <td>${escapeHtml(agencyDisplayName(r.agency) || '-')}</td>
            <td>${r.rec_no || '-'}</td>
            <td class="report-name-cell" title="${escapeHtml(r.report_name || '')}">${reportNameHtml}</td>
            <td>${formatDate(r.report_date)}</td>
            <td>${statusBadgeHtml(r.status)}</td>
        </tr>
        `;
    }).join('');

    attachTableEventListeners();
}

// TODO 2: agencies line in header; TODO 3: full agency names in body
function renderReportView() {
    const container = document.getElementById('report-view');

    // Group by report_name
    const groups = new Map();
    AppState.filtered.forEach(r => {
        const key = r.report_name || '';
        if (!groups.has(key)) {
            groups.set(key, { recs: [], report_url: r.report_url, report_date: r.report_date });
        }
        groups.get(key).recs.push(r);
    });

    // Sort groups by date desc
    const sorted = [...groups.entries()].sort((a, b) => {
        const da = a[1].report_date || '';
        const db = b[1].report_date || '';
        return db.localeCompare(da);
    });

    if (sorted.length === 0) {
        container.innerHTML = '<p style="padding:60px 20px;text-align:center;color:var(--text-color)">No reports match your filters.</p>';
        return;
    }

    // Full stats from all recs (unaffected by filters)
    const allReportStats = new Map();
    AppState.recommendations.forEach(r => {
        const key = r.report_name || '';
        if (!allReportStats.has(key)) allReportStats.set(key, { total: 0, implemented: 0 });
        const s = allReportStats.get(key);
        s.total++;
        if (r.status === 'Implemented') s.implemented++;
    });

    container.innerHTML = sorted.map(([name, group]) => {
        const stats = allReportStats.get(name) || { total: 0, implemented: 0 };
        const total = stats.total;
        const implemented = stats.implemented;
        const pct = total > 0 ? Math.round((implemented / total) * 100) : 0;

        const nameHtml = group.report_url
            ? `<a href="${escapeHtml(group.report_url)}" target="_blank" rel="noopener" class="report-accordion-link">${escapeHtml(name)}</a>`
            : escapeHtml(name);

        // TODO 2: unique agencies for this report
        const agencies = [...new Set(group.recs.map(r => r.agency).filter(Boolean))]
            .map(agencyDisplayName).join(' · ');

        const bodyHtml = group.recs.map(r => `
            <tr>
                <td>${escapeHtml(agencyDisplayName(r.agency) || '-')}</td>
                <td>${r.rec_no || '-'}</td>
                <td>${statusBadgeHtml(r.status)}</td>
                <td class="rec-text-cell">${escapeHtml(truncateText(r.recommendation, 140) || '')}</td>
            </tr>
        `).join('');

        const summary = (typeof REPORT_SUMMARIES !== 'undefined' && REPORT_SUMMARIES[name])
            ? `<div class="report-summary">${escapeHtml(REPORT_SUMMARIES[name])}</div>`
            : '';

        return `
        <div class="report-accordion-item">
            <div class="report-accordion-header">
                <div class="report-accordion-info">
                    <div class="report-accordion-name">${nameHtml}</div>
                    <div class="report-accordion-date">${formatDate(group.report_date)}</div>
                    ${agencies ? `<div class="report-accordion-agencies">${escapeHtml(agencies)}</div>` : ''}
                </div>
                <div class="report-accordion-stats">
                    <span class="report-stats-text">${implemented}/${total} implemented</span>
                    <div class="report-progress-bar-bg">
                        <div class="report-progress-bar-fill" style="width:${pct}%"></div>
                    </div>
                    <span class="report-accordion-chevron">&#9660;</span>
                </div>
            </div>
            <div class="report-accordion-body">
                ${summary}
                <table class="report-recs-table">
                    <thead>
                        <tr>
                            <th>Agency</th>
                            <th>Rec #</th>
                            <th>Status</th>
                            <th>Recommendation</th>
                        </tr>
                    </thead>
                    <tbody>${bodyHtml}</tbody>
                </table>
            </div>
        </div>
        `;
    }).join('');

    // Attach toggle listeners
    container.querySelectorAll('.report-accordion-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.closest('.report-accordion-link')) return;
            const item = header.closest('.report-accordion-item');
            item.classList.toggle('expanded');
        });
    });
}

// TODO 1: helper — build nested report accordion HTML for a set of recs
function buildReportAccordionHtml(recs, agencyKey) {
    const groups = new Map();
    recs.forEach(r => {
        const key = r.report_name || '';
        if (!groups.has(key)) {
            groups.set(key, { recs: [], report_url: r.report_url, report_date: r.report_date });
        }
        groups.get(key).recs.push(r);
    });

    const sorted = [...groups.entries()].sort((a, b) => {
        const da = a[1].report_date || '';
        const db = b[1].report_date || '';
        return db.localeCompare(da);
    });

    // Full stats from all recs (unaffected by filters)
    const allReportStats = new Map();
    AppState.recommendations.forEach(r => {
        const key = r.report_name || '';
        if (!allReportStats.has(key)) allReportStats.set(key, { total: 0, implemented: 0 });
        const s = allReportStats.get(key);
        s.total++;
        if (r.status === 'Implemented') s.implemented++;
    });

    return sorted.map(([name, group]) => {
        const stats = allReportStats.get(name) || { total: 0, implemented: 0 };
        const total = stats.total;
        const implemented = stats.implemented;
        const pct = total > 0 ? Math.round((implemented / total) * 100) : 0;

        const nameHtml = group.report_url
            ? `<a href="${escapeHtml(group.report_url)}" target="_blank" rel="noopener" class="report-accordion-link">${escapeHtml(name)}</a>`
            : escapeHtml(name);

        const bodyHtml = group.recs.map(r => `
            <tr>
                <td>${r.rec_no || '-'}</td>
                <td>${statusBadgeHtml(r.status)}</td>
                <td class="rec-text-cell">${escapeHtml(truncateText(r.recommendation, 140) || '')}</td>
            </tr>
        `).join('');

        const stateKey = `${agencyKey}||${name}`;
        const isExpanded = AppState.expandedScorecardReports.has(stateKey);

        const summary = (typeof REPORT_SUMMARIES !== 'undefined' && REPORT_SUMMARIES[name])
            ? `<div class="report-summary">${escapeHtml(REPORT_SUMMARIES[name])}</div>`
            : '';

        return `
        <div class="report-accordion-item${isExpanded ? ' expanded' : ''}" data-agency="${escapeHtml(agencyKey)}" data-report-name="${escapeHtml(name)}">
            <div class="report-accordion-header">
                <div class="report-accordion-info">
                    <div class="report-accordion-name">${nameHtml}</div>
                    <div class="report-accordion-date">${formatDate(group.report_date)}</div>
                </div>
                <div class="report-accordion-stats">
                    <span class="report-stats-text">${implemented}/${total} implemented</span>
                    <div class="report-progress-bar-bg">
                        <div class="report-progress-bar-fill" style="width:${pct}%"></div>
                    </div>
                    <span class="report-accordion-chevron">&#9660;</span>
                </div>
            </div>
            <div class="report-accordion-body">
                ${summary}
                <table class="report-recs-table">
                    <thead>
                        <tr>
                            <th>Rec #</th>
                            <th>Status</th>
                            <th>Recommendation</th>
                        </tr>
                    </thead>
                    <tbody>${bodyHtml}</tbody>
                </table>
            </div>
        </div>
        `;
    }).join('');
}

// TODO 1: scorecard with expandable agency rows + nested report accordion
function renderScorecardView() {
    const container = document.getElementById('scorecard-view');

    const STATUS_IMPLEMENTED = 'Implemented';
    const STATUS_IN_PROGRESS = 'In progress';
    const STATUS_NOT_STARTED = 'Not yet started';
    const STATUS_NO_ACTION = 'No action intended \u2013 management accepts the risk';
    const STATUS_NO_INFO = 'No information available';

    // Group by agency — include recs array for nested accordion
    const agencyMap = new Map();
    AppState.filtered.forEach(r => {
        const agency = r.agency || 'Unknown';
        if (!agencyMap.has(agency)) {
            agencyMap.set(agency, { total: 0, implemented: 0, inProgress: 0, notStarted: 0, noAction: 0, noInfo: 0, recs: [] });
        }
        const counts = agencyMap.get(agency);
        counts.total++;
        counts.recs.push(r);
        if (r.status === STATUS_IMPLEMENTED) counts.implemented++;
        else if (r.status === STATUS_IN_PROGRESS) counts.inProgress++;
        else if (r.status === STATUS_NOT_STARTED) counts.notStarted++;
        else if (r.status === STATUS_NO_ACTION) counts.noAction++;
        else if (r.status === STATUS_NO_INFO) counts.noInfo++;
    });

    // Full stats from all recs (unaffected by filters) — used for % Done
    const allAgencyStats = new Map();
    AppState.recommendations.forEach(r => {
        const agency = r.agency || 'Unknown';
        if (!allAgencyStats.has(agency)) allAgencyStats.set(agency, { total: 0, implemented: 0 });
        const s = allAgencyStats.get(agency);
        s.total++;
        if (r.status === 'Implemented') s.implemented++;
    });

    let rows = [...agencyMap.entries()].map(([agency, counts]) => {
        const agStats = allAgencyStats.get(agency) || { total: 0, implemented: 0 };
        return {
            agency,
            ...counts,
            pct: agStats.total > 0 ? (agStats.implemented / agStats.total) : 0
        };
    });

    const { by, dir } = AppState.scorecardSort;
    rows.sort((a, b) => {
        let valA = a[by], valB = b[by];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return dir === 'asc' ? -1 : 1;
        if (valA > valB) return dir === 'asc' ? 1 : -1;
        return b.total - a.total;
    });

    if (rows.length === 0) {
        container.innerHTML = '<p style="padding:60px 20px;text-align:center;color:var(--text-color)">No data matches your filters.</p>';
        return;
    }

    const cols = [
        { key: 'agency',      label: 'Agency' },
        { key: 'total',       label: 'Total' },
        { key: 'implemented', label: 'Implemented' },
        { key: 'inProgress',  label: 'In Progress' },
        { key: 'notStarted',  label: 'Not Started' },
        { key: 'noAction',    label: 'No Action' },
        { key: 'noInfo',      label: 'No Info' },
        { key: 'pct',         label: '% Done' }
    ];

    const headerHtml = cols.map(col => {
        const isActive = AppState.scorecardSort.by === col.key;
        const descClass = isActive && AppState.scorecardSort.dir === 'desc' ? ' sort-desc' : '';
        return `<th class="sortable${isActive ? ' sort-active' : ''}${descClass}" data-sort="${col.key}">${col.label}</th>`;
    }).join('');

    const bodyHtml = rows.map(row => {
        const pctDisplay = Math.round(row.pct * 100);
        const barHtml = `
            <div class="scorecard-bar-cell">
                <span class="scorecard-pct-text">${pctDisplay}%</span>
                <div class="scorecard-bar-bg">
                    <div class="scorecard-bar-fill" style="width:${pctDisplay}%"></div>
                </div>
            </div>`;

        const isAgencyExpanded = AppState.expandedScorecardAgencies.has(row.agency);
        const chevronRotate = isAgencyExpanded ? ' style="transform:rotate(90deg)"' : '';

        const agencyRow = `
        <tr class="scorecard-agency-row" data-agency="${escapeHtml(row.agency)}" style="cursor:pointer">
            <td><span class="scorecard-expand-chevron"${chevronRotate}>&#9654;</span> ${escapeHtml(agencyDisplayName(row.agency))}</td>
            <td>${row.total}</td>
            <td>${row.implemented}</td>
            <td>${row.inProgress}</td>
            <td>${row.notStarted}</td>
            <td>${row.noAction}</td>
            <td>${row.noInfo}</td>
            <td>${barHtml}</td>
        </tr>`;

        const detailHtml = buildReportAccordionHtml(row.recs, row.agency);
        const detailRow = `
        <tr class="scorecard-detail-row${isAgencyExpanded ? ' expanded' : ''}" data-detail-agency="${escapeHtml(row.agency)}">
            <td colspan="8" class="scorecard-detail-cell">${detailHtml}</td>
        </tr>`;

        return agencyRow + detailRow;
    }).join('');

    container.innerHTML = `
    <div class="table-container">
        <table class="cases-table scorecard-table">
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${bodyHtml}</tbody>
        </table>
    </div>`;

    // Sort listeners
    container.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortBy = th.dataset.sort;
            if (AppState.scorecardSort.by === sortBy) {
                AppState.scorecardSort.dir = AppState.scorecardSort.dir === 'asc' ? 'desc' : 'asc';
            } else {
                AppState.scorecardSort.by = sortBy;
                AppState.scorecardSort.dir = sortBy === 'agency' ? 'asc' : 'desc';
            }
            renderScorecardView();
        });
    });

    // Agency row toggle — expand/collapse nested report accordion
    container.querySelectorAll('.scorecard-agency-row').forEach(agRow => {
        agRow.addEventListener('click', () => {
            const agency = agRow.dataset.agency;
            const detailRow = container.querySelector(`.scorecard-detail-row[data-detail-agency="${CSS.escape(agency)}"]`);
            const chevron = agRow.querySelector('.scorecard-expand-chevron');
            if (AppState.expandedScorecardAgencies.has(agency)) {
                AppState.expandedScorecardAgencies.delete(agency);
                detailRow.classList.remove('expanded');
                chevron.style.transform = '';
            } else {
                AppState.expandedScorecardAgencies.add(agency);
                detailRow.classList.add('expanded');
                chevron.style.transform = 'rotate(90deg)';
            }
        });
    });

    // Nested report accordion headers inside scorecard detail cells
    container.querySelectorAll('.scorecard-detail-cell .report-accordion-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.closest('.report-accordion-link')) return;
            const item = header.closest('.report-accordion-item');
            const agency = item.dataset.agency;
            const reportName = item.dataset.reportName;
            const key = `${agency}||${reportName}`;
            if (AppState.expandedScorecardReports.has(key)) {
                AppState.expandedScorecardReports.delete(key);
                item.classList.remove('expanded');
            } else {
                AppState.expandedScorecardReports.add(key);
                item.classList.add('expanded');
            }
        });
    });
}

// ===== Charts View =====
const CHART_STATUS_ORDER = [
    'Implemented',
    'In progress',
    'Not yet started',
    'No action intended \u2013 management accepts the risk',
    'No information available'
];

const CHART_STATUS_LABELS = {
    'Implemented': 'Implemented',
    'In progress': 'In progress',
    'Not yet started': 'Not yet started',
    'No action intended \u2013 management accepts the risk': 'No action intended',
    'No information available': 'No info available'
};

const CHART_COLORS = {
    'Implemented': '#22c55e',
    'In progress': '#3b82f6',
    'Not yet started': '#eab308',
    'No action intended \u2013 management accepts the risk': '#ef4444',
    'No information available': '#9ca3af'
};

function renderChartView() {
    const container = document.getElementById('chart-view');
    const recs = AppState.filtered;
    if (recs.length === 0) {
        container.innerHTML = '<p style="padding:60px 20px;text-align:center;color:var(--text-color)">No recommendations match your filters.</p>';
        return;
    }

    container.innerHTML = `
        <div class="charts-grid">
            <div class="chart-panel">
                <h3 class="chart-title">Status Distribution</h3>
                ${buildDonutChart(recs)}
            </div>
            <div class="chart-panel">
                <h3 class="chart-title">Implementation by Agency</h3>
                ${buildAgencyBars(recs)}
            </div>
        </div>
    `;
}

function buildDonutChart(recs) {
    const counts = {};
    CHART_STATUS_ORDER.forEach(s => { counts[s] = 0; });
    recs.forEach(r => {
        if (counts[r.status] !== undefined) counts[r.status]++;
        else counts['No information available']++;
    });

    const total = recs.length;
    const cx = 110, cy = 110, ro = 95, ri = 60;
    const TAU = 2 * Math.PI;

    // Check if all same status (full circle)
    const nonZero = CHART_STATUS_ORDER.filter(s => counts[s] > 0);
    let slicesHtml = '';

    if (nonZero.length === 1) {
        // Full donut rings — use two circles (outer minus inner)
        const color = CHART_COLORS[nonZero[0]];
        slicesHtml = `<circle cx="${cx}" cy="${cy}" r="${ro}" fill="${color}" />
<circle cx="${cx}" cy="${cy}" r="${ri}" fill="var(--background-color)" />`;
    } else {
        let startAngle = -Math.PI / 2;
        CHART_STATUS_ORDER.forEach(status => {
            const count = counts[status];
            if (count === 0) return;
            const sweep = (count / total) * TAU;
            const endAngle = startAngle + sweep;
            const x1 = cx + ro * Math.cos(startAngle);
            const y1 = cy + ro * Math.sin(startAngle);
            const x2 = cx + ro * Math.cos(endAngle);
            const y2 = cy + ro * Math.sin(endAngle);
            const x3 = cx + ri * Math.cos(endAngle);
            const y3 = cy + ri * Math.sin(endAngle);
            const x4 = cx + ri * Math.cos(startAngle);
            const y4 = cy + ri * Math.sin(startAngle);
            const la = sweep > Math.PI ? 1 : 0;
            const d = `M ${x1} ${y1} A ${ro} ${ro} 0 ${la} 1 ${x2} ${y2} L ${x3} ${y3} A ${ri} ${ri} 0 ${la} 0 ${x4} ${y4} Z`;
            slicesHtml += `<path d="${d}" fill="${CHART_COLORS[status]}" />`;
            startAngle = endAngle;
        });
    }

    const legendHtml = CHART_STATUS_ORDER.map(status => {
        const count = counts[status];
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return `
            <div class="chart-legend-item">
                <span class="chart-legend-dot" style="background:${CHART_COLORS[status]}"></span>
                <span>${escapeHtml(CHART_STATUS_LABELS[status])} — ${count} (${pct}%)</span>
            </div>`;
    }).join('');

    return `
        <svg class="donut-svg" viewBox="0 0 220 220" width="220" height="220" aria-hidden="true">
            ${slicesHtml}
            <text x="${cx}" y="${cy - 8}" text-anchor="middle" class="donut-center-text">${total}</text>
            <text x="${cx}" y="${cy + 14}" text-anchor="middle" class="donut-center-label">total</text>
        </svg>
        <div class="chart-legend">${legendHtml}</div>
    `;
}

function buildAgencyBars(recs) {
    const agencyMap = new Map();
    recs.forEach(r => {
        const agency = r.agency || 'Unknown';
        if (!agencyMap.has(agency)) agencyMap.set(agency, { total: 0, implemented: 0 });
        const s = agencyMap.get(agency);
        s.total++;
        if (r.status === 'Implemented') s.implemented++;
    });

    const rows = [...agencyMap.entries()]
        .map(([agency, s]) => ({
            agency,
            total: s.total,
            implemented: s.implemented,
            pct: s.total > 0 ? s.implemented / s.total : 0
        }))
        .sort((a, b) => b.pct - a.pct || b.total - a.total);

    const barsHtml = rows.map(row => {
        const pctDisplay = Math.round(row.pct * 100);
        return `
            <div class="agency-bar-row">
                <div class="agency-bar-name" title="${escapeHtml(agencyDisplayName(row.agency))}">${escapeHtml(agencyDisplayName(row.agency))}</div>
                <div class="agency-bar-bg">
                    <div class="agency-bar-fill" style="width:${pctDisplay}%"></div>
                </div>
                <div class="agency-bar-pct">${pctDisplay}%</div>
            </div>`;
    }).join('');

    return `<div class="agency-bar-list">${barsHtml}</div>`;
}

function findRec(id) {
    return AppState.recommendations.find(r => r.id === id);
}

// TODO 3: agency field shows full name
function renderDetailModal(r) {
    const modal = document.getElementById('detail-modal');
    const body = document.getElementById('modal-body');
    const isSaved = AppState.saved.has(r.id);

    const titleHtml = r.report_url
        ? `<a href="${escapeHtml(r.report_url)}" target="_blank" rel="noopener" class="report-name-link detail-report-link">${escapeHtml(r.report_name || 'Recommendation')}</a>`
        : escapeHtml(r.report_name || 'Recommendation');

    body.innerHTML = `
        <div class="detail-header">
            <h2>${titleHtml}</h2>
            ${statusBadgeHtml(r.status)}
        </div>

        <div class="modal-actions">
            <button class="modal-save-btn ${isSaved ? 'saved' : ''}" id="modal-save-btn" data-rec-id="${escapeHtml(r.id)}">
                ${isSaved ? '★ Saved' : '☆ Save'}
            </button>
            <button class="modal-copy-btn" id="modal-copy-btn">Copy</button>
        </div>

        <div class="detail-section">
            <h3>Details</h3>
            <dl class="detail-list">
                <dt>Agency</dt><dd>${escapeHtml(agencyDisplayName(r.agency) || '-')}</dd>
                <dt>Rec #</dt><dd>${r.rec_no || '-'}</dd>
                <dt>Report Date</dt><dd>${formatDate(r.report_date)}</dd>
            </dl>
        </div>

        ${(typeof REPORT_SUMMARIES !== 'undefined' && REPORT_SUMMARIES[r.report_name]) ? `
            <div class="detail-section">
                <h3>Report Summary</h3>
                <p class="detail-description">${escapeHtml(REPORT_SUMMARIES[r.report_name])}</p>
            </div>
        ` : ''}

        <div class="detail-section">
            <h3>Recommendation</h3>
            <p class="detail-description">${escapeHtml(r.recommendation || 'No recommendation text available.')}</p>
        </div>

        ${r.notes_2026 ? `
            <div class="detail-section">
                <h3>2026 Notes</h3>
                <p class="detail-description">${escapeHtml(r.notes_2026)}</p>
            </div>
        ` : ''}

        <div class="detail-section">
            <h3>Personal Note</h3>
            <textarea id="modal-notes-textarea" class="modal-notes-textarea" placeholder="Add a personal note..."></textarea>
        </div>
    `;

    // Set textarea value via .value (avoids HTML escaping issues)
    document.getElementById('modal-notes-textarea').value = AppState.notes[r.id] || '';

    modal.classList.remove('hidden');
    AppState.selectedRec = r;

    // Save button listener
    document.getElementById('modal-save-btn').addEventListener('click', () => {
        toggleSaved(r.id);
        const btn = document.getElementById('modal-save-btn');
        if (btn) {
            const saved = AppState.saved.has(r.id);
            btn.textContent = saved ? '★ Saved' : '☆ Save';
            btn.classList.toggle('saved', saved);
        }
    });

    // Copy button listener
    document.getElementById('modal-copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(r.recommendation || '').then(() => {
            const btn = document.getElementById('modal-copy-btn');
            if (btn) {
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
            }
        });
    });

    // Notes textarea — debounced auto-save
    let notesTimeout;
    document.getElementById('modal-notes-textarea').addEventListener('input', (e) => {
        clearTimeout(notesTimeout);
        notesTimeout = setTimeout(() => {
            const text = e.target.value;
            if (text.trim()) {
                AppState.notes[r.id] = text;
            } else {
                delete AppState.notes[r.id];
            }
            persistNotes();
            updateNoteDot(r.id);
        }, 500);
    });
}

function closeModal() {
    document.getElementById('detail-modal').classList.add('hidden');
    AppState.selectedRec = null;
}

// ===== Notes Feature =====
function loadNotes() {
    try {
        const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.NOTES);
        if (raw) AppState.notes = JSON.parse(raw);
    } catch (e) {
        AppState.notes = {};
    }
}

function persistNotes() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.NOTES, JSON.stringify(AppState.notes));
}

function updateNoteDot(id) {
    const hasNote = !!AppState.notes[id];

    // Table row save cell
    const saveCell = document.querySelector(`#table-body tr[data-rec-id="${CSS.escape(id)}"] [data-save-cell]`);
    if (saveCell) {
        let dot = saveCell.querySelector('.note-dot');
        if (hasNote && !dot) {
            dot = document.createElement('span');
            dot.className = 'note-dot';
            dot.title = 'Has personal note';
            saveCell.appendChild(dot);
        } else if (!hasNote && dot) {
            dot.remove();
        }
    }

}

// ===== Export CSV =====
function exportCsv() {
    const csvRow = (fields) => fields.map(f => {
        const s = f == null ? '' : String(f);
        return '"' + s.replace(/"/g, '""') + '"';
    }).join(',');

    const header = csvRow(['Agency', 'Rec #', 'Report Name', 'Report Date', 'Status', 'Recommendation', '2026 Notes', 'Personal Note']);
    const rows = AppState.filtered.map(r => csvRow([
        agencyDisplayName(r.agency),
        r.rec_no,
        r.report_name,
        r.report_date,
        r.status,
        r.recommendation,
        r.notes_2026,
        AppState.notes[r.id] || ''
    ]));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'odca-recommendations.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// ===== Save Feature =====
function toggleSaved(id) {
    if (AppState.saved.has(id)) {
        AppState.saved.delete(id);
    } else {
        AppState.saved.add(id);
    }
    persistSaved();
    updateSavedIndicators(id);
    updateSavedButton();
}

function updateSavedIndicators(id) {
    const isSaved = AppState.saved.has(id);

    const checkbox = document.querySelector(`#table-body input[data-rec-id="${CSS.escape(id)}"]`);
    if (checkbox) {
        checkbox.checked = isSaved;
    }

    if (AppState.filters.savedOnly && !isSaved) {
        applyFiltersAndSort();
        renderResults();
    }
}

function updateSavedButton() {
    const count = AppState.saved.size;
    const toggle = document.getElementById('saved-toggle');
    const clearBtn = document.getElementById('clear-saved');

    toggle.textContent = AppState.filters.savedOnly
        ? `Hide Saved (${count})`
        : `Show Saved (${count})`;
    toggle.classList.toggle('active', AppState.filters.savedOnly);

    clearBtn.classList.toggle('hidden', count === 0);
    updateSaveListSelector();
}

// ===== Named Save Lists =====
function updateSaveListSelector() {
    const select = document.getElementById('save-list-select');
    if (!select) return;
    select.innerHTML = Object.keys(AppState.saveLists).map(name =>
        `<option value="${escapeHtml(name)}"${name === AppState.currentListName ? ' selected' : ''}>${escapeHtml(name)}</option>`
    ).join('');

    const deleteBtn = document.getElementById('delete-list-btn');
    if (deleteBtn) {
        deleteBtn.classList.toggle('hidden', AppState.currentListName === 'Default');
    }
}

function switchSaveList(name) {
    if (!AppState.saveLists[name]) return;
    AppState.currentListName = name;
    AppState.saved = AppState.saveLists[name];
    applyFiltersAndSort();
    renderResults();
}

function createSaveList() {
    const name = prompt('Name for new save list:');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (AppState.saveLists[trimmed]) {
        alert(`A list named "${trimmed}" already exists.`);
        return;
    }
    AppState.saveLists[trimmed] = new Set();
    persistSaveLists();
    AppState.currentListName = trimmed;
    AppState.saved = AppState.saveLists[trimmed];
    updateSaveListSelector();
    applyFiltersAndSort();
    renderResults();
}

function deleteSaveList() {
    const name = AppState.currentListName;
    if (name === 'Default') return;
    if (!confirm(`Delete list "${name}"? This cannot be undone.`)) return;
    delete AppState.saveLists[name];
    persistSaveLists();
    AppState.currentListName = 'Default';
    AppState.saved = AppState.saveLists['Default'];
    updateSaveListSelector();
    if (AppState.filters.savedOnly) {
        applyFiltersAndSort();
        renderResults();
    } else {
        updateSavedButton();
    }
}

function persistSaved() {
    persistSaveLists();
}

function persistSaveLists() {
    const obj = {};
    for (const [name, set] of Object.entries(AppState.saveLists)) {
        obj[name] = [...set];
    }
    localStorage.setItem(CONFIG.STORAGE_KEYS.SAVE_LISTS, JSON.stringify(obj));
}

function loadSaveLists() {
    try {
        const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.SAVE_LISTS);
        if (raw) {
            const parsed = JSON.parse(raw);
            AppState.saveLists = {};
            for (const [name, ids] of Object.entries(parsed)) {
                AppState.saveLists[name] = new Set(ids);
            }
            if (!AppState.saveLists['Default']) {
                AppState.saveLists['Default'] = new Set();
            }
        } else {
            // Migration: read legacy saved key into Default list
            const legacyRaw = localStorage.getItem(CONFIG.STORAGE_KEYS.SAVED);
            if (legacyRaw) {
                AppState.saveLists['Default'] = new Set(JSON.parse(legacyRaw));
            }
        }
    } catch (e) {
        AppState.saveLists = { 'Default': new Set() };
    }
    AppState.currentListName = 'Default';
    AppState.saved = AppState.saveLists['Default'];
}

// ===== Event Listeners =====
function attachTableEventListeners() {
    document.querySelectorAll('#table-body tr').forEach(row => {
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                toggleSaved(e.target.dataset.recId);
            });
            const saveCell = row.querySelector('[data-save-cell]');
            if (saveCell) {
                saveCell.addEventListener('click', (e) => e.stopPropagation());
            }
        }

        row.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            const id = row.dataset.recId;
            const r = findRec(id);
            if (r) renderDetailModal(r);
        });
    });
}

function setupMultiSelectListeners(containerId, filterKey, defaultLabel) {
    const container = document.getElementById(containerId);
    const trigger = container.querySelector('.multi-select-trigger');
    const dropdown = container.querySelector('.multi-select-dropdown');

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');
        closeAllDropdowns();
        if (!isOpen) {
            dropdown.classList.remove('hidden');
            container.classList.add('open');
        }
    });

    // Prevent clicks inside dropdown from closing it
    dropdown.addEventListener('click', (e) => e.stopPropagation());

    dropdown.addEventListener('change', () => {
        AppState.filters[filterKey] = getMultiSelectValues(containerId);
        updateMultiSelectTrigger(containerId, defaultLabel);
        applyFiltersAndSort();
        renderResults();
    });
}

function setupFilterListeners() {
    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            AppState.filters.searchText = e.target.value;
            applyFiltersAndSort();
            renderResults();
        }, 300);
    });

    setupMultiSelectListeners('agency-multi', 'agencies', 'All Agencies');
    setupMultiSelectListeners('status-multi', 'statuses', 'All Statuses');
    setupMultiSelectListeners('report-multi', 'reports', 'All Reports');

    document.getElementById('date-from-input').addEventListener('change', (e) => {
        AppState.filters.dateFrom = e.target.value;
        applyFiltersAndSort();
        renderResults();
    });

    document.getElementById('date-to-input').addEventListener('change', (e) => {
        AppState.filters.dateTo = e.target.value;
        applyFiltersAndSort();
        renderResults();
    });

    document.getElementById('saved-toggle').addEventListener('click', () => {
        AppState.filters.savedOnly = !AppState.filters.savedOnly;
        applyFiltersAndSort();
        renderResults();
    });

    document.getElementById('clear-saved').addEventListener('click', () => {
        AppState.saveLists[AppState.currentListName] = new Set();
        AppState.saved = AppState.saveLists[AppState.currentListName];
        persistSaveLists();
        if (AppState.filters.savedOnly) {
            AppState.filters.savedOnly = false;
        }
        applyFiltersAndSort();
        renderResults();
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            AppState.viewMode = btn.dataset.view;
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            savePreferences();
            renderResults();
        });
    });

    document.getElementById('filters-toggle').addEventListener('click', () => {
        const toggle = document.getElementById('filters-toggle');
        const filtersBody = document.getElementById('filters-body');
        toggle.classList.toggle('collapsed');
        filtersBody.classList.toggle('collapsed');
    });

    // Save list controls
    document.getElementById('save-list-select').addEventListener('change', (e) => {
        switchSaveList(e.target.value);
    });
    document.getElementById('new-list-btn').addEventListener('click', createSaveList);
    document.getElementById('delete-list-btn').addEventListener('click', deleteSaveList);

    // Export CSV
    document.getElementById('export-csv-btn').addEventListener('click', exportCsv);

    // Print
    document.getElementById('print-btn').addEventListener('click', () => window.print());

    // Close all dropdowns on outside click
    document.addEventListener('click', closeAllDropdowns);
}

function setupSortListeners() {
    document.querySelectorAll('.cases-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortBy = th.dataset.sort;

            if (AppState.sortBy === sortBy) {
                AppState.sortDir = AppState.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                AppState.sortBy = sortBy;
                AppState.sortDir = 'desc';
            }

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
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

// ===== URL Hash State (TODO 5) =====
function serializeHash() {
    const params = new URLSearchParams();
    const f = AppState.filters;
    if (f.searchText) params.set('q', f.searchText);
    if (f.agencies.size) params.set('a', [...f.agencies].join('|'));
    if (f.statuses.size) params.set('s', [...f.statuses].join('|'));
    if (f.reports.size) params.set('r', [...f.reports].join('|'));
    if (f.dateFrom) params.set('df', f.dateFrom);
    if (f.dateTo) params.set('dt', f.dateTo);
    if (f.savedOnly) params.set('saved', '1');
    params.set('view', AppState.viewMode);
    if (AppState.sortBy !== 'report_date' || AppState.sortDir !== 'desc')
        params.set('sort', `${AppState.sortBy}:${AppState.sortDir}`);
    history.replaceState(null, '', '#' + params.toString());
}

function deserializeHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const f = AppState.filters;
    if (params.has('q')) {
        f.searchText = params.get('q');
        document.getElementById('search-input').value = f.searchText;
    }
    if (params.has('a')) {
        f.agencies = new Set(params.get('a').split('|').filter(Boolean));
        restoreMultiSelect('agency-multi', f.agencies, 'All Agencies');
    }
    if (params.has('s')) {
        f.statuses = new Set(params.get('s').split('|').filter(Boolean));
        restoreMultiSelect('status-multi', f.statuses, 'All Statuses');
    }
    if (params.has('r')) {
        f.reports = new Set(params.get('r').split('|').filter(Boolean));
        restoreMultiSelect('report-multi', f.reports, 'All Reports');
    }
    if (params.has('df')) {
        f.dateFrom = params.get('df');
        document.getElementById('date-from-input').value = f.dateFrom;
    }
    if (params.has('dt')) {
        f.dateTo = params.get('dt');
        document.getElementById('date-to-input').value = f.dateTo;
    }
    if (params.has('saved')) {
        f.savedOnly = true;
    }
    if (params.has('view')) {
        const v = params.get('view');
        if (['table', 'reports', 'scorecard', 'charts'].includes(v)) {
            AppState.viewMode = v;
            document.querySelectorAll('.view-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === v));
        }
    }
    if (params.has('sort')) {
        const [by, dir] = params.get('sort').split(':');
        if (by) AppState.sortBy = by;
        if (dir) AppState.sortDir = dir;
    }
}

// ===== Preferences =====
function savePreferences() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.VIEW_MODE, AppState.viewMode);
}

function loadPreferences() {
    const savedView = localStorage.getItem(CONFIG.STORAGE_KEYS.VIEW_MODE);
    if (['table', 'reports', 'scorecard', 'charts'].includes(savedView)) {
        AppState.viewMode = savedView;
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === savedView);
        });
    }
}

// ===== Initialization =====
function initApp() {
    loadPreferences();
    loadSaveLists();
    loadNotes();
    setupFilterListeners();
    setupSortListeners();
    setupModalListeners();

    if (!initData()) return;

    deserializeHash();  // TODO 5: restore state from URL hash (overrides localStorage view)
    applyFiltersAndSort();
    renderResults();
}

document.addEventListener('DOMContentLoaded', initApp);
