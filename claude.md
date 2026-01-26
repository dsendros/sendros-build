# Sendros.Build - Personal Portfolio Website

A clean, minimal personal portfolio website for Dennis.

## File Structure

```
sendros-build-website/
├── index.html                      # Main HTML structure
├── styles.css                      # All styling and theming
├── claude.md                       # This documentation
└── projects/
    ├── india-learning/
    │   ├── index.html              # India quiz app
    │   ├── styles.css              # App-specific styles
    │   └── app.js                  # Application JavaScript (vanilla JS)
    └── mixtiles-planner/
        ├── index.html              # Mixtiles planner app
        ├── styles.css              # App-specific styles
        ├── app.js                  # Application JavaScript
        └── README.md               # Mixtiles planner documentation
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

#### Project 1 - Cocktological Evenings
- Link to CE site
- Disable site functionality
- Transition site off squarespace

#### Project 2 - India Quizzes

**Completed:**
- [x] Split into separate HTML, CSS, and JS files
- [x] Converted from React to vanilla JavaScript (consistent with mixtiles-planner)
- [x] Match style to rest of site (uses site CSS variables, dark/light mode support)
- [x] Site navigation header with links back to main site
- [x] Three quiz modes: Map Quiz, Capital Cities Quiz, Regions Quiz
- [x] System preference detection for dark/light mode
- [x] **Find the State mode** - Map Quiz now has two sub-modes accessed via a selection screen:
  - "Name the State" (original): See highlighted state, pick from multiple choice
  - "Find the State" (new): See state name, click on the map to find it
- [x] **Restyled quiz choices** - Removed orange border, now uses card background color matching project cards on main page
- [x] **Map in Capital Cities Quiz** - Shows map with highlighted state being asked about
- [x] **Map in Regions Quiz** - Shows map with all states colored by region (6 colors: purple, amber, cyan, teal, blue, dark green) with region labels; highlights target state green/red after answering
- [x] **Fixed Play Again prompt** - "Play Again" now restarts the same quiz type; added "Return to Menu" button to go back to menu
- [x] **Match All States mode** - New game mode under Map Quiz submenu where users match all 28 states from a list to the map
  - Side-by-side layout: scrollable state list on left, interactive map on right
  - User clicks state name in list, then finds and clicks it on the map
  - Wrong guesses: state blinks red, wrong count incremented, user can retry
  - Correct matches: state highlights green, abbreviation label added (e.g., "KA"), state moves to Completed section
  - Results show total wrong guesses at the end

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