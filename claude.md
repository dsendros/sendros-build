# Sendros.Build - Personal Portfolio Website

A clean, minimal personal portfolio website for Dennis.

## File Structure

```
sendros-build-website/
├── index.html                      # Main HTML structure
├── styles.css                      # All styling and theming
├── claude.md                       # This documentation
└── projects/
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
- Take from Claude and upload here
- Improve map section

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

**Remaining Features:**
- [ ] **Image upload** — Preview actual photos on tiles
- [ ] **Preset layouts** — Load predefined arrangements

#### Project 4 - Columbia Heights Station Alerts
- Raspberry Pi setup with train times and maybe other station alerts for Columbia Heights