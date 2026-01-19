// ============================================
// SECTION 1: Configuration & Constants
// ============================================

const CONFIG = {
    SCALE: 7.5,                    // Pixels per inch
    DEFAULT_WALL_WIDTH: 60,        // inches
    DEFAULT_WALL_HEIGHT: 54,       // inches
    GRID_SIZE: 0.5,                // inches (snap increment)
    MIN_SPACING_STEP: 0.5,         // inches
    STORAGE_KEYS: {
        LAST_LAYOUT: 'mixtiles_lastLayout',
        SAVED_LAYOUTS: 'mixtiles_savedLayouts',
        CUSTOM_TILE_SETS: 'mixtiles_customTileSets',
        PREFERENCES: 'mixtiles_preferences'
    }
};

// Mixtiles pricing (handles both orientations)
const PRICE_MAP = {
    '8×8': 15,
    '8×11': 27, '11×8': 27,
    '12×12': 45,
    '12×16': 45, '16×12': 45,
    '20×20': 99,
    '20×27': 99, '27×20': 99,
    '27×36': 159, '36×27': 159,
    '22×44': 189, '44×22': 189
};

// Default Mixtiles tile set (non-editable)
const DEFAULT_MIXTILES_SET = {
    id: 'mixtiles',
    name: 'Mixtiles',
    editable: false,
    tiles: [
        { name: '36×27', width: 36, height: 27, price: 159 },
        { name: '27×36', width: 27, height: 36, price: 159 },
        { name: '44×22', width: 44, height: 22, price: 189 },
        { name: '22×44', width: 22, height: 44, price: 189 },
        { name: '27×20', width: 27, height: 19.5, price: 99 },
        { name: '20×27', width: 19.5, height: 27, price: 99 },
        { name: '20×20', width: 19.5, height: 19.5, price: 99 },
        { name: '16×12', width: 16.44, height: 12.44, price: 45 },
        { name: '12×16', width: 12.44, height: 16.44, price: 45 },
        { name: '12×12', width: 12.44, height: 12.44, price: 45 },
        { name: '11×8', width: 11, height: 8.4, price: 27 },
        { name: '8×11', width: 8.4, height: 11, price: 27 },
        { name: '8×8', width: 8.4, height: 8.4, price: 15 }
    ]
};

// ============================================
// SECTION 2: State Management
// ============================================

const AppState = {
    wall: {
        width: CONFIG.DEFAULT_WALL_WIDTH,
        height: CONFIG.DEFAULT_WALL_HEIGHT
    },
    tiles: [],
    tileIdCounter: 0,
    settings: {
        snapToGrid: false,
        showGrid: false,
        minSpacing: 0
    },
    tileSets: {
        mixtiles: DEFAULT_MIXTILES_SET
    },
    currentSetId: 'mixtiles',
    dragState: null
};

// ============================================
// SECTION 3: Tile Set Management
// ============================================

function getCurrentTileSet() {
    const set = AppState.tileSets[AppState.currentSetId];
    return set ? set.tiles : DEFAULT_MIXTILES_SET.tiles;
}

function getTileSet(setId) {
    if (setId === 'mixtiles') return DEFAULT_MIXTILES_SET;
    return AppState.tileSets[setId] || null;
}

function getCustomTileSets() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.CUSTOM_TILE_SETS);
    return saved ? JSON.parse(saved) : [];
}

function loadCustomTileSets() {
    const customSets = getCustomTileSets();
    customSets.forEach(set => {
        AppState.tileSets[set.id] = set;
    });
}

function saveCustomTileSets() {
    const customSets = Object.values(AppState.tileSets)
        .filter(s => s.id !== 'mixtiles');
    localStorage.setItem(CONFIG.STORAGE_KEYS.CUSTOM_TILE_SETS, JSON.stringify(customSets));
}

function createCustomTileSet(name) {
    const setId = `custom_${Date.now()}`;
    const newSet = {
        id: setId,
        name: name || 'New Tile Set',
        editable: true,
        createdAt: new Date().toISOString(),
        tiles: []
    };

    AppState.tileSets[setId] = newSet;
    saveCustomTileSets();
    updateTileSetSelector();

    return newSet;
}

function deleteCustomTileSet(setId) {
    if (setId === 'mixtiles') return false;

    delete AppState.tileSets[setId];
    saveCustomTileSets();

    if (AppState.currentSetId === setId) {
        AppState.currentSetId = 'mixtiles';
        refreshPalette();
    }

    updateTileSetSelector();
    return true;
}

function addTileToSet(setId, tileData) {
    const set = AppState.tileSets[setId];
    if (!set || !set.editable) return false;

    const tile = {
        name: tileData.title || `${tileData.width}×${tileData.height}`,
        width: parseFloat(tileData.width),
        height: parseFloat(tileData.height),
        price: tileData.price ? parseFloat(tileData.price) : null
    };

    set.tiles.push(tile);
    saveCustomTileSets();

    if (AppState.currentSetId === setId) {
        refreshPalette();
    }

    return true;
}

function removeTileFromSet(setId, tileIndex) {
    const set = AppState.tileSets[setId];
    if (!set || !set.editable) return false;

    set.tiles.splice(tileIndex, 1);
    saveCustomTileSets();

    if (AppState.currentSetId === setId) {
        refreshPalette();
    }

    return true;
}

function duplicateTileInSet(setId, tileIndex) {
    const set = AppState.tileSets[setId];
    if (!set || !set.editable) return false;

    const original = set.tiles[tileIndex];
    const copy = { ...original, name: `${original.name} (copy)` };
    set.tiles.splice(tileIndex + 1, 0, copy);
    saveCustomTileSets();

    if (AppState.currentSetId === setId) {
        refreshPalette();
    }

    return true;
}

function switchTileSet(setId) {
    if (!AppState.tileSets[setId]) return false;

    AppState.currentSetId = setId;
    refreshPalette();
    savePreferences();

    return true;
}

// ============================================
// SECTION 4: Storage Management
// ============================================

function savePreferences() {
    const prefs = {
        version: 1,
        wall: { ...AppState.wall },
        snapToGrid: AppState.settings.snapToGrid,
        showGrid: AppState.settings.showGrid,
        minSpacing: AppState.settings.minSpacing,
        lastTileSetId: AppState.currentSetId
    };
    localStorage.setItem(CONFIG.STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
}

function loadPreferences() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.PREFERENCES);
    if (!saved) return false;

    try {
        const prefs = JSON.parse(saved);
        if (prefs.wall) {
            AppState.wall = { ...prefs.wall };
        }
        if (prefs.snapToGrid !== undefined) {
            AppState.settings.snapToGrid = prefs.snapToGrid;
        }
        if (prefs.showGrid !== undefined) {
            AppState.settings.showGrid = prefs.showGrid;
        }
        if (prefs.minSpacing !== undefined) {
            AppState.settings.minSpacing = prefs.minSpacing;
        }
        if (prefs.lastTileSetId && AppState.tileSets[prefs.lastTileSetId]) {
            AppState.currentSetId = prefs.lastTileSetId;
        }
        return true;
    } catch (e) {
        console.error('Failed to load preferences:', e);
        return false;
    }
}

function autoSaveLayout() {
    const layoutData = {
        version: 1,
        timestamp: new Date().toISOString(),
        wall: { ...AppState.wall },
        tileSetId: AppState.currentSetId,
        tiles: AppState.tiles.map(t => ({ ...t })),
        tileIdCounter: AppState.tileIdCounter
    };

    localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_LAYOUT, JSON.stringify(layoutData));
}

function loadLastLayout() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_LAYOUT);
    if (!saved) return false;

    try {
        const data = JSON.parse(saved);
        return loadLayoutData(data, false);
    } catch (e) {
        console.error('Failed to load last layout:', e);
        return false;
    }
}

function getSavedLayouts() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.SAVED_LAYOUTS);
    return saved ? JSON.parse(saved) : [];
}

function saveNamedLayout(title) {
    const layouts = getSavedLayouts();

    const layoutData = {
        id: `layout_${Date.now()}`,
        title: title || `Layout ${layouts.length + 1}`,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        wall: { ...AppState.wall },
        tileSetId: AppState.currentSetId,
        tiles: AppState.tiles.map(t => ({ ...t })),
        tileIdCounter: AppState.tileIdCounter
    };

    layouts.push(layoutData);
    localStorage.setItem(CONFIG.STORAGE_KEYS.SAVED_LAYOUTS, JSON.stringify(layouts));

    return layoutData;
}

function loadNamedLayout(layoutId) {
    const layouts = getSavedLayouts();
    const layout = layouts.find(l => l.id === layoutId);

    if (!layout) {
        alert('Layout not found.');
        return false;
    }

    return loadLayoutData(layout, true);
}

function deleteNamedLayout(layoutId) {
    let layouts = getSavedLayouts();
    layouts = layouts.filter(l => l.id !== layoutId);
    localStorage.setItem(CONFIG.STORAGE_KEYS.SAVED_LAYOUTS, JSON.stringify(layouts));
    renderSavedLayoutsList();
}

function loadLayoutData(data, showWarnings = true) {
    // Validate tile set exists
    if (data.tileSetId && data.tileSetId !== AppState.currentSetId) {
        const setExists = getTileSet(data.tileSetId);
        if (!setExists) {
            if (showWarnings) {
                const proceed = confirm(
                    `This layout uses a tile set that no longer exists. ` +
                    `Load with current tile set instead?`
                );
                if (!proceed) return false;
            }
        } else {
            AppState.currentSetId = data.tileSetId;
            updateTileSetSelector();
        }
    }

    // Apply wall size
    if (data.wall) {
        AppState.wall = { ...data.wall };
        applyWallSizeToDOM();
    }

    // Clear and load tiles
    clearWallSilent();
    AppState.tiles = data.tiles.map(t => ({ ...t }));
    AppState.tileIdCounter = data.tileIdCounter ||
        (AppState.tiles.length ? Math.max(...AppState.tiles.map(t => t.id)) + 1 : 0);

    // Render all tiles
    AppState.tiles.forEach(tile => renderTile(tile));
    updateStats();
    updateSettingsUI();

    return true;
}

function exportLayoutAsFile() {
    const layoutData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        wall: { ...AppState.wall },
        tileSetId: AppState.currentSetId,
        tileSet: AppState.tileSets[AppState.currentSetId],
        tiles: AppState.tiles.map(t => ({
            sizeName: t.sizeName,
            width: t.width,
            height: t.height,
            x: Math.round(t.x * 10) / 10,
            y: Math.round(t.y * 10) / 10,
            originalSizeName: t.originalSizeName
        }))
    };

    const blob = new Blob([JSON.stringify(layoutData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `mixtiles-layout-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

function importLayoutFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // Validate structure
            if (!data.tiles || !Array.isArray(data.tiles)) {
                throw new Error('Invalid layout file format');
            }

            // If layout includes a custom tile set, import it
            if (data.tileSet && data.tileSet.id !== 'mixtiles') {
                AppState.tileSets[data.tileSet.id] = data.tileSet;
                saveCustomTileSets();
                updateTileSetSelector();
            }

            // Reconstruct tiles with IDs
            const tilesWithIds = data.tiles.map((t, i) => ({
                id: i,
                sizeName: t.sizeName,
                width: t.width,
                height: t.height,
                x: t.x,
                y: t.y,
                originalSizeName: t.originalSizeName
            }));

            loadLayoutData({
                ...data,
                tiles: tilesWithIds,
                tileIdCounter: tilesWithIds.length
            }, true);

            autoSaveLayout();
        } catch (err) {
            alert('Failed to import layout: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// ============================================
// SECTION 5: Wall Operations
// ============================================

function applyWallSizeToDOM() {
    const wallEl = document.getElementById('wall');
    wallEl.style.width = `${AppState.wall.width * CONFIG.SCALE}px`;
    wallEl.style.height = `${AppState.wall.height * CONFIG.SCALE}px`;

    // Update dimension labels
    document.querySelector('.wall-width').textContent = `${AppState.wall.width}"`;
    document.querySelector('.wall-height').textContent = `${AppState.wall.height}"`;

    // Update subtitle
    document.querySelector('.subtitle').textContent =
        `Your wall: ${AppState.wall.height}" tall × ${AppState.wall.width}" wide | Drag tiles to arrange your gallery`;

    // Re-render grid if shown
    if (AppState.settings.showGrid) {
        renderGrid();
    }
}

function updateWallSize(newWidth, newHeight) {
    // Validate to 0.5" increments
    newWidth = Math.round(newWidth * 2) / 2;
    newHeight = Math.round(newHeight * 2) / 2;

    // Minimum size check
    const minTileDim = Math.min(...getCurrentTileSet().map(t => Math.min(t.width, t.height)));
    newWidth = Math.max(newWidth, minTileDim);
    newHeight = Math.max(newHeight, minTileDim);

    const oldWidth = AppState.wall.width;
    const oldHeight = AppState.wall.height;

    // Check for tiles outside new bounds
    const tilesOutside = AppState.tiles.filter(t =>
        t.x + t.width > newWidth || t.y + t.height > newHeight
    );

    if (tilesOutside.length > 0) {
        const proceed = confirm(
            `${tilesOutside.length} tile(s) will be outside the new wall bounds. ` +
            `They will be pushed inward to fit. Continue?`
        );
        if (!proceed) {
            // Reset input values
            document.getElementById('wall-width').value = oldWidth;
            document.getElementById('wall-height').value = oldHeight;
            return false;
        }

        // Push tiles inward
        tilesOutside.forEach(tile => {
            if (tile.x + tile.width > newWidth) {
                tile.x = Math.max(0, newWidth - tile.width);
            }
            if (tile.y + tile.height > newHeight) {
                tile.y = Math.max(0, newHeight - tile.height);
            }
            updateTilePosition(tile);
        });
    }

    AppState.wall.width = newWidth;
    AppState.wall.height = newHeight;

    applyWallSizeToDOM();
    savePreferences();
    autoSaveLayout();
    updateStats();

    return true;
}

function renderGrid() {
    const wall = document.getElementById('wall');
    let gridEl = document.getElementById('wall-grid');

    if (!AppState.settings.showGrid) {
        if (gridEl) gridEl.remove();
        return;
    }

    if (!gridEl) {
        gridEl = document.createElement('div');
        gridEl.id = 'wall-grid';
        gridEl.className = 'wall-grid';
        wall.insertBefore(gridEl, wall.firstChild);
    }

    // Grid size in pixels
    const gridPx = CONFIG.GRID_SIZE * CONFIG.SCALE;
    gridEl.style.backgroundSize = `${gridPx}px ${gridPx}px`;
}

function snapToGrid(value) {
    if (!AppState.settings.snapToGrid) return value;
    return Math.round(value / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
}

// ============================================
// SECTION 6: Tile Operations
// ============================================

function getTilePrice(tile) {
    // First check if tile has explicit price (from tile set)
    const currentSet = getCurrentTileSet();
    const setTile = currentSet.find(t => t.name === (tile.originalSizeName || tile.sizeName));
    if (setTile && setTile.price !== null && setTile.price !== undefined) {
        return setTile.price;
    }

    // Check price map (handles rotated tiles)
    const lookupName = tile.originalSizeName || tile.sizeName;
    if (PRICE_MAP[lookupName]) {
        return PRICE_MAP[lookupName];
    }
    if (PRICE_MAP[tile.sizeName]) {
        return PRICE_MAP[tile.sizeName];
    }

    return null;
}

function calculateTotalCost() {
    let total = 0;
    let hasUnpriced = false;

    for (const tile of AppState.tiles) {
        const price = getTilePrice(tile);
        if (price !== null) {
            total += price;
        } else {
            hasUnpriced = true;
        }
    }

    return { total, hasUnpriced };
}

function addTile(sizeName) {
    const tileSet = getCurrentTileSet();
    const size = tileSet.find(s => s.name === sizeName);
    if (!size) return;

    const id = AppState.tileIdCounter++;
    const tile = {
        id,
        sizeName: size.name,
        originalSizeName: size.name,
        width: size.width,
        height: size.height,
        x: (AppState.wall.width - size.width) / 2,
        y: (AppState.wall.height - size.height) / 2
    };

    // Snap initial position if enabled
    tile.x = snapToGrid(tile.x);
    tile.y = snapToGrid(tile.y);

    // Constrain to wall
    tile.x = Math.max(0, Math.min(tile.x, AppState.wall.width - tile.width));
    tile.y = Math.max(0, Math.min(tile.y, AppState.wall.height - tile.height));

    // Check spacing constraint
    if (AppState.settings.minSpacing > 0) {
        const spacingCheck = checkSpacingViolation(tile, tile.x, tile.y, null);
        if (!spacingCheck.valid) {
            const validPos = findValidPosition(tile, tile.x, tile.y);
            if (validPos) {
                tile.x = validPos.x;
                tile.y = validPos.y;
            } else {
                alert('Cannot place tile - no valid position found with current spacing constraint.');
                AppState.tileIdCounter--;
                return;
            }
        }
    }

    AppState.tiles.push(tile);
    renderTile(tile);
    updateStats();
    autoSaveLayout();
}

function renderTile(tile) {
    const wall = document.getElementById('wall');
    const el = document.createElement('div');
    el.className = 'tile';
    el.id = `tile-${tile.id}`;
    el.style.width = `${tile.width * CONFIG.SCALE}px`;
    el.style.height = `${tile.height * CONFIG.SCALE}px`;
    el.style.left = `${tile.x * CONFIG.SCALE}px`;
    el.style.top = `${tile.y * CONFIG.SCALE}px`;

    const isSquare = tile.width === tile.height;

    el.innerHTML = `
        ${!isSquare ? `<button class="rotate-btn" onclick="rotateTile(${tile.id}); event.stopPropagation();" title="Rotate 90°">⟳</button>` : ''}
        <span class="tile-label">${tile.sizeName}</span>
        <button class="delete-btn" onclick="removeTile(${tile.id}); event.stopPropagation();">×</button>
    `;

    // Drag handlers
    el.addEventListener('mousedown', (e) => startDrag(e, tile));
    el.addEventListener('touchstart', (e) => startDrag(e, tile), { passive: false });

    wall.appendChild(el);
}

function updateTilePosition(tile) {
    const el = document.getElementById(`tile-${tile.id}`);
    if (!el) return;

    el.style.left = `${tile.x * CONFIG.SCALE}px`;
    el.style.top = `${tile.y * CONFIG.SCALE}px`;
}

function removeTile(id) {
    AppState.tiles = AppState.tiles.filter(t => t.id !== id);
    const el = document.getElementById(`tile-${id}`);
    if (el) el.remove();
    updateStats();
    autoSaveLayout();
}

function clearWall() {
    AppState.tiles = [];
    document.getElementById('wall').querySelectorAll('.tile').forEach(el => el.remove());
    updateStats();
    autoSaveLayout();
}

function clearWallSilent() {
    AppState.tiles = [];
    document.getElementById('wall').querySelectorAll('.tile').forEach(el => el.remove());
}

function rotateTile(tileId) {
    const tile = AppState.tiles.find(t => t.id === tileId);
    if (!tile) return;

    // Skip square tiles
    if (tile.width === tile.height) return;

    // Swap dimensions
    const newWidth = tile.height;
    const newHeight = tile.width;

    // Calculate new position (maintain top-left corner)
    let newX = tile.x;
    let newY = tile.y;

    // Check if rotation would exceed bounds and shift if needed
    if (newX + newWidth > AppState.wall.width) {
        newX = AppState.wall.width - newWidth;
    }
    if (newY + newHeight > AppState.wall.height) {
        newY = AppState.wall.height - newHeight;
    }

    // Ensure non-negative
    newX = Math.max(0, newX);
    newY = Math.max(0, newY);

    // Snap if enabled
    newX = snapToGrid(newX);
    newY = snapToGrid(newY);

    // Check spacing constraint
    if (AppState.settings.minSpacing > 0) {
        const tempTile = { ...tile, width: newWidth, height: newHeight };
        const spacingCheck = checkSpacingViolation(tempTile, newX, newY, tile.id);
        if (!spacingCheck.valid) {
            const validPos = findValidPosition(tempTile, newX, newY);
            if (!validPos) {
                alert('Cannot rotate tile - spacing constraint would be violated.');
                return;
            }
            newX = validPos.x;
            newY = validPos.y;
        }
    }

    // Apply rotation
    tile.width = newWidth;
    tile.height = newHeight;
    tile.x = newX;
    tile.y = newY;

    // Update size name (swap numbers)
    const parts = tile.sizeName.split('×');
    tile.sizeName = `${parts[1]}×${parts[0]}`;

    // Re-render tile
    const el = document.getElementById(`tile-${tile.id}`);
    el.style.width = `${newWidth * CONFIG.SCALE}px`;
    el.style.height = `${newHeight * CONFIG.SCALE}px`;
    el.style.left = `${newX * CONFIG.SCALE}px`;
    el.style.top = `${newY * CONFIG.SCALE}px`;
    el.querySelector('.tile-label').textContent = tile.sizeName;

    updateStats();
    autoSaveLayout();
}

// ============================================
// SECTION 7: Drag & Drop with Spacing
// ============================================

function checkSpacingViolation(tile, x, y, excludeTileId = null) {
    const spacing = AppState.settings.minSpacing;
    if (spacing === 0) return { valid: true };

    // Create expanded bounding box for the tile
    const tileBox = {
        left: x - spacing,
        right: x + tile.width + spacing,
        top: y - spacing,
        bottom: y + tile.height + spacing
    };

    for (const other of AppState.tiles) {
        if (other.id === excludeTileId) continue;

        const otherBox = {
            left: other.x,
            right: other.x + other.width,
            top: other.y,
            bottom: other.y + other.height
        };

        // Check for overlap (including spacing buffer)
        if (tileBox.left < otherBox.right &&
            tileBox.right > otherBox.left &&
            tileBox.top < otherBox.bottom &&
            tileBox.bottom > otherBox.top) {
            return { valid: false, conflictingTile: other };
        }
    }

    return { valid: true };
}

function findValidPosition(tile, preferredX, preferredY) {
    // Try preferred position first
    if (checkSpacingViolation(tile, preferredX, preferredY, tile.id).valid) {
        return { x: preferredX, y: preferredY };
    }

    // Search in expanding squares around preferred position
    const step = AppState.settings.snapToGrid ? CONFIG.GRID_SIZE : 0.5;
    const maxRadius = Math.max(AppState.wall.width, AppState.wall.height);

    for (let radius = step; radius < maxRadius; radius += step) {
        for (let dx = -radius; dx <= radius; dx += step) {
            for (let dy = -radius; dy <= radius; dy += step) {
                if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

                let x = preferredX + dx;
                let y = preferredY + dy;

                // Constrain to wall
                x = Math.max(0, Math.min(x, AppState.wall.width - tile.width));
                y = Math.max(0, Math.min(y, AppState.wall.height - tile.height));

                // Snap if enabled
                x = snapToGrid(x);
                y = snapToGrid(y);

                if (checkSpacingViolation(tile, x, y, tile.id).valid) {
                    return { x, y };
                }
            }
        }
    }

    return null; // No valid position found
}

function startDrag(e, tile) {
    e.preventDefault();

    const el = document.getElementById(`tile-${tile.id}`);
    el.classList.add('dragging');

    // Bring to front
    el.style.zIndex = 100;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = el.getBoundingClientRect();
    AppState.dragState = {
        tile,
        el,
        offsetX: clientX - rect.left,
        offsetY: clientY - rect.top,
        lastValidX: tile.x,
        lastValidY: tile.y,
        originalX: tile.x,
        originalY: tile.y
    };

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', onDrag, { passive: false });
    document.addEventListener('touchend', endDrag);
}

function onDrag(e) {
    if (!AppState.dragState) return;
    e.preventDefault();

    const wall = document.getElementById('wall');
    const wallRect = wall.getBoundingClientRect();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let x = (clientX - wallRect.left - AppState.dragState.offsetX) / CONFIG.SCALE;
    let y = (clientY - wallRect.top - AppState.dragState.offsetY) / CONFIG.SCALE;

    // Snap to grid if enabled
    x = snapToGrid(x);
    y = snapToGrid(y);

    // Constrain to wall bounds
    x = Math.max(0, Math.min(x, AppState.wall.width - AppState.dragState.tile.width));
    y = Math.max(0, Math.min(y, AppState.wall.height - AppState.dragState.tile.height));

    // Always move tile to new position
    AppState.dragState.tile.x = x;
    AppState.dragState.tile.y = y;
    AppState.dragState.el.style.left = `${x * CONFIG.SCALE}px`;
    AppState.dragState.el.style.top = `${y * CONFIG.SCALE}px`;

    // Check spacing constraint for visual feedback only
    const spacingCheck = checkSpacingViolation(AppState.dragState.tile, x, y, AppState.dragState.tile.id);

    if (spacingCheck.valid) {
        // Valid position - update last valid position tracker
        AppState.dragState.lastValidX = x;
        AppState.dragState.lastValidY = y;
        AppState.dragState.el.classList.remove('invalid-position');
    } else {
        // Invalid position - show visual feedback but keep moving
        AppState.dragState.el.classList.add('invalid-position');
    }
}

function endDrag() {
    if (AppState.dragState) {
        const { tile, el, lastValidX, lastValidY } = AppState.dragState;

        // Check if current position is valid
        const spacingCheck = checkSpacingViolation(tile, tile.x, tile.y, tile.id);

        if (!spacingCheck.valid) {
            // Position is invalid - find nearest valid spot
            const validPos = findValidPosition(tile, tile.x, tile.y);

            if (validPos) {
                // Found a valid position - move tile there
                tile.x = validPos.x;
                tile.y = validPos.y;
            } else {
                // No valid position found - fall back to last valid position
                tile.x = lastValidX;
                tile.y = lastValidY;
            }
        }

        // Clean up visual state
        el.classList.remove('dragging');
        el.classList.remove('invalid-position');
        el.style.zIndex = '';

        // Update tile position in DOM
        updateTilePosition(tile);

        AppState.dragState = null;
        autoSaveLayout();
    }

    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('touchend', endDrag);
}

// ============================================
// SECTION 8: Layout Save/Load UI
// ============================================

function showSaveModal() {
    document.getElementById('save-modal').classList.remove('hidden');
    document.getElementById('layout-title').value = '';
    document.getElementById('layout-title').focus();
}

function closeSaveModal() {
    document.getElementById('save-modal').classList.add('hidden');
}

function confirmSaveLayout() {
    const title = document.getElementById('layout-title').value.trim();
    saveNamedLayout(title);
    closeSaveModal();
    alert('Layout saved!');
}

function showLoadModal() {
    renderSavedLayoutsList();
    document.getElementById('load-modal').classList.remove('hidden');
}

function closeLoadModal() {
    document.getElementById('load-modal').classList.add('hidden');
}

function renderSavedLayoutsList() {
    const container = document.getElementById('saved-layouts-list');
    const layouts = getSavedLayouts();

    if (layouts.length === 0) {
        container.innerHTML = '<p class="no-layouts">No saved layouts yet.</p>';
        return;
    }

    container.innerHTML = layouts.map(layout => `
        <div class="layout-item">
            <div class="layout-item-info">
                <div class="layout-item-title">${layout.title}</div>
                <div class="layout-item-meta">${layout.tiles.length} tiles · ${layout.wall.width}"×${layout.wall.height}" · ${new Date(layout.modifiedAt).toLocaleDateString()}</div>
            </div>
            <div class="layout-item-actions">
                <button class="btn btn-small btn-primary" onclick="loadNamedLayout('${layout.id}'); closeLoadModal();">Load</button>
                <button class="btn btn-small btn-danger" onclick="deleteNamedLayout('${layout.id}')">×</button>
            </div>
        </div>
    `).join('');
}

function triggerImportFile() {
    document.getElementById('import-file-input').click();
}

function handleImportFile(event) {
    const file = event.target.files[0];
    if (file) {
        importLayoutFromFile(file);
    }
    event.target.value = ''; // Reset for future imports
}

// ============================================
// SECTION 8.5: Help Modal
// ============================================

function openHelpModal() {
    document.getElementById('help-modal').classList.remove('hidden');
    document.addEventListener('keydown', handleHelpEscapeKey);
}

function closeHelpModal() {
    document.getElementById('help-modal').classList.add('hidden');
    document.removeEventListener('keydown', handleHelpEscapeKey);
}

function handleHelpEscapeKey(e) {
    if (e.key === 'Escape') {
        closeHelpModal();
    }
}

function handleHelpModalClick(e) {
    // Close modal if clicking on the overlay (not the content)
    if (e.target.id === 'help-modal') {
        closeHelpModal();
    }
}

// ============================================
// SECTION 9: UI Updates
// ============================================

function initPalette() {
    const palette = document.getElementById('palette');
    const tiles = getCurrentTileSet();
    const currentSet = AppState.tileSets[AppState.currentSetId];

    palette.innerHTML = '';

    tiles.forEach((size, index) => {
        const item = document.createElement('div');
        item.className = 'palette-item';

        const maxDim = Math.max(size.width, size.height);
        const previewScale = 50 / maxDim;
        const previewW = Math.round(size.width * previewScale);
        const previewH = Math.round(size.height * previewScale);

        const priceDisplay = size.price ? `<span class="palette-price">$${size.price}</span>` : '';

        const editButtons = currentSet.editable ? `
            <div class="palette-edit-buttons">
                <button class="btn-icon btn-tiny" onclick="duplicateTileInSet('${currentSet.id}', ${index}); event.stopPropagation();" title="Duplicate">⧉</button>
                <button class="btn-icon btn-tiny btn-danger-tiny" onclick="removeTileFromSet('${currentSet.id}', ${index}); event.stopPropagation();" title="Delete">×</button>
            </div>
        ` : '';

        item.innerHTML = `
            <div class="palette-preview" style="width: ${previewW}px; height: ${previewH}px;"></div>
            <div class="palette-info">
                <div class="palette-size">${size.name} ${priceDisplay}</div>
                <div class="palette-dims">${size.width}" × ${size.height}"</div>
            </div>
            ${editButtons}
            <button class="palette-add" onclick="addTile('${size.name}')">+</button>
        `;
        palette.appendChild(item);
    });

    // Add "Create Tile" button for custom sets
    if (currentSet.editable) {
        const addButton = document.createElement('div');
        addButton.className = 'palette-add-tile';
        addButton.innerHTML = `
            <button class="btn btn-secondary btn-full" onclick="showCreateTileModal()">+ Add Custom Tile</button>
        `;
        palette.appendChild(addButton);
    }
}

function refreshPalette() {
    initPalette();
}

function updateTileSetSelector() {
    const select = document.getElementById('tile-set-select');
    if (!select) return;

    select.innerHTML = '';

    Object.values(AppState.tileSets).forEach(set => {
        const option = document.createElement('option');
        option.value = set.id;
        option.textContent = set.name;
        option.selected = set.id === AppState.currentSetId;
        select.appendChild(option);
    });
}

function updateStats() {
    document.getElementById('total-tiles').textContent = AppState.tiles.length;

    // Calculate coverage
    const wallArea = AppState.wall.width * AppState.wall.height;
    const tileArea = AppState.tiles.reduce((sum, t) => sum + (t.width * t.height), 0);
    const coverage = Math.round((tileArea / wallArea) * 100);
    document.getElementById('coverage').textContent = `${coverage}%`;

    // Calculate cost
    const { total, hasUnpriced } = calculateTotalCost();
    const costDisplay = document.getElementById('total-cost');
    if (costDisplay) {
        if (total > 0) {
            costDisplay.textContent = `$${total}${hasUnpriced ? '+' : ''}`;
        } else if (hasUnpriced && AppState.tiles.length > 0) {
            costDisplay.textContent = 'N/A';
        } else {
            costDisplay.textContent = '$0';
        }
    }

    // Inventory breakdown
    const counts = {};
    const subtotals = {};
    AppState.tiles.forEach(t => {
        const key = t.sizeName;
        counts[key] = (counts[key] || 0) + 1;
        const price = getTilePrice(t);
        if (price !== null) {
            subtotals[key] = (subtotals[key] || 0) + price;
        }
    });

    const inventory = document.getElementById('inventory');
    inventory.innerHTML = '';

    if (Object.keys(counts).length === 0) {
        inventory.innerHTML = '<span class="no-tiles">No tiles yet</span>';
    } else {
        const currentSet = getCurrentTileSet();
        const sizeOrder = currentSet.map(s => s.name);

        const sortedSizes = Object.keys(counts).sort((a, b) => {
            const indexA = sizeOrder.indexOf(a);
            const indexB = sizeOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        sortedSizes.forEach(name => {
            const item = document.createElement('div');
            item.className = 'inventory-item';

            const subtotalDisplay = subtotals[name] ? ` <span class="subtotal">$${subtotals[name]}</span>` : '';
            item.innerHTML = `<span class="count">${counts[name]}×</span> ${name}${subtotalDisplay}`;
            inventory.appendChild(item);
        });
    }
}

function updateSettingsUI() {
    // Wall size inputs
    const widthInput = document.getElementById('wall-width');
    const heightInput = document.getElementById('wall-height');
    if (widthInput) widthInput.value = AppState.wall.width;
    if (heightInput) heightInput.value = AppState.wall.height;

    // Snap settings
    const snapCheckbox = document.getElementById('snap-to-grid');
    const showGridCheckbox = document.getElementById('show-grid');
    const spacingInput = document.getElementById('min-spacing');

    if (snapCheckbox) snapCheckbox.checked = AppState.settings.snapToGrid;
    if (showGridCheckbox) showGridCheckbox.checked = AppState.settings.showGrid;
    if (spacingInput) spacingInput.value = AppState.settings.minSpacing;
}

function exportLayout() {
    const data = AppState.tiles.map(t => ({
        size: t.sizeName,
        x: Math.round(t.x * 10) / 10,
        y: Math.round(t.y * 10) / 10
    }));

    const text = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text).then(() => {
        alert('Layout data copied to clipboard!');
    }).catch(() => {
        console.log('Layout:', text);
        alert('Could not copy to clipboard. Check console for data.');
    });
}

// ============================================
// SECTION 10: Custom Tile Set UI
// ============================================

function showCreateSetModal() {
    document.getElementById('create-set-modal').classList.remove('hidden');
    document.getElementById('set-name').value = '';
    document.getElementById('set-name').focus();
}

function closeCreateSetModal() {
    document.getElementById('create-set-modal').classList.add('hidden');
}

function confirmCreateSet() {
    const name = document.getElementById('set-name').value.trim();
    if (!name) {
        alert('Please enter a set name.');
        return;
    }

    const newSet = createCustomTileSet(name);
    AppState.currentSetId = newSet.id;
    updateTileSetSelector();
    refreshPalette();
    closeCreateSetModal();
}

function showCreateTileModal() {
    document.getElementById('create-tile-modal').classList.remove('hidden');
    document.getElementById('tile-width').value = '';
    document.getElementById('tile-height').value = '';
    document.getElementById('tile-title').value = '';
    document.getElementById('tile-price').value = '';
    document.getElementById('tile-width').focus();
}

function closeCreateTileModal() {
    document.getElementById('create-tile-modal').classList.add('hidden');
}

function confirmCreateTile() {
    const width = document.getElementById('tile-width').value;
    const height = document.getElementById('tile-height').value;
    const title = document.getElementById('tile-title').value.trim();
    const price = document.getElementById('tile-price').value;

    if (!width || !height) {
        alert('Width and height are required.');
        return;
    }

    addTileToSet(AppState.currentSetId, {
        width: parseFloat(width),
        height: parseFloat(height),
        title: title || null,
        price: price ? parseFloat(price) : null
    });

    closeCreateTileModal();
}

function showManageSetsModal() {
    renderManageSetsList();
    document.getElementById('manage-sets-modal').classList.remove('hidden');
}

function closeManageSetsModal() {
    document.getElementById('manage-sets-modal').classList.add('hidden');
}

function renderManageSetsList() {
    const container = document.getElementById('manage-sets-list');
    const customSets = getCustomTileSets();

    if (customSets.length === 0) {
        container.innerHTML = '<p class="no-layouts">No custom tile sets yet.</p>';
        return;
    }

    container.innerHTML = customSets.map(set => `
        <div class="layout-item">
            <div class="layout-item-info">
                <div class="layout-item-title">${set.name}</div>
                <div class="layout-item-meta">${set.tiles.length} tiles</div>
            </div>
            <div class="layout-item-actions">
                <button class="btn btn-small btn-danger" onclick="if(confirm('Delete this tile set?')) { deleteCustomTileSet('${set.id}'); renderManageSetsList(); }">Delete</button>
            </div>
        </div>
    `).join('');
}

// ============================================
// SECTION 11: Event Handlers
// ============================================

function onSnapToggle(checked) {
    AppState.settings.snapToGrid = checked;
    savePreferences();
}

function onShowGridToggle(checked) {
    AppState.settings.showGrid = checked;
    renderGrid();
    savePreferences();
}

function onMinSpacingChange(value) {
    AppState.settings.minSpacing = Math.round(parseFloat(value || 0) * 2) / 2; // Round to 0.5
    savePreferences();
}

function onWallSizeApply() {
    const width = parseFloat(document.getElementById('wall-width').value);
    const height = parseFloat(document.getElementById('wall-height').value);
    updateWallSize(width, height);
}

function onTileSetChange(setId) {
    switchTileSet(setId);
}

// ============================================
// SECTION 12: Initialization
// ============================================

function initApp() {
    // Load custom tile sets first
    loadCustomTileSets();

    // Load preferences
    loadPreferences();

    // Initialize UI
    updateTileSetSelector();
    initPalette();
    applyWallSizeToDOM();
    updateSettingsUI();

    // Try to load last layout
    loadLastLayout();

    // Render grid if enabled
    if (AppState.settings.showGrid) {
        renderGrid();
    }

    updateStats();
}

// Theme toggle (inherited from main site)
function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    const body = document.body;

    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
        toggle.textContent = 'Light';
    }

    toggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        toggle.textContent = isDark ? 'Light' : 'Dark';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initApp();
});
