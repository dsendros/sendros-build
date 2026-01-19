# Mixtiles Gallery Wall Planner

An interactive drag-and-drop tool for planning gallery wall layouts using Mixtiles photo tiles.

## Features

- **Drag & Drop** — Position tiles anywhere on your virtual wall
- **13 Tile Sizes** — All official Mixtiles sizes with accurate dimensions
- **Cost Calculator** — See prices per tile and running total
- **Snap to Grid** — Optional 0.5" grid snapping for precise alignment
- **Visible Grid** — Toggle grid overlay for visual alignment
- **Minimum Spacing** — Enforce gaps between tiles
- **Tile Rotation** — Rotate non-square tiles 90°
- **Dynamic Wall Size** — Adjust wall dimensions to match your space
- **Save/Load Layouts** — Save named layouts to localStorage
- **Export/Import** — Share layouts as JSON files
- **Custom Tile Sets** — Create your own tile sizes and prices
- **Dark Mode** — Matches site-wide theme preference
- **Free Dragging** — Tiles move freely during drag with visual collision feedback; auto-adjusts on drop
- **Help Modal** — Built-in help explaining the tool and how to use it

---

## About Mixtiles

Mixtiles are photo tiles with a proprietary magnetic peel-and-stick mounting system. Key features:

- **No nails or wall damage** — Uses a sticky back that adheres to walls
- **Repositionable** — Can be removed and restuck multiple times
- **0.75" thick** — All tiles have the same depth regardless of size
- **Matte finish** — Photos are printed with a matte coating

### Available Sizes and Pricing

Mixtiles advertises sizes that differ slightly from actual dimensions:

| Advertised | Actual Dimensions | Price (USD) | Notes |
|------------|-------------------|-------------|-------|
| 8×8 | 8.4" × 8.4" | $15 | Smallest square |
| 8×11 / 11×8 | 8.4" × 11" | $27 | Small rectangle |
| 12×12 | 12.44" × 12.44" | $45 | Medium square |
| 12×16 / 16×12 | 12.44" × 16.44" | $45 | Medium rectangle |
| 20×20 | 19.5" × 19.5" | $99 | Large square |
| 20×27 / 27×20 | 19.5" × 27" | $99 | Large rectangle |
| 27×36 / 36×27 | 27" × 36" | $159 | Extra large |
| 22×44 / 44×22 | 22" × 44" | $189 | Panoramic |

**Note:** Adding mat borders to tiles reduces the visible photo area.

---

## File Structure

```
mixtiles-planner/
├── index.html    # HTML structure and modals
├── styles.css    # All CSS styling
├── app.js        # Application JavaScript
└── README.md     # This documentation
```

---

## Code Structure

### Configuration (app.js)

```javascript
const CONFIG = {
    SCALE: 7.5,              // Pixels per inch
    DEFAULT_WALL_WIDTH: 60,  // inches
    DEFAULT_WALL_HEIGHT: 54, // inches
    GRID_SIZE: 0.5,          // inches (snap increment)
    STORAGE_KEYS: { ... }    // localStorage keys
};
```

### Application State

```javascript
const AppState = {
    wall: { width, height },
    tiles: [],                    // Tiles on wall
    tileIdCounter: 0,
    settings: {
        snapToGrid: false,
        showGrid: false,
        minSpacing: 0
    },
    tileSets: { ... },            // Available tile sets
    currentSetId: 'mixtiles',
    dragState: null
};
```

### Tile Data Model

```javascript
{
    id: number,              // Unique identifier
    sizeName: string,        // Display label (e.g., '12×16')
    originalSizeName: string,// Original name (for price lookup after rotation)
    width: number,           // Current width in inches
    height: number,          // Current height in inches
    x: number,               // Position from left edge (inches)
    y: number                // Position from top edge (inches)
}
```

### Core Functions

| Function | Purpose |
|----------|---------|
| `initApp()` | Initialize application, load saved state |
| `initPalette()` | Build tile selection UI from current tile set |
| `addTile(sizeName)` | Add a new tile centered on the wall |
| `renderTile(tile)` | Create DOM element for a tile |
| `removeTile(id)` | Remove a tile by ID |
| `rotateTile(id)` | Rotate a tile 90° |
| `clearWall()` | Remove all tiles |
| `updateStats()` | Recalculate tile count, coverage %, cost |
| `updateWallSize(w, h)` | Change wall dimensions |
| `snapToGrid(value)` | Snap a value to grid increment |
| `checkSpacingViolation()` | Check if position violates spacing |

### Save/Load Functions

| Function | Purpose |
|----------|---------|
| `autoSaveLayout()` | Save current layout to localStorage |
| `loadLastLayout()` | Load most recent layout on startup |
| `saveNamedLayout(title)` | Save layout with custom name |
| `loadNamedLayout(id)` | Load a saved layout by ID |
| `exportLayoutAsFile()` | Download layout as JSON file |
| `importLayoutFromFile(file)` | Load layout from JSON file |

### Tile Set Functions

| Function | Purpose |
|----------|---------|
| `getCurrentTileSet()` | Get tiles from active set |
| `switchTileSet(id)` | Change active tile set |
| `createCustomTileSet(name)` | Create new custom set |
| `addTileToSet(setId, data)` | Add tile to custom set |
| `removeTileFromSet(setId, i)` | Remove tile from custom set |

### Help Modal Functions

| Function | Purpose |
|----------|---------|
| `openHelpModal()` | Show the help modal |
| `closeHelpModal()` | Hide the help modal |

---

## localStorage Schema

The app uses four localStorage keys:

### `mixtiles_lastLayout`
Auto-saved current layout (loaded on page open):
```json
{
    "version": 1,
    "timestamp": "2026-01-19T12:00:00Z",
    "wall": { "width": 60, "height": 54 },
    "tileSetId": "mixtiles",
    "tiles": [...],
    "tileIdCounter": 5
}
```

### `mixtiles_savedLayouts`
Array of user-saved named layouts:
```json
[
    {
        "id": "layout_1705659600000",
        "title": "Living Room Gallery",
        "createdAt": "2026-01-19T10:00:00Z",
        "modifiedAt": "2026-01-19T12:00:00Z",
        "wall": { "width": 60, "height": 54 },
        "tileSetId": "mixtiles",
        "tiles": [...],
        "tileIdCounter": 5
    }
]
```

### `mixtiles_customTileSets`
Array of user-created tile sets:
```json
[
    {
        "id": "custom_1705659600000",
        "name": "My Custom Frames",
        "editable": true,
        "createdAt": "2026-01-19T10:00:00Z",
        "tiles": [
            { "name": "10×10", "width": 10, "height": 10, "price": 50 }
        ]
    }
]
```

### `mixtiles_preferences`
User settings:
```json
{
    "version": 1,
    "wall": { "width": 60, "height": 54 },
    "snapToGrid": true,
    "showGrid": false,
    "minSpacing": 1,
    "lastTileSetId": "mixtiles"
}
```

---

## Export Format

The "Export JSON" button creates a file with this structure:

```json
{
    "version": 1,
    "exportedAt": "2026-01-19T12:00:00Z",
    "wall": { "width": 60, "height": 54 },
    "tileSetId": "mixtiles",
    "tileSet": { ... },
    "tiles": [
        { "sizeName": "20×20", "width": 19.5, "height": 19.5, "x": 20.3, "y": 17.5 },
        { "sizeName": "12×12", "width": 12.44, "height": 12.44, "x": 5.0, "y": 5.0 }
    ]
}
```

The "Copy Layout Data" button copies a simplified format:

```json
[
    { "size": "20×20", "x": 20.3, "y": 17.5 },
    { "size": "12×12", "x": 5.0, "y": 5.0 }
]
```

Positions are in inches from the top-left corner of the wall.

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│                         HEADER                              │
├─────────────────┬───────────────────────┬───────────────────┤
│  ADD TILES      │      YOUR WALL        │   LAYOUT STATS    │
│                 │                       │                   │
│  [Mixtiles ▼]   │   ┌───────────────┐   │  Total Tiles: 5   │
│  [+] [⚙]        │   │               │   │  Coverage: 23%    │
│                 │   │    (tiles)    │   │  Total Cost: $285 │
│  ┌───────────┐  │   │               │   │                   │
│  │ 36×27 $159│  │   └───────────────┘   │  [Wall Settings]  │
│  │ 27×36 $159│  │         60"           │  [Layout Settings]│
│  │ ...       │  │                       │  [Save & Load]    │
│  └───────────┘  │                       │  [Clear All]      │
└─────────────────┴───────────────────────┴───────────────────┘
```

---

## CSS Classes

### Tiles
- `.tile` — Base tile styling
- `.tile.dragging` — Applied during drag
- `.tile.invalid-position` — When spacing constraint violated
- `.tile-label` — Size label inside tile
- `.delete-btn` — × remove button (visible on hover)
- `.rotate-btn` — ⟳ rotate button (visible on hover, non-square only)

### Grid
- `.wall-grid` — 0.5" dot grid overlay

### UI Components
- `.settings-group` — Settings section container
- `.setting-row` — Single setting with label and input
- `.modal` — Modal overlay
- `.modal-content` — Modal dialog box
- `.layout-item` — Saved layout list item
- `.btn-help` — Help button (?) in top-right of wall panel
- `.help-modal-content` — Help modal dialog
- `.help-section` — Section within help modal

---

## Potential Enhancements

- **Image upload** — Preview actual photos on tiles
- **Preset layouts** — Load predefined arrangements
- **Undo/redo** — History for tile operations
- **Keyboard shortcuts** — Arrow keys to nudge selected tile
- **Multi-select** — Select and move multiple tiles together
