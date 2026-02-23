// AIDEV-NOTE: Homing bird hazard (chunk 8, updated chunk 12B).
// Birds spawn off-screen right with a flashing warning indicator, then fly
// toward the player using angle-based steering limited by BIRD_TURN_RATE.
// After BIRD_TRACKING_DURATION the bird locks its heading and flies straight.
// Chunk 12B change: horizontal speed is pinned to BIRD_X_SPEED (constant)
// so arrival time is deterministic. Y-movement still uses sin(angle)*BIRD_SPEED.

import {
    CANVAS_WIDTH, GROUND_Y,
    BIRD_WIDTH, BIRD_HEIGHT, BIRD_SPEED, BIRD_X_SPEED, GRACKLE_TURN_RATE,
    BIRD_WARNING_DURATION, BIRD_TRACKING_DURATION, GRACKLE_TRACKING_DURATION,
    BOAR_WARNING_DURATION,
    DEBUG_SHOW_HITBOX,
    BOAR_VERTICAL_TRACK_SPEED, BOAR_DASH_X_SPEED
} from '../config.js';
import { createAnimator, setAnimation, updateAnimator, drawAnimator, hasAnimation } from '../animation.js';
import { rectsOverlap } from '../collision.js';

const BIRD_COLOR = '#8B0000';          // dark red fallback rectangle
const WARNING_COLOR = '#FF0000';
const WARNING_FLASH_RATE = 6;          // full cycles per second
const WARNING_ARROW_SIZE = 10;
const WARNING_ARROW_X = 12;            // inset from right edge
const BIRD_GLOW_GRACKLE = 'rgba(255, 154, 102, 0.9)';
const BIRD_GLOW_BOAR = 'rgba(255, 122, 61, 0.9)';
const BIRD_GLOW_BLUR = 10;

const STATE_WARNING = 'warning';
const STATE_ACTIVE = 'active';
const STATE_PUNCHED = 'punched';
const BIRD_TYPE_GRACKLE = 'grackle';
const BIRD_TYPE_BOAR = 'boar';

let punchedBirds = [];

export function punchBird(bird) {
    bird.state = STATE_PUNCHED;
    bird.punchVY = -600;
    bird.punchSpin = 0;
    bird.punchTimer = 0;
    punchedBirds.push(bird);
}

export function updatePunchedBirds(dt) {
    for (const b of punchedBirds) {
        b.punchTimer += dt;
        b.punchVY += 1200 * dt;
        b.y += b.punchVY * dt;
        b.x += 60 * dt;
        b.punchSpin += 12 * dt;
    }
    punchedBirds = punchedBirds.filter(b => b.y < GROUND_Y + 400);
}

export function renderPunchedBirds(ctx) {
    for (const b of punchedBirds) {
        const useAnim = b.animator && hasAnimation(b.animator.currentAnim);
        ctx.save();
        const cx = b.x + BIRD_WIDTH / 2;
        const cy = b.y + BIRD_HEIGHT / 2;
        ctx.translate(cx, cy);
        ctx.rotate(b.punchSpin);
        const scale = 1 + b.punchTimer * 0.5;
        ctx.scale(scale, scale);
        ctx.globalAlpha = Math.max(0, 1 - b.punchTimer * 0.6);
        if (useAnim) {
            drawAnimator(ctx, b.animator, -BIRD_WIDTH / 2, -BIRD_HEIGHT / 2, BIRD_WIDTH, BIRD_HEIGHT);
        } else {
            ctx.fillStyle = BIRD_COLOR;
            ctx.fillRect(-BIRD_WIDTH / 2, -BIRD_HEIGHT / 2, BIRD_WIDTH, BIRD_HEIGHT);
        }
        ctx.restore();

        // "PUNCHED!" text that follows the tumbling bird
        const alpha = Math.max(0, 1 - b.punchTimer * 0.6);
        if (alpha > 0) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = 'bold 16px monospace';
            ctx.fillStyle = '#FF6600';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.strokeText('PUNCHED!', b.x + BIRD_WIDTH / 2, b.y - 4);
            ctx.fillText('PUNCHED!', b.x + BIRD_WIDTH / 2, b.y - 4);
            ctx.restore();
        }
    }
}

export function resetPunchedBirds() {
    punchedBirds = [];
}

// -----------------------------------------------------------------------
// Create / update / cull
// -----------------------------------------------------------------------

export function createBird(targetY, type = BIRD_TYPE_GRACKLE) {
    const warningDuration = type === BIRD_TYPE_BOAR
        ? BOAR_WARNING_DURATION
        : BIRD_WARNING_DURATION;
    const bird = {
        type,
        x: CANVAS_WIDTH + BIRD_WIDTH,
        y: targetY,
        angle: Math.PI,   // facing left (toward the player)
        state: STATE_WARNING,
        warningTimer: warningDuration,
        trackingTimer: 0,  // time spent actively tracking (stops at BIRD_TRACKING_DURATION)
        animator: createAnimator()
    };
    if (bird.type === BIRD_TYPE_BOAR) {
        setAnimation(bird.animator, 'boarFly', { loop: true });
    } else {
        setAnimation(bird.animator, 'birdStart', { loop: true });
    }
    return bird;
}

export function updateBird(bird, dt, turkeyCenterX, turkeyCenterY) {
    if (bird.state === STATE_PUNCHED) return;

    if (shouldLockGrackleStartFrame(bird)) {
        bird.animator.frameIndex = 0;
        bird.animator.elapsed = 0;
    } else {
        updateAnimator(bird.animator, dt);
    }

    if (bird.state === STATE_WARNING) {
        bird.warningTimer -= dt;
        if (bird.warningTimer <= 0) {
            bird.state = STATE_ACTIVE;
            bird.trackingTimer = 0;
        }
        return;
    }

    // Track how long we've been steering
    bird.trackingTimer += dt;

    if (bird.type === BIRD_TYPE_BOAR) {
        updateBoarMovement(bird, dt, turkeyCenterY);
        return;
    }

    // Only steer toward the player while within the tracking window
    if (bird.trackingTimer < GRACKLE_TRACKING_DURATION) {
        const birdCX = bird.x + BIRD_WIDTH / 2;
        const birdCY = bird.y + BIRD_HEIGHT / 2;
        const dx = turkeyCenterX - birdCX;
        const dy = turkeyCenterY - birdCY;
        const desiredAngle = Math.atan2(dy, dx);

        let angleDiff = desiredAngle - bird.angle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        const maxTurn = GRACKLE_TURN_RATE * dt;
        if (Math.abs(angleDiff) <= maxTurn) {
            bird.angle = desiredAngle;
        } else {
            bird.angle += Math.sign(angleDiff) * maxTurn;
        }
    } else if (bird.animator.currentAnim !== 'birdFly') {
        setAnimation(bird.animator, 'birdFly', { loop: true });
    }
    // After tracking duration expires: heading is locked, bird flies straight.

    // Constant horizontal speed (chunk 12B: pinned x so arrival time is deterministic)
    bird.x -= BIRD_X_SPEED * dt;
    // Vertical movement from the aiming angle (original steering system)
    bird.y += Math.sin(bird.angle) * BIRD_SPEED * dt;
}

function updateBoarMovement(bird, dt, turkeyCenterY) {
    if (bird.trackingTimer < BIRD_TRACKING_DURATION) {
        const desiredY = turkeyCenterY - BIRD_HEIGHT / 2;
        const dy = desiredY - bird.y;
        const maxStep = BOAR_VERTICAL_TRACK_SPEED * dt;
        if (Math.abs(dy) <= maxStep) {
            bird.y = desiredY;
        } else {
            bird.y += Math.sign(dy) * maxStep;
        }
        const minY = 0;
        const maxY = GROUND_Y - BIRD_HEIGHT;
        bird.y = Math.max(minY, Math.min(bird.y, maxY));
        return;
    }
    bird.x -= BOAR_DASH_X_SPEED * dt;
}

function shouldLockGrackleStartFrame(bird) {
    if (bird.type !== BIRD_TYPE_GRACKLE) return false;
    if (bird.animator.currentAnim !== 'birdStart') return false;
    if (bird.state === STATE_WARNING) return true;
    return bird.state === STATE_ACTIVE && bird.trackingTimer < GRACKLE_TRACKING_DURATION;
}

export function isBirdOffScreen(bird) {
    if (bird.state === STATE_WARNING) return false;
    if (bird.state === STATE_PUNCHED) return true;
    return bird.x + BIRD_WIDTH < -80 ||
           bird.x > CANVAS_WIDTH + 200 ||
           bird.y + BIRD_HEIGHT < -120 ||
           bird.y > GROUND_Y + 120;
}

// -----------------------------------------------------------------------
// Collision
// -----------------------------------------------------------------------

export function checkBirdCollision(turkeyRect, bird) {
    if (bird.state !== STATE_ACTIVE) return false;
    return rectsOverlap(turkeyRect, {
        x: bird.x, y: bird.y,
        w: BIRD_WIDTH, h: BIRD_HEIGHT
    });
}

// -----------------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------------

export function renderBird(ctx, bird, punchable) {
    const useAnim = bird.animator && hasAnimation(bird.animator.currentAnim);

    if (bird.state === STATE_WARNING) {
        renderWarningIndicator(ctx, bird, punchable);
        if (useAnim) {
            const peekX = CANVAS_WIDTH - 10;
            const peekY = bird.y;
            ctx.save();
            ctx.translate(peekX + BIRD_WIDTH / 2, peekY + BIRD_HEIGHT / 2);
            ctx.scale(-1, 1);
            applyBirdGlow(ctx, bird);
            drawAnimator(ctx, bird.animator, -BIRD_WIDTH / 2, -BIRD_HEIGHT / 2, BIRD_WIDTH, BIRD_HEIGHT);
            ctx.restore();
        }
        return;
    }

    if (bird.state === STATE_PUNCHED) return;

    if (useAnim) {
        ctx.save();
        const cx = bird.x + BIRD_WIDTH / 2;
        const cy = bird.y + BIRD_HEIGHT / 2;
        ctx.translate(cx, cy);
        ctx.scale(-1, 1);
        if (bird.type !== BIRD_TYPE_BOAR) {
            ctx.rotate(-(bird.angle - Math.PI));
        }
        applyBirdGlow(ctx, bird);
        drawAnimator(ctx, bird.animator, -BIRD_WIDTH / 2, -BIRD_HEIGHT / 2, BIRD_WIDTH, BIRD_HEIGHT);
        ctx.restore();
    } else {
        ctx.fillStyle = BIRD_COLOR;
        ctx.fillRect(bird.x, bird.y, BIRD_WIDTH, BIRD_HEIGHT);
    }

    if (punchable) {
        ctx.save();
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = '#FF6600';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const starX = bird.x + BIRD_WIDTH / 2;
        const starY = bird.y - 2;
        ctx.strokeText('*', starX, starY);
        ctx.fillText('*', starX, starY);
        ctx.restore();
    }

    if (DEBUG_SHOW_HITBOX) {
        ctx.save();
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(bird.x, bird.y, BIRD_WIDTH, BIRD_HEIGHT);
        ctx.restore();
    }
}

function renderWarningIndicator(ctx, bird, punchable) {
    const flash = Math.sin(bird.warningTimer * WARNING_FLASH_RATE * Math.PI * 2);
    if (flash < 0) return;

    const centerY = bird.y + BIRD_HEIGHT / 2;
    const arrowTipX = CANVAS_WIDTH - WARNING_ARROW_X;

    ctx.fillStyle = punchable ? '#FF6600' : WARNING_COLOR;
    ctx.beginPath();
    ctx.moveTo(arrowTipX, centerY);
    ctx.lineTo(arrowTipX - WARNING_ARROW_SIZE, centerY - WARNING_ARROW_SIZE);
    ctx.lineTo(arrowTipX - WARNING_ARROW_SIZE, centerY + WARNING_ARROW_SIZE);
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(punchable ? '*' : '!', arrowTipX - WARNING_ARROW_SIZE - 4, centerY);
}

function applyBirdGlow(ctx, bird) {
    // drawImage shadow follows transparent sprite edges, producing a clean silhouette glow.
    ctx.shadowBlur = BIRD_GLOW_BLUR;
    ctx.shadowColor = bird.type === BIRD_TYPE_BOAR ? BIRD_GLOW_BOAR : BIRD_GLOW_GRACKLE;
}
