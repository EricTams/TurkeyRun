import {
    GROUND_Y, AUTO_RUN_SPEED, CANVAS_WIDTH,
    POOL_NOODLE_WIDTH, POOL_NOODLE_HEIGHT,
    SAND_CASTLE_WIDTH, SAND_CASTLE_HEIGHT
} from '../config.js';
import { drawSprite } from '../sprites.js';

const POOL_NOODLE_COLOR = '#FF69B4';
const SAND_CASTLE_COLOR = '#DAA520';

// AIDEV-NOTE: Each type maps to dimensions, sprite key, and fallback color.
// Different biomes will supply different type sets (chunk 11).
const HAZARD_DEFS = {
    poolNoodle: {
        spriteKey: 'poolNoodle',
        w: POOL_NOODLE_WIDTH,
        h: POOL_NOODLE_HEIGHT,
        fallbackColor: POOL_NOODLE_COLOR
    },
    sandCastle: {
        spriteKey: 'sandCastle',
        w: SAND_CASTLE_WIDTH,
        h: SAND_CASTLE_HEIGHT,
        fallbackColor: SAND_CASTLE_COLOR
    }
};

export function createGroundHazard(typeKey) {
    const def = HAZARD_DEFS[typeKey];
    if (!def) throw new Error(`Unknown ground hazard type: ${typeKey}`);

    return {
        x: CANVAS_WIDTH,
        y: GROUND_Y - def.h,
        w: def.w,
        h: def.h,
        spriteKey: def.spriteKey,
        fallbackColor: def.fallbackColor
    };
}

export function updateGroundHazard(hazard, dt) {
    hazard.x -= AUTO_RUN_SPEED * dt;
}

export function isOffScreen(hazard) {
    return hazard.x + hazard.w < 0;
}

export function renderGroundHazard(ctx, hazard) {
    drawSprite(ctx, hazard.spriteKey, hazard.x, hazard.y, hazard.w, hazard.h, hazard.fallbackColor);
}
