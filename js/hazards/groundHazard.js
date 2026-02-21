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
    POOL_TUBE_SIZE, POOL_TUBE_GRAVITY,
    POOL_TUBE_BOUNCE_RATIO, POOL_TUBE_SQUISH_DURATION,
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
        fallbackColor: '#3A7D44', hitShape: 'rect',
        flipX: true, drawScale: 1.5
    },
    tieDyeIguana: {
        animKey: 'tieDyeIguanaIdle',
        w: TIE_DYE_IGUANA_WIDTH, h: TIE_DYE_IGUANA_HEIGHT,
        fallbackColor: '#FF44CC', hitShape: 'rect',
        flipX: true, drawScale: 1.5
    },

    // --- Pool tube (bouncing, random color) ---

    poolTube: {
        randomAnimKeys: ['poolTube1Idle', 'poolTube2Idle', 'poolTube3Idle'],
        w: POOL_TUBE_SIZE, h: POOL_TUBE_SIZE,
        fallbackColor: '#FF6EC7', hitShape: 'circle',
        bounce: true,
    },
};

export function createGroundHazard(typeKey) {
    const def = HAZARD_DEFS[typeKey];
    if (!def) throw new Error(`Unknown ground hazard type: ${typeKey}`);

    const chosenAnimKey = def.randomAnimKeys
        ? def.randomAnimKeys[Math.floor(Math.random() * def.randomAnimKeys.length)]
        : (def.animKey || null);

    const hazard = {
        typeKey,
        x: CANVAS_WIDTH,
        y: GROUND_Y - def.h,
        w: def.w,
        h: def.h,
        spriteKey: def.spriteKey || null,
        animKey: chosenAnimKey,
        fallbackColor: def.fallbackColor,
        hitShape: def.hitShape,
        flipX: def.flipX || false,
        drawScale: def.drawScale || 1,
        animator: null,
        punched: false,
        bounce: !!def.bounce,
        bounceOffsetY: 0,
        bounceVY: 0,
        squishTimer: 0,
        squishScaleX: 1,
        squishScaleY: 1,
        angle: 0,
        spinSpeed: 0,
    };

    if (chosenAnimKey) {
        hazard.animator = createAnimator();
        setAnimation(hazard.animator, chosenAnimKey, { loop: true });
    }

    if (hazard.bounce) {
        const maxH = POOL_TUBE_BOUNCE_RATIO * def.h;
        const launchSpeed = Math.sqrt(2 * POOL_TUBE_GRAVITY * maxH);
        const flightTime = 2 * launchSpeed / POOL_TUBE_GRAVITY;
        const t = Math.random() * flightTime;
        hazard.bounceOffsetY = -(launchSpeed * t - 0.5 * POOL_TUBE_GRAVITY * t * t);
        hazard.bounceVY = -launchSpeed + POOL_TUBE_GRAVITY * t;
        hazard.angle = Math.random() * Math.PI * 2;
        hazard.spinSpeed = (1.5 + Math.random() * 3) * (Math.random() < 0.5 ? 1 : -1);
    }

    return hazard;
}

export function updateGroundHazard(hazard, dt) {
    if (hazard.punched) {
        hazard.punchTimer += dt;
        hazard.punchVY += 1400 * dt;
        hazard.y += hazard.punchVY * dt;
        hazard.x += hazard.punchVX * dt;
        hazard.punchSpin += 10 * dt;
        return;
    }
    hazard.x -= AUTO_RUN_SPEED * dt;
    const baseY = getGroundYAt(hazard.x + hazard.w / 2) - hazard.h;

    if (hazard.bounce) {
        if (hazard.squishTimer > 0) {
            hazard.squishTimer -= dt;
            const progress = 1 - hazard.squishTimer / POOL_TUBE_SQUISH_DURATION;
            const squish = Math.sin(progress * Math.PI);
            hazard.squishScaleY = 1 - 0.3 * squish;
            hazard.squishScaleX = 1 + 0.2 * squish;
            hazard.bounceOffsetY = 0;

            if (hazard.squishTimer <= 0) {
                hazard.squishScaleX = 1;
                hazard.squishScaleY = 1;
                const maxH = POOL_TUBE_BOUNCE_RATIO * hazard.h;
                hazard.bounceVY = -Math.sqrt(2 * POOL_TUBE_GRAVITY * maxH);
            }
        } else {
            hazard.bounceVY += POOL_TUBE_GRAVITY * dt;
            hazard.bounceOffsetY += hazard.bounceVY * dt;

            if (hazard.bounceOffsetY >= 0) {
                hazard.bounceOffsetY = 0;
                hazard.bounceVY = 0;
                hazard.squishTimer = POOL_TUBE_SQUISH_DURATION;
            }
        }
        hazard.y = baseY + hazard.bounceOffsetY;
        hazard.angle += hazard.spinSpeed * dt;
    } else {
        hazard.y = baseY;
    }

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

export function isIguana(hazard) {
    return hazard.typeKey === 'oldIguana' || hazard.typeKey === 'tieDyeIguana';
}

export function punchHazard(hazard) {
    hazard.punched = true;
    hazard.punchVY = -500;
    hazard.punchVX = 80;
    hazard.punchSpin = 0;
    hazard.punchTimer = 0;
}

export function checkGroundHazardCollision(turkeyRect, hazard) {
    if (hazard.punched) return false;
    if (hazard.hitShape === 'circle') {
        return circleRectOverlap(getGroundHazardHitCircle(hazard), turkeyRect);
    }
    return turkeyRect.x < hazard.x + hazard.w &&
           turkeyRect.x + turkeyRect.w > hazard.x &&
           turkeyRect.y < hazard.y + hazard.h &&
           turkeyRect.y + turkeyRect.h > hazard.y;
}

export function renderGroundHazard(ctx, hazard, punchable) {
    if (hazard.punched) {
        const alpha = Math.max(0, 1 - hazard.punchTimer * 0.6);
        if (alpha <= 0) return;
        ctx.save();
        const cx = hazard.x + hazard.w / 2;
        const cy = hazard.y + hazard.h / 2;
        ctx.translate(cx, cy);
        ctx.rotate(hazard.punchSpin);
        const scale = 1 + hazard.punchTimer * 0.4;
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        if (hazard.animator && hasAnimation(hazard.animKey)) {
            const s = hazard.drawScale;
            const dw = hazard.w * s;
            const dh = hazard.h * s;
            if (hazard.flipX) ctx.scale(-1, 1);
            drawAnimator(ctx, hazard.animator, -dw / 2, -dh / 2, dw, dh);
        } else {
            ctx.fillStyle = hazard.fallbackColor;
            ctx.fillRect(-hazard.w / 2, -hazard.h / 2, hazard.w, hazard.h);
        }
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#FF6600';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.strokeText('PUNCHED!', hazard.x + hazard.w / 2, hazard.y - 4);
        ctx.fillText('PUNCHED!', hazard.x + hazard.w / 2, hazard.y - 4);
        ctx.restore();
        return;
    }

    if (hazard.animator && hasAnimation(hazard.animKey)) {
        if (hazard.bounce) {
            ctx.save();
            const cx = hazard.x + hazard.w / 2;
            const cy = hazard.y + hazard.h / 2;
            ctx.translate(cx, cy);
            ctx.rotate(hazard.angle);
            ctx.scale(hazard.squishScaleX, hazard.squishScaleY);
            drawAnimator(ctx, hazard.animator, -hazard.w / 2, -hazard.h / 2, hazard.w, hazard.h);
            ctx.restore();
        } else if (hazard.flipX || hazard.drawScale !== 1) {
            ctx.save();
            const cx = hazard.x + hazard.w / 2;
            const cy = hazard.y + hazard.h / 2;
            const s = hazard.drawScale;
            const dw = hazard.w * s;
            const dh = hazard.h * s;
            ctx.translate(cx, cy);
            if (hazard.flipX) ctx.scale(-1, 1);
            drawAnimator(ctx, hazard.animator, -dw / 2, -dh / 2, dw, dh);
            ctx.restore();
        } else {
            drawAnimator(ctx, hazard.animator, hazard.x, hazard.y, hazard.w, hazard.h);
        }
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

    if (punchable && isIguana(hazard)) {
        ctx.save();
        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = '#FF6600';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const starX = hazard.x + hazard.w / 2;
        const starY = hazard.y - 2;
        ctx.strokeText('*', starX, starY);
        ctx.fillText('*', starX, starY);
        ctx.restore();
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
