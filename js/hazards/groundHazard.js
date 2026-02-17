import {
    GROUND_Y, AUTO_RUN_SPEED, CANVAS_WIDTH,
    POOL_NOODLE_WIDTH, POOL_NOODLE_HEIGHT,
    SAND_CASTLE_WIDTH, SAND_CASTLE_HEIGHT,
    ROCK_WIDTH, ROCK_HEIGHT,
    BUSH_WIDTH, BUSH_HEIGHT,
    BOULDER_WIDTH, BOULDER_HEIGHT,
    ICE_PATCH_WIDTH, ICE_PATCH_HEIGHT,
    CRATER_WIDTH, CRATER_HEIGHT,
    ALIEN_ROCK_WIDTH, ALIEN_ROCK_HEIGHT,
    VOID_CRYSTAL_WIDTH, VOID_CRYSTAL_HEIGHT,
    WEIRD_PILLAR_WIDTH, WEIRD_PILLAR_HEIGHT
} from '../config.js';
import { drawSprite } from '../sprites.js';

// AIDEV-NOTE: Each type maps to dimensions, sprite key, and fallback color.
// Biomes reference these keys via biome.js groundHazards arrays.
const HAZARD_DEFS = {
    // Beach
    poolNoodle: {
        spriteKey: 'poolNoodle',
        w: POOL_NOODLE_WIDTH,
        h: POOL_NOODLE_HEIGHT,
        fallbackColor: '#FF69B4'
    },
    sandCastle: {
        spriteKey: 'sandCastle',
        w: SAND_CASTLE_WIDTH,
        h: SAND_CASTLE_HEIGHT,
        fallbackColor: '#DAA520'
    },
    // Grass
    rock: {
        spriteKey: 'rock',
        w: ROCK_WIDTH,
        h: ROCK_HEIGHT,
        fallbackColor: '#808080'
    },
    bush: {
        spriteKey: 'bush',
        w: BUSH_WIDTH,
        h: BUSH_HEIGHT,
        fallbackColor: '#2D5A1E'
    },
    // Mountain
    boulder: {
        spriteKey: 'boulder',
        w: BOULDER_WIDTH,
        h: BOULDER_HEIGHT,
        fallbackColor: '#5A5A5A'
    },
    icePatch: {
        spriteKey: 'icePatch',
        w: ICE_PATCH_WIDTH,
        h: ICE_PATCH_HEIGHT,
        fallbackColor: '#ADD8E6'
    },
    // Moon
    crater: {
        spriteKey: 'crater',
        w: CRATER_WIDTH,
        h: CRATER_HEIGHT,
        fallbackColor: '#555555'
    },
    alienRock: {
        spriteKey: 'alienRock',
        w: ALIEN_ROCK_WIDTH,
        h: ALIEN_ROCK_HEIGHT,
        fallbackColor: '#8B5CF6'
    },
    // Spiritual Realm
    voidCrystal: {
        spriteKey: 'voidCrystal',
        w: VOID_CRYSTAL_WIDTH,
        h: VOID_CRYSTAL_HEIGHT,
        fallbackColor: '#FF00FF'
    },
    weirdPillar: {
        spriteKey: 'weirdPillar',
        w: WEIRD_PILLAR_WIDTH,
        h: WEIRD_PILLAR_HEIGHT,
        fallbackColor: '#00FF88'
    },
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
