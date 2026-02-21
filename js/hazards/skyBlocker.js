import {
    CANVAS_WIDTH, AUTO_RUN_SPEED, DEBUG_SHOW_HITBOX,
    PUFFERFISH_SIZE, PUFFERFISH_ROTATE_SPEED,
    SMALL_ASTEROID_SIZE, MEDIUM_ASTEROID_SIZE, LARGE_ASTEROID_SIZE,
    ASTEROID_ROTATE_SPEED,
    UFO_SIZE, THOUGHT_BUBBLE_SIZE
} from '../config.js';
import {
    createAnimator, setAnimation, updateAnimator, drawAnimator, hasAnimation
} from '../animation.js';
import { circleRectOverlap } from '../collision.js';

const SKY_BLOCKER_DEFS = {
    pufferfish: {
        animKey: 'pufferfishIdle',
        size: PUFFERFISH_SIZE,
        fallbackColor: '#FFD700',
        rotateSpeed: PUFFERFISH_ROTATE_SPEED,
    },
    smallAsteroid: {
        animKey: 'smallAsteroidIdle',
        size: SMALL_ASTEROID_SIZE,
        fallbackColor: '#808080',
        rotateSpeed: ASTEROID_ROTATE_SPEED,
    },
    mediumAsteroid: {
        animKey: 'mediumAsteroidIdle',
        size: MEDIUM_ASTEROID_SIZE,
        fallbackColor: '#6A6A6A',
        rotateSpeed: ASTEROID_ROTATE_SPEED,
    },
    largeAsteroid: {
        animKey: 'largeAsteroidIdle',
        size: LARGE_ASTEROID_SIZE,
        fallbackColor: '#5A5A5A',
        rotateSpeed: ASTEROID_ROTATE_SPEED,
    },
    ufo: {
        animKey: 'ufoFly',
        size: UFO_SIZE,
        fallbackColor: '#8B5CF6',
        rotateSpeed: 0,
    },
    thoughtBubble: {
        animKey: 'thoughtBubbleSpin',
        size: THOUGHT_BUBBLE_SIZE,
        fallbackColor: '#FFD700',
        rotateSpeed: 0,
    },
};

export function createSkyBlocker(typeKey, y) {
    const def = SKY_BLOCKER_DEFS[typeKey];
    if (!def) throw new Error(`Unknown sky blocker type: ${typeKey}`);

    const blocker = {
        x: CANVAS_WIDTH,
        y,
        size: def.size,
        animKey: def.animKey,
        fallbackColor: def.fallbackColor,
        rotateSpeed: def.rotateSpeed * (0.8 + Math.random() * 0.4),
        angle: Math.random() * Math.PI * 2,
        animator: createAnimator()
    };
    setAnimation(blocker.animator, def.animKey, { loop: true });
    return blocker;
}

export function updateSkyBlocker(blocker, dt) {
    blocker.x -= AUTO_RUN_SPEED * dt;
    blocker.angle += blocker.rotateSpeed * dt;
    updateAnimator(blocker.animator, dt);
}

export function isSkyBlockerOffScreen(blocker) {
    return blocker.x + blocker.size < 0;
}

function getHitCircle(blocker) {
    return {
        cx: blocker.x + blocker.size / 2,
        cy: blocker.y + blocker.size / 2,
        r: blocker.size / 2
    };
}

export function checkSkyBlockerCollision(turkeyRect, blocker) {
    return circleRectOverlap(getHitCircle(blocker), turkeyRect);
}

export function renderSkyBlocker(ctx, blocker) {
    const cx = blocker.x + blocker.size / 2;
    const cy = blocker.y + blocker.size / 2;
    const half = blocker.size / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(blocker.angle);

    if (hasAnimation(blocker.animKey)) {
        drawAnimator(ctx, blocker.animator, -half, -half, blocker.size, blocker.size);
    } else {
        ctx.fillStyle = blocker.fallbackColor;
        ctx.beginPath();
        ctx.arc(0, 0, half, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();

    if (DEBUG_SHOW_HITBOX) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, half, 0, Math.PI * 2);
        ctx.stroke();
    }
}
