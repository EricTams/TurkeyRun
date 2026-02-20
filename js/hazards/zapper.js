// AIDEV-NOTE: Zapper hazard (chunk 5, updated chunk 12C).
// Two variants:
//   'gap'        -- top bar + bottom bar with a flyable gap in the middle (original).
//   'bottomOpen' -- top bar only, hanging from ceiling. Open below; player must stay low.
// Rendered as tiled Pool Noodle sprites (bottom-up) with biome-specific spin variants.

import {
    GROUND_Y, AUTO_RUN_SPEED, CANVAS_HEIGHT,
    ZAPPER_WIDTH, DEBUG_SHOW_HITBOX
} from '../config.js';
import { rectsOverlap } from '../collision.js';
import {
    createAnimator, setAnimation, updateAnimator,
    drawAnimator, hasAnimation
} from '../animation.js';

const FALLBACK_COLOR = '#FFD700';

const NOODLE_NATIVE_W = 32;
const NOODLE_NATIVE_H = 96;
const TILE_W = ZAPPER_WIDTH;
const TILE_H = ZAPPER_WIDTH * (NOODLE_NATIVE_H / NOODLE_NATIVE_W);

// -----------------------------------------------------------------------
// Factory functions
// -----------------------------------------------------------------------

export function createZapperAt(x, gapY, gapH, animKey) {
    const animator = createAnimator();
    setAnimation(animator, animKey, { loop: true });
    return { x, w: ZAPPER_WIDTH, gapY, gapH, variant: 'gap', animator };
}

export function createBottomOpenZapper(x, barHeight, animKey) {
    const animator = createAnimator();
    setAnimation(animator, animKey, { loop: true });
    return { x, w: ZAPPER_WIDTH, barHeight, variant: 'bottomOpen', animator };
}

// -----------------------------------------------------------------------
// Update / cull
// -----------------------------------------------------------------------

export function updateZapper(zapper, dt) {
    zapper.x -= AUTO_RUN_SPEED * dt;
    updateAnimator(zapper.animator, dt);
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

    const topBar = { x: zapper.x, y: 0, w: zapper.w, h: zapper.gapY };
    const bottomY = zapper.gapY + zapper.gapH;
    const bottomBar = {
        x: zapper.x, y: bottomY,
        w: zapper.w, h: GROUND_Y - bottomY
    };
    return rectsOverlap(turkeyRect, topBar) || rectsOverlap(turkeyRect, bottomBar);
}

// -----------------------------------------------------------------------
// Tiled rendering — anchored at the gap opening edge
// -----------------------------------------------------------------------

/**
 * Tiles upward from anchorY (the gap edge). The first full tile sits just
 * above anchorY; any partial tile overflows off the top of the screen.
 */
function drawNoodlesUp(ctx, animator, x, anchorY) {
    if (anchorY <= 0) return;

    if (!hasAnimation(animator.currentAnim)) {
        ctx.fillStyle = FALLBACK_COLOR;
        ctx.fillRect(x, 0, TILE_W, anchorY);
        return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, 0, TILE_W, anchorY);
    ctx.clip();

    for (let y = anchorY - TILE_H; y >= -TILE_H; y -= TILE_H) {
        drawAnimator(ctx, animator, x, y, TILE_W, TILE_H);
    }

    ctx.restore();
}

/**
 * Tiles downward from anchorY (the gap edge). The first full tile sits just
 * below anchorY; any partial tile overflows past the ground behind terrain.
 */
function drawNoodlesDown(ctx, animator, x, anchorY) {
    if (anchorY >= CANVAS_HEIGHT) return;

    if (!hasAnimation(animator.currentAnim)) {
        ctx.fillStyle = FALLBACK_COLOR;
        ctx.fillRect(x, anchorY, TILE_W, GROUND_Y - anchorY);
        return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, anchorY, TILE_W, CANVAS_HEIGHT - anchorY);
    ctx.clip();

    for (let y = anchorY; y < CANVAS_HEIGHT; y += TILE_H) {
        drawAnimator(ctx, animator, x, y, TILE_W, TILE_H);
    }

    ctx.restore();
}

// -----------------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------------

export function renderZapper(ctx, zapper) {
    if (zapper.variant === 'bottomOpen') {
        drawNoodlesUp(ctx, zapper.animator, zapper.x, zapper.barHeight);
    } else {
        const gapBottom = zapper.gapY + zapper.gapH;
        drawNoodlesUp(ctx, zapper.animator, zapper.x, zapper.gapY);
        drawNoodlesDown(ctx, zapper.animator, zapper.x, gapBottom);
    }

    if (DEBUG_SHOW_HITBOX) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        if (zapper.variant === 'bottomOpen') {
            ctx.strokeRect(zapper.x, 0, zapper.w, zapper.barHeight);
        } else {
            ctx.strokeRect(zapper.x, 0, zapper.w, zapper.gapY);
            const bottomY = zapper.gapY + zapper.gapH;
            ctx.strokeRect(zapper.x, bottomY, zapper.w, GROUND_Y - bottomY);
        }
    }
}
