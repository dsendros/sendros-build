# Sendros.Build - Personal Portfolio Website

A clean, minimal personal portfolio website for Dennis.

## File Structure

```
sendros-build-website/
├── index.html                      # Main HTML structure
├── styles.css                      # All styling and theming
├── claude.md                       # This documentation
└── projects/
    ├── cocktological-evenings/
    │   ├── index.html              # CE project detail page
    │   ├── styles.css              # Page-specific styles
    │   └── CE-logo.jpg             # Cocktological Evenings logo
    ├── india-learning/
    │   ├── index.html              # India quiz app
    │   ├── styles.css              # App-specific styles
    │   └── app.js                  # Application JavaScript (vanilla JS)
    ├── mixtiles-planner/
    │   ├── index.html              # Mixtiles planner app
    │   ├── styles.css              # App-specific styles
    │   ├── app.js                  # Application JavaScript
    │   └── README.md               # Mixtiles planner documentation
    └── zoning-dashboard/
        ├── index.html              # Zoning dashboard app
        ├── styles.css              # App-specific styles
        ├── app.js                  # Application JavaScript
        └── data-fields.csv         # Field documentation for DC zoning data sources
```

## Features

### Dark/Light Mode Toggle
- Toggle button in the navigation bar
- Theme preference persisted to `localStorage`
- Smooth transitions between themes

### Hexagon Profile Photo
- Profile image clipped to hexagon shape using CSS `clip-path`
- SVG hexagon frame overlays the image
- On hover, the frame animates with a stroke drawing effect

### Sections
- **Hero**: Full-height landing with profile photo and introduction
- **About**: Brief bio section
- **Projects**: Responsive grid of project cards with hover effects
- **Contact**: Centered contact information with email link

### Responsive Design
- Mobile breakpoint at 768px
- Fluid typography and spacing adjustments
- Flexible project grid using `auto-fit` and `minmax()`

## CSS Variables (Theming)

### Light Mode (default)
```css
--primary-color: #2d3436;
--accent-color: #6c5ce7;
--text-color: #636e72;
--background-color: #ffffff;
--card-background: #f8f9fa;
```

### Dark Mode
```css
--primary-color: #ffffff;
--text-color: #b2bec3;
--background-color: #1a1a2e;
--card-background: #16213e;
```

## Hexagon Animation Details

The hexagon frame consists of two SVG `<path>` elements that each draw half of the hexagon:

1. **Right half**: Starts at top center (12 o'clock), traces clockwise to bottom center (6 o'clock)
2. **Left half**: Starts at bottom center (6 o'clock), traces clockwise back to top center

Animation is achieved via `stroke-dasharray` and `stroke-dashoffset`:
- Initial state: `stroke-dashoffset: 330` (path hidden)
- On hover: `stroke-dashoffset: 0` (path fully visible)
- Transition duration: 0.6s with ease timing

This creates the effect of the hexagon "drawing itself" starting from both the top and bottom points simultaneously.

## Next Steps

### Intro Sections
- Dennis to fill these out manually

### Projects

#### Project 1 - Cocktological Evenings (Completed)

A detail page for Dennis's now-defunct themed cocktail evening project (2015-2019).

**Page Structure:**
- Header with CE logo (circular) and title
- First-person description of the project's origin and evolution
- Two link cards with logos:
  - Visit Website (CE logo) → cocktologicalevenings.com
  - YouTube Channel (red YouTube logo) → @cocktologicalevenings9308

**Implementation:**
- `projects/cocktological-evenings/index.html` — Detail page with explainer text and link cards
- `projects/cocktological-evenings/styles.css` — Flexbox layout for header and cards, dark/light mode support
- Project card on main portfolio links to detail page

#### Project 2 - India Quizzes

**Quiz Modes:**
1. **Map Quiz** (3 sub-modes):
   - *Name the State*: See highlighted state, pick from multiple choice
   - *Find the State*: See state name, click on the map to find it
   - *Match All States*: Match all 28 states from a list to the map
2. **Capital Cities Quiz**: Match states with capitals, shows map with highlighted state
3. **Regions Quiz**: Identify which region each state belongs to, color-coded map

**Implementation Details:**
- Vanilla JavaScript (no frameworks)
- SVG map with state paths using `title` attributes for identification
- State data includes: `name`, `capital`, `region`, `abbr` (2-letter abbreviation)
- `stateLabelPositions` object stores x,y coordinates for label placement
- CSS variables for theming, dark/light mode support
- Responsive design with mobile breakpoints

#### Project 3 - Mixtiles Planner

**Completed Features:**
- [x] **Snap to grid** — Optional 0.5" grid snapping with visible grid overlay
- [x] **Change wall size** — User can set wall dimensions in 0.5" increments
- [x] **Minimum spacing** — Enforces minimum distance between tiles
- [x] **Tile rotation** — 90° rotation for non-square tiles (⟳ button)
- [x] **Save/load** — LocalStorage persistence with auto-load, named layouts, export/import JSON
- [x] **Custom tile sets** — Create custom tile sets with user-defined dimensions and prices
- [x] **Cost calculator** — Shows prices in palette and total cost in Layout Stats
- [x] **Improved tile movement** — Tiles can be dragged freely (even overlapping), with red visual feedback when in invalid position; auto-adjusts to nearest valid position on drop
- [x] **Help menu** — Question mark icon in top-right of wall panel opens modal with usage instructions
- [x] **Improved tile placement** - Tiles can't be placed on top of each other (even when min spacing is 0)

**Remaining Features:**
- [ ] **Image upload** — Preview actual photos on tiles
- [ ] **Preset layouts** — Load predefined arrangements

#### Project 4 - Columbia Heights Station Alerts
- Raspberry Pi setup with train times and maybe other station alerts for Columbia Heights

#### Project 5 - DC Zoning Dashboard

A dashboard for tracking DC zoning cases, designed to help DC YIMBYs identify cases they may want to act on.

**Data Sources:**
- DCOZ Zone_Mapservice ArcGIS REST API Layer 46 (Zoning Cases Filed 2020-Present) - ZC and BZA cases
- DCOZ Zone_Mapservice ArcGIS REST API Layer 44 (Design Review) - treated as ZC cases
- DCOZ Calendar
- API base: `https://maps2.dcgis.dc.gov/dcgis/rest/services/DCOZ/Zone_Mapservice/MapServer`
- Results are paginated (1000 records per page) and deduplicated by Case_ID

**Completed Features (Phase 2):**
- [x] **Table and Card views** — Toggle between table (sortable, zebra-striped) and card grid views
- [x] **Case type filtering** — Filter by ZC or BZA
- [x] **Date range filtering** — Default to last 180 days, adjustable
- [x] **Unified search** — Search case numbers, addresses, descriptions, ANC
- [x] **Case detail modal** — Click row/card to see full case details
- [x] **IZIS links** — Click case number to open official IZIS page (URL built from case number)
- [x] **Address links** — Addresses in detail modal link to Google Maps
- [x] **SSL links** — SSL in detail modal links to DC zoning map
- [x] **Dark/light mode** — Consistent with other projects
- [x] **Responsive design** — Works on mobile and desktop

**Implementation:**
- `projects/zoning-dashboard/index.html` — Dashboard page
- `projects/zoning-dashboard/styles.css` — Styling with dark/light mode
- `projects/zoning-dashboard/app.js` — API queries, state management, rendering
- `projects/zoning-dashboard/data-fields.csv` — Field documentation

**Completed Features (Phase 3):**
- [x] **Calendar integration** — Fetches hearing dates from DCOZ Calendar via CORS proxy, shows next upcoming hearing per case
- [x] **Upcoming hearings view** — Only future hearings displayed, uniform blue badges

**Remaining Features:**
- [ ] **Default date range** - Remove default values from this field so that all cases are searched by default. Clarify what the field is searching on.
- [ ] **Meeting type** - Add meeting type (public hear, public meeting, etc) to data. List in chart.
- [ ] **Cases without action** — Highlight cases pending action

**Notes:**
- Layer 44 (Design Review) cases are classified as ZC
- Previously used Layer 34/45 on Planning_Landuse_and_Zoning_WebMercator/MapServer — that data was stale (last updated 2019), migrated to DCOZ/Zone_Mapservice in Feb 2026