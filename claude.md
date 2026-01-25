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

**Remaining Features:**
- **Change styling of quiz choices**
	- Eliminate orange border
	- Use color of project cards on main page to distinguish box from rest of page
- **Add map to Capital Cities Quiz** - Highlight state being asked about
- **Add map to Regions Quiz** 
	- Color different regions differently and label each one
		- None of the colors should be too close to the green/red states are highlighted if the user chooses correctly/incorrectly
	- After user chooses a region, highlight state green if they were correct, red if they were wrong
- **Fix Play Again prompt** - At the end of every game, it asks i
- **Additional map quiz option** - Add game where user matches every state to its name
  - User has list of state names and map
  - User clicks state name then clicks map to match state name to map
  - If user is wrong, state they click blinks red and wrong guess is logged. They may continue to guess.
  - If user is correct, state they click highlights green and gets label added.
  - At end of game, user is told how many times they guessed wrong.

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