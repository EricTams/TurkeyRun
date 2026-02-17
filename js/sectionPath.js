// AIDEV-NOTE: Path interpolation helpers for curve-based sections (chunk 10A).
// Each section pattern defines a safe path as an array of waypoints
// [{x, y, width}, ...] where y is normalized (0 = top, 1 = ground) and width
// is the corridor width in pixels. These helpers interpolate the path, generate
// coin positions along it, and check whether a point lies inside the corridor.

import { GROUND_Y, PATH_COIN_SPACING, FOOD_SIZE } from './config.js';

// Margin from ceiling and ground for the path center (in pixels)
const PATH_MARGIN_TOP = 30;
const PATH_MARGIN_BOTTOM = 30;

// ---------------------------------------------------------------------------
// Convert normalized y (0-1) to pixel y
// ---------------------------------------------------------------------------

export function normalizedYToPixel(ny) {
    const usable = GROUND_Y - PATH_MARGIN_TOP - PATH_MARGIN_BOTTOM;
    return PATH_MARGIN_TOP + ny * usable;
}

// ---------------------------------------------------------------------------
// Interpolate path at a given x-offset
// ---------------------------------------------------------------------------
// Returns { y (pixels), width (pixels) } by linearly interpolating between
// the two surrounding waypoints. Clamps to the first/last waypoint if x is
// outside the path range.

export function interpolatePath(path, x) {
    if (path.length === 0) return { y: GROUND_Y / 2, width: 140 };
    if (path.length === 1) {
        return { y: normalizedYToPixel(path[0].y), width: path[0].width };
    }

    // Before first waypoint
    if (x <= path[0].x) {
        return { y: normalizedYToPixel(path[0].y), width: path[0].width };
    }
    // After last waypoint
    if (x >= path[path.length - 1].x) {
        const last = path[path.length - 1];
        return { y: normalizedYToPixel(last.y), width: last.width };
    }

    // Find the two waypoints that bracket x
    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        if (x >= a.x && x <= b.x) {
            const t = (b.x - a.x) > 0 ? (x - a.x) / (b.x - a.x) : 0;
            const ny = a.y + t * (b.y - a.y);
            const w = a.width + t * (b.width - a.width);
            return { y: normalizedYToPixel(ny), width: w };
        }
    }

    // Fallback (shouldn't reach here)
    const last = path[path.length - 1];
    return { y: normalizedYToPixel(last.y), width: last.width };
}

// ---------------------------------------------------------------------------
// Generate coin positions along a path
// ---------------------------------------------------------------------------
// Walks the path from first to last waypoint, placing coins at regular
// intervals. Returns an array of { x, y } in pixel coordinates.
// The worldOffsetX is added to each coin's x so they are positioned in
// world space (typically CANVAS_WIDTH + pattern offsetX).

export function generateCoinsOnPath(path, worldOffsetX, spacing) {
    spacing = spacing || PATH_COIN_SPACING;

    if (path.length < 2) return [];

    const coins = [];
    const startX = path[0].x;
    const endX = path[path.length - 1].x;

    // Walk along the path placing coins at even x intervals.
    // We use small steps for accuracy on curved paths and accumulate distance.
    const step = 2; // px resolution for distance accumulation
    let distAccum = 0;
    let prevPx = interpolatePath(path, startX);

    for (let x = startX + step; x <= endX; x += step) {
        const cur = interpolatePath(path, x);
        const dx = step;
        const dy = cur.y - prevPx.y;
        distAccum += Math.sqrt(dx * dx + dy * dy);

        if (distAccum >= spacing) {
            // Clamp y so coin stays within play area
            const coinY = Math.max(FOOD_SIZE / 2, Math.min(cur.y - FOOD_SIZE / 2, GROUND_Y - FOOD_SIZE));
            coins.push({ x: worldOffsetX + x, y: coinY });
            distAccum = 0;
        }

        prevPx = cur;
    }

    return coins;
}

// ---------------------------------------------------------------------------
// Check if a point lies inside the safe corridor
// ---------------------------------------------------------------------------

export function isInsideCorridor(path, x, pixelY) {
    const { y: centerY, width } = interpolatePath(path, x);
    const halfW = width / 2;
    return pixelY >= centerY - halfW && pixelY <= centerY + halfW;
}
