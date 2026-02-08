# DC Zoning Dashboard

A dashboard for tracking DC zoning cases filed before the Zoning Commission (ZC) and Board of Zoning Adjustment (BZA). Designed to help DC YIMBYs and community members quickly identify cases they may want to follow, support, or act on.

## What It Does

The dashboard pulls case data from the DC Office of Zoning's public ArcGIS REST API, normalizes it, and presents it in a searchable, filterable interface. Users can browse cases in a sortable table or card grid, filter by date range and case type, search across multiple fields, and click into any case to see full details with links to the official IZIS case record, Google Maps, and the DC zoning map.

## Data Sources

All data comes from the DCOZ Zone_Mapservice ArcGIS REST API:

- **Layer 46 — Zoning Cases (Filed 2020-Present)**: The primary data source. Contains BZA and ZC cases including variances, special exceptions, map amendments, PUDs, time extensions, and more. Each case may appear as multiple records in the API (one per parcel), so the dashboard deduplicates by Case_ID.

- **Layer 44 — Design Review**: Design review cases, which are classified as ZC cases in the dashboard. This layer is small and uses string-formatted dates rather than epoch timestamps, so date filtering happens client-side.

The API enforces a 1,000-record limit per request, so the dashboard paginates automatically using `resultOffset` and the `exceededTransferLimit` flag.

**API base URL**: `https://maps2.dcgis.dc.gov/dcgis/rest/services/DCOZ/Zone_Mapservice/MapServer`

## Features

- **Table and card views** with a toggle to switch between them. View preference is saved to localStorage.
- **Sortable columns**: Case #, Type, Address, Relief, ANC, and Date Filed. Click a column header to sort; click again to reverse direction.
- **Date range filtering**: Defaults to the last 180 days. The "from" date triggers a fresh API fetch (server-side filter); the "to" date filters client-side from already-loaded data.
- **Case type filtering**: Checkboxes for ZC and BZA.
- **Unified text search**: Searches across case number, address, description, relief type, and ANC. Debounced at 300ms.
- **Case detail modal**: Click any row or card to open a modal with full case information including relief type, address (linked to Google Maps), date filed, ANC/SMD, SSL (linked to DC zoning map), zoning details (existing and requested), and description.
- **IZIS links**: Click a case number to open the official case record in the DC Office of Zoning's Interactive Zoning Information System. URLs are constructed from the case number: `https://app.dcoz.dc.gov/Home/ViewCase?case_id={caseNumber}`.
- **Dark/light mode**: Follows the site-wide theme toggle, with CSS variables for all colors.
- **Responsive design**: Works on mobile and desktop with appropriate layout adjustments.
- **Collapsible filters panel**: The filters section can be collapsed to save screen space.

## Architecture

The dashboard is built with vanilla HTML, CSS, and JavaScript (no frameworks or build tools).

### Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure: header, filters panel, table/card containers, loading/error/empty states, detail modal |
| `styles.css` | All styling including dark/light mode theming via CSS variables, responsive breakpoints |
| `app.js` | Application logic: API fetching with pagination, data normalization, state management, filtering/sorting, rendering |
| `data-fields.csv` | Documentation of available fields from both API layers |

### Application State

All state lives in a single `AppState` object:

```
AppState
  cases[]            — All loaded cases (normalized)
  filteredCases[]    — Cases after applying filters and sorting
  filters
    dateFrom         — Start of date range (triggers API refetch)
    dateTo           — End of date range (client-side filter)
    caseTypes[]      — Selected case types: ['ZC', 'BZA']
    searchText       — Current search query
  viewMode           — 'table' or 'cards'
  sortBy             — Field name to sort by
  sortDir            — 'asc' or 'desc'
  selectedCase       — Currently selected case (for modal)
  loading            — Whether data is being fetched
  error              — Current error message, if any
```

### Data Flow

1. On page load, `initApp()` sets the default date range (last 180 days), attaches event listeners, and calls `loadAllCases()`.
2. `loadAllCases()` fetches from both Layer 46 and Layer 44 in parallel via `Promise.all`.
3. Each fetch function uses `fetchAllPages()` to handle pagination, then normalizes raw API attributes into a common internal format.
4. Layer 46 results are deduplicated by `Case_ID` (the API returns one record per parcel, so multi-parcel cases appear multiple times).
5. Results are merged and stored in `AppState.cases`, then `applyFiltersAndSort()` runs client-side filters (date range, case type, text search) and sorts.
6. `renderResults()` renders either the table or card view based on `AppState.viewMode`.

### Normalized Case Format

Both layers are normalized to this shape:

```
{
  id              — Unique identifier (Case_ID or DR case number)
  caseNumber      — Display case number
  caseType        — 'ZC' or 'BZA'
  caseTypeRelief  — Relief type (e.g., "Special Exception", "Time Extension")
  address         — Premise address
  description     — Case description
  existingZoning  — Current zoning designation
  requestedZoning — Requested zoning change
  ssl             — Square/Suffix/Lot identifier
  url             — Link to IZIS case record
  anc             — ANC/SMD identifier
  status          — Case status (Design Review cases only)
  dateFiled       — Date object of when case was filed
  source          — 'layer46' or 'layer44'
}
```

## Calendar Integration

The dashboard fetches hearing dates from the DCOZ IZIS calendar and merges them into case data, showing the next upcoming hearing for each case.

### What Was Built

- **Calendar fetch pipeline**: `fetchCalendarMonth()` → `parseCalendarHTML()` → `mergeCalendarData()`
- Uses CORS proxy (`corsproxy.io`) to fetch IZIS calendar pages (`app.dcoz.dc.gov/Home/Calendar?year=YYYY&month=M`)
- Parses server-rendered HTML using `DOMParser`, walking the Bootstrap accordion structure (`.accordion-item` → `.accordion-header` for date/type/time → `.accordion-body` for case tables)
- Merges hearing data into existing cases by matching `caseId` from calendar links against `Case_ID` from ArcGIS
- Only assigns future hearings to cases (filters `hearingDate > now`, picks the soonest upcoming)
- Fetches current month ±1 month in parallel using `Promise.allSettled`
- Graceful degradation: if calendar fetch fails, a yellow banner is shown and the dashboard works normally

**UI additions:**
- Hearing column in the table view
- Hearing badge on cards
- Hearing section in the detail modal

**New AppState fields:**

```
AppState
  calendarData       — Raw calendar entries from parsed HTML
  calendarAvailable  — Whether calendar data loaded successfully (null until attempted)
  calendarError      — Error message if calendar fetch failed
```

**New case fields (added to normalized case format):**

```
  hearingDate     — Date of the hearing
  hearingTime     — Scheduled time
  hearingType     — Type of meeting (e.g., "Public Hearing")
  hearingResult   — Result text, if decided
  hearingVote     — Extracted vote tally
  nextAction      — Extracted next action from result text
```

