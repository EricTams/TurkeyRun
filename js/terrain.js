import {
    AUTO_RUN_SPEED, GROUND_Y, CANVAS_WIDTH,
    TILE_SIZE, TILE_SURFACE_OFFSET_LOW, TILE_SURFACE_OFFSET_NORMAL,
    TIER_HEIGHT, TILE_ROW_Y
} from './config.js';

// Active terrain segments that scroll left with the world.
// Each segment: { x: number, tiles: [{localX, tileType, level}] }
let segments = [];

export function resetTerrain() {
    segments = [];
}

export function addTerrainSegment(elevation, worldX) {
    if (!elevation || elevation.length === 0) return;

    const tiles = [];
    for (let i = 0; i < elevation.length; i++) {
        const entry = elevation[i];
        const prevLevel = i > 0 ? elevation[i - 1].level : entry.level;
        const level = entry.level;

        let tileType;
        if (level > prevLevel) {
            tileType = 'slopeUp';
        } else if (level < prevLevel) {
            tileType = 'slopeDown';
        } else if (level === 0) {
            tileType = 'flatLow';
        } else {
            tileType = 'flat';
        }

        tiles.push({
            localX: entry.x,
            tileType,
            level,
            prevLevel,
        });
    }

    segments.push({
        x: worldX,
        width: elevation[elevation.length - 1].x + TILE_SIZE,
        tiles,
    });
}

export function updateTerrain(dt) {
    const scrollPx = AUTO_RUN_SPEED * dt;
    for (const seg of segments) {
        seg.x -= scrollPx;
    }
    segments = segments.filter(seg => seg.x + seg.width > -TILE_SIZE);
}

function findTileAt(screenX) {
    for (const seg of segments) {
        const localX = screenX - seg.x;
        if (localX < 0 || localX >= seg.width) continue;

        for (let i = seg.tiles.length - 1; i >= 0; i--) {
            if (localX >= seg.tiles[i].localX) {
                return seg.tiles[i];
            }
        }
    }
    return null;
}

function collisionYForTile(tile, fractionAcross) {
    const { tileType, level, prevLevel } = tile;

    if (tileType === 'slopeUp') {
        const startOffset = TILE_SURFACE_OFFSET_LOW;
        const endOffset = TILE_SURFACE_OFFSET_NORMAL;
        const offset = startOffset + (endOffset - startOffset) * fractionAcross;
        return TILE_ROW_Y + offset;
    }
    if (tileType === 'slopeDown') {
        const startOffset = TILE_SURFACE_OFFSET_NORMAL;
        const endOffset = TILE_SURFACE_OFFSET_LOW;
        const offset = startOffset + (endOffset - startOffset) * fractionAcross;
        return TILE_ROW_Y + offset;
    }
    if (tileType === 'flat') {
        return TILE_ROW_Y + TILE_SURFACE_OFFSET_NORMAL;
    }
    // flatLow or default
    return GROUND_Y;
}

export function getGroundYAt(screenX) {
    const tile = findTileAt(screenX);
    if (!tile) return GROUND_Y;

    // Find the segment to compute fraction across the tile
    for (const seg of segments) {
        const localX = screenX - seg.x;
        if (localX < 0 || localX >= seg.width) continue;

        const tileLocalX = localX - tile.localX;
        const fraction = Math.max(0, Math.min(1, tileLocalX / TILE_SIZE));
        return collisionYForTile(tile, fraction);
    }

    return GROUND_Y;
}

export function getVisibleTileColumns() {
    const result = [];
    for (const seg of segments) {
        for (const tile of seg.tiles) {
            const screenX = seg.x + tile.localX;
            if (screenX + TILE_SIZE < 0) continue;
            if (screenX > CANVAS_WIDTH) continue;
            result.push({
                screenX,
                tileType: tile.tileType,
                level: tile.level,
            });
        }
    }
    return result;
}

export function getAverageElevation() {
    let sum = 0;
    let count = 0;
    const step = TILE_SIZE;
    for (let x = 0; x < CANVAS_WIDTH; x += step) {
        const tile = findTileAt(x);
        if (tile) {
            sum += tile.level;
            count++;
        }
    }
    return count > 0 ? sum / count : 0;
}
