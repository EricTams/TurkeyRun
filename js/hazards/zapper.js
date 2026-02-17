// AIDEV-NOTE: Zapper hazard (chunk 5, updated chunk 12C).
// Two variants:
//   'gap'        -- top bar + bottom bar with a flyable gap in the middle (original).
//   'bottomOpen' -- top bar only, hanging from ceiling. Open below; player must stay low.

import {
    GROUND_Y, AUTO_RUN_SPEED,
    ZAPPER_WIDTH
} from '../config.js';
import { drawSprite } from '../sprites.js';
import { rectsOverlap } from '../collision.js';

const BAR_COLOR = '#FFD700';
const NODE_COLOR = '#FF4500';
const NODE_RADIUS = 8;

// -----------------------------------------------------------------------
// Factory functions
// -----------------------------------------------------------------------

export function createZapperAt(x, gapY, gapH) {
    return { x, w: ZAPPER_WIDTH, gapY, gapH, variant: 'gap' };
}

export function createBottomOpenZapper(x, barHeight) {
    return { x, w: ZAPPER_WIDTH, barHeight, variant: 'bottomOpen' };
}

// -----------------------------------------------------------------------
// Update / cull
// -----------------------------------------------------------------------

export function updateZapper(zapper, dt) {
    zapper.x -= AUTO_RUN_SPEED * dt;
}

export function isZapperOffScreen(zapper) {
    return zapper.x + zapper.w < 0;
}

// -----------------------------------------------------------------------
// Collision
// -----------------------------------------------------------------------

export function checkZapperCollision(turkeyRect, zapper) {
    if (zapper.variant === 'bottomOpen') {
        const topBar = { x: zapper.x, y: 0, w: zapper.w, h: zapper.barHeight };
        return rectsOverlap(turkeyRect, topBar);
    }

    // 'gap' variant -- top bar + bottom bar
    const topBar = { x: zapper.x, y: 0, w: zapper.w, h: zapper.gapY };
    const bottomY = zapper.gapY + zapper.gapH;
    const bottomBar = {
        x: zapper.x, y: bottomY,
        w: zapper.w, h: GROUND_Y - bottomY
    };
    return rectsOverlap(turkeyRect, topBar) || rectsOverlap(turkeyRect, bottomBar);
}

// -----------------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------------

export function renderZapper(ctx, zapper) {
    if (zapper.variant === 'bottomOpen') {
        renderBottomOpenZapper(ctx, zapper);
        return;
    }
    renderGapZapper(ctx, zapper);
}

function renderGapZapper(ctx, zapper) {
    const centerX = zapper.x + zapper.w / 2;
    const bottomY = zapper.gapY + zapper.gapH;
    const bottomH = GROUND_Y - bottomY;

    // Top bar (ceiling to gap)
    drawSprite(ctx, 'zapper', zapper.x, 0, zapper.w, zapper.gapY, BAR_COLOR);

    // Bottom bar (gap to ground)
    drawSprite(ctx, 'zapper', zapper.x, bottomY, zapper.w, bottomH, BAR_COLOR);

    // Nodes at gap edges to mark the opening
    ctx.fillStyle = NODE_COLOR;
    ctx.beginPath();
    ctx.arc(centerX, zapper.gapY, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX, bottomY, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
}

function renderBottomOpenZapper(ctx, zapper) {
    const centerX = zapper.x + zapper.w / 2;

    // Single top bar from ceiling down to barHeight
    drawSprite(ctx, 'zapper', zapper.x, 0, zapper.w, zapper.barHeight, BAR_COLOR);

    // Node at the bottom edge of the bar
    ctx.fillStyle = NODE_COLOR;
    ctx.beginPath();
    ctx.arc(centerX, zapper.barHeight, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
}
