import {
    CANVAS_WIDTH, AUTO_RUN_SPEED, DEBUG_SHOW_HITBOX,
    PUFFERFISH_SIZE, PUFFERFISH_ROTATE_SPEED
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
    }
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
        angle: 0,
        animator: createAnimator()
    };
    setAnimation(blocker.animator, def.animKey, { loop: true });
    return blocker;
}

export function updateSkyBlocker(blocker, dt) {
    blocker.x -= AUTO_RUN_SPEED * dt;
    blocker.angle += PUFFERFISH_ROTATE_SPEED * dt;
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
