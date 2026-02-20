import {
    GROUND_Y, AUTO_RUN_SPEED, CANVAS_WIDTH, DEBUG_SHOW_HITBOX,
    POOL_NOODLE_WIDTH, POOL_NOODLE_HEIGHT,
    SAND_CASTLE_WIDTH, SAND_CASTLE_HEIGHT,
    ROCK_WIDTH, ROCK_HEIGHT,
    BUSH_WIDTH, BUSH_HEIGHT,
    BOULDER_WIDTH, BOULDER_HEIGHT,
    ICE_PATCH_WIDTH, ICE_PATCH_HEIGHT,
    CRATER_WIDTH, CRATER_HEIGHT,
    ALIEN_ROCK_WIDTH, ALIEN_ROCK_HEIGHT,
    VOID_CRYSTAL_WIDTH, VOID_CRYSTAL_HEIGHT,
    WEIRD_PILLAR_WIDTH, WEIRD_PILLAR_HEIGHT,
    OLD_IGUANA_WIDTH, OLD_IGUANA_HEIGHT,
    TIE_DYE_IGUANA_WIDTH, TIE_DYE_IGUANA_HEIGHT,
    SMALL_ASTEROID_SIZE, MEDIUM_ASTEROID_SIZE, LARGE_ASTEROID_SIZE
} from '../config.js';
import { drawSprite } from '../sprites.js';
import {
    createAnimator, setAnimation, updateAnimator, drawAnimator, hasAnimation
} from '../animation.js';
import { circleRectOverlap } from '../collision.js';
import { getGroundYAt } from '../terrain.js';

// AIDEV-NOTE: Each type maps to dimensions, sprite/anim key, and fallback color.
// Biomes reference these keys via biome.js groundHazards arrays.
// Types with animKey use the Aseprite animation system; legacy types use drawSprite.
const HAZARD_DEFS = {
    // Beach (legacy fallback)
    poolNoodle: {
        spriteKey: 'poolNoodle',
        w: POOL_NOODLE_WIDTH, h: POOL_NOODLE_HEIGHT,
        fallbackColor: '#FF69B4', hitShape: 'rect'
    },
    sandCastle: {
        spriteKey: 'sandCastle',
        w: SAND_CASTLE_WIDTH, h: SAND_CASTLE_HEIGHT,
        fallbackColor: '#DAA520', hitShape: 'rect'
    },
    // Grass (legacy fallback)
    rock: {
        spriteKey: 'rock',
        w: ROCK_WIDTH, h: ROCK_HEIGHT,
        fallbackColor: '#808080', hitShape: 'rect'
    },
    bush: {
        spriteKey: 'bush',
        w: BUSH_WIDTH, h: BUSH_HEIGHT,
        fallbackColor: '#2D5A1E', hitShape: 'rect'
    },
    // Mountain (legacy fallback)
    boulder: {
        spriteKey: 'boulder',
        w: BOULDER_WIDTH, h: BOULDER_HEIGHT,
        fallbackColor: '#5A5A5A', hitShape: 'rect'
    },
    icePatch: {
        spriteKey: 'icePatch',
        w: ICE_PATCH_WIDTH, h: ICE_PATCH_HEIGHT,
        fallbackColor: '#ADD8E6', hitShape: 'rect'
    },
    // Moon (legacy fallback)
    crater: {
        spriteKey: 'crater',
        w: CRATER_WIDTH, h: CRATER_HEIGHT,
        fallbackColor: '#555555', hitShape: 'rect'
    },
    alienRock: {
        spriteKey: 'alienRock',
        w: ALIEN_ROCK_WIDTH, h: ALIEN_ROCK_HEIGHT,
        fallbackColor: '#8B5CF6', hitShape: 'rect'
    },
    // Spiritual Realm (legacy fallback)
    voidCrystal: {
        spriteKey: 'voidCrystal',
        w: VOID_CRYSTAL_WIDTH, h: VOID_CRYSTAL_HEIGHT,
        fallbackColor: '#FF00FF', hitShape: 'rect'
    },
    weirdPillar: {
        spriteKey: 'weirdPillar',
        w: WEIRD_PILLAR_WIDTH, h: WEIRD_PILLAR_HEIGHT,
        fallbackColor: '#00FF88', hitShape: 'rect'
    },

    // --- Animated blockers ---

    oldIguana: {
        animKey: 'oldIguanaIdle',
        w: OLD_IGUANA_WIDTH, h: OLD_IGUANA_HEIGHT,
        fallbackColor: '#3A7D44', hitShape: 'rect'
    },
    tieDyeIguana: {
        animKey: 'tieDyeIguanaIdle',
        w: TIE_DYE_IGUANA_WIDTH, h: TIE_DYE_IGUANA_HEIGHT,
        fallbackColor: '#FF44CC', hitShape: 'rect'
    },
    smallAsteroid: {
        animKey: 'smallAsteroidIdle',
        w: SMALL_ASTEROID_SIZE, h: SMALL_ASTEROID_SIZE,
        fallbackColor: '#808080', hitShape: 'circle'
    },
    mediumAsteroid: {
        animKey: 'mediumAsteroidIdle',
        w: MEDIUM_ASTEROID_SIZE, h: MEDIUM_ASTEROID_SIZE,
        fallbackColor: '#6A6A6A', hitShape: 'circle'
    },
    largeAsteroid: {
        animKey: 'largeAsteroidIdle',
        w: LARGE_ASTEROID_SIZE, h: LARGE_ASTEROID_SIZE,
        fallbackColor: '#5A5A5A', hitShape: 'circle'
    },
};

export function createGroundHazard(typeKey) {
    const def = HAZARD_DEFS[typeKey];
    if (!def) throw new Error(`Unknown ground hazard type: ${typeKey}`);

    const hazard = {
        x: CANVAS_WIDTH,
        y: GROUND_Y - def.h,
        w: def.w,
        h: def.h,
        spriteKey: def.spriteKey || null,
        animKey: def.animKey || null,
        fallbackColor: def.fallbackColor,
        hitShape: def.hitShape,
        animator: null
    };

    if (def.animKey) {
        hazard.animator = createAnimator();
        setAnimation(hazard.animator, def.animKey, { loop: true });
    }

    return hazard;
}

export function updateGroundHazard(hazard, dt) {
    hazard.x -= AUTO_RUN_SPEED * dt;
    hazard.y = getGroundYAt(hazard.x + hazard.w / 2) - hazard.h;
    if (hazard.animator) {
        updateAnimator(hazard.animator, dt);
    }
}

export function isOffScreen(hazard) {
    return hazard.x + hazard.w < 0;
}

export function getGroundHazardHitCircle(hazard) {
    return {
        cx: hazard.x + hazard.w / 2,
        cy: hazard.y + hazard.h / 2,
        r: hazard.w / 2
    };
}

export function checkGroundHazardCollision(turkeyRect, hazard) {
    if (hazard.hitShape === 'circle') {
        return circleRectOverlap(getGroundHazardHitCircle(hazard), turkeyRect);
    }
    // Default AABB -- inlined for performance (same as rectsOverlap)
    return turkeyRect.x < hazard.x + hazard.w &&
           turkeyRect.x + turkeyRect.w > hazard.x &&
           turkeyRect.y < hazard.y + hazard.h &&
           turkeyRect.y + turkeyRect.h > hazard.y;
}

export function renderGroundHazard(ctx, hazard) {
    if (hazard.animator && hasAnimation(hazard.animKey)) {
        drawAnimator(ctx, hazard.animator, hazard.x, hazard.y, hazard.w, hazard.h);
    } else if (hazard.spriteKey) {
        drawSprite(ctx, hazard.spriteKey, hazard.x, hazard.y, hazard.w, hazard.h, hazard.fallbackColor);
    } else {
        if (hazard.hitShape === 'circle') {
            const cx = hazard.x + hazard.w / 2;
            const cy = hazard.y + hazard.h / 2;
            ctx.fillStyle = hazard.fallbackColor;
            ctx.beginPath();
            ctx.arc(cx, cy, hazard.w / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = hazard.fallbackColor;
            ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);
        }
    }

    if (DEBUG_SHOW_HITBOX) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        if (hazard.hitShape === 'circle') {
            const cx = hazard.x + hazard.w / 2;
            const cy = hazard.y + hazard.h / 2;
            ctx.beginPath();
            ctx.arc(cx, cy, hazard.w / 2, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.strokeRect(hazard.x, hazard.y, hazard.w, hazard.h);
        }
    }
}
