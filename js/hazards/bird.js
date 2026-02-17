// AIDEV-NOTE: Homing bird hazard (chunk 8, updated chunk 12B).
// Birds spawn off-screen right with a flashing warning indicator, then fly
// toward the player using angle-based steering limited by BIRD_TURN_RATE.
// After BIRD_TRACKING_DURATION the bird locks its heading and flies straight.
// Chunk 12B change: horizontal speed is pinned to BIRD_X_SPEED (constant)
// so arrival time is deterministic. Y-movement still uses sin(angle)*BIRD_SPEED.

import {
    CANVAS_WIDTH, GROUND_Y,
    BIRD_WIDTH, BIRD_HEIGHT, BIRD_SPEED, BIRD_X_SPEED, BIRD_TURN_RATE,
    BIRD_WARNING_DURATION, BIRD_TRACKING_DURATION
} from '../config.js';
import { createAnimator, setAnimation, updateAnimator, drawAnimator, hasAnimation } from '../animation.js';
import { rectsOverlap } from '../collision.js';

const BIRD_COLOR = '#8B0000';          // dark red fallback rectangle
const WARNING_COLOR = '#FF0000';
const WARNING_FLASH_RATE = 6;          // full cycles per second
const WARNING_ARROW_SIZE = 10;
const WARNING_ARROW_X = 12;            // inset from right edge

const STATE_WARNING = 'warning';
const STATE_ACTIVE = 'active';

// -----------------------------------------------------------------------
// Create / update / cull
// -----------------------------------------------------------------------

export function createBird(targetY) {
    const bird = {
        x: CANVAS_WIDTH + BIRD_WIDTH,
        y: targetY,
        angle: Math.PI,   // facing left (toward the player)
        state: STATE_WARNING,
        warningTimer: BIRD_WARNING_DURATION,
        trackingTimer: 0,  // time spent actively tracking (stops at BIRD_TRACKING_DURATION)
        animator: createAnimator()
    };
    setAnimation(bird.animator, 'birdStart', { loop: true });
    return bird;
}

export function updateBird(bird, dt, turkeyCenterX, turkeyCenterY) {
    updateAnimator(bird.animator, dt);

    if (bird.state === STATE_WARNING) {
        bird.warningTimer -= dt;
        if (bird.warningTimer <= 0) {
            bird.state = STATE_ACTIVE;
            bird.trackingTimer = 0;
            setAnimation(bird.animator, 'birdFly', { loop: true });
        }
        return;
    }

    // Track how long we've been steering
    bird.trackingTimer += dt;

    // Only steer toward the player while within the tracking window
    if (bird.trackingTimer < BIRD_TRACKING_DURATION) {
        const birdCX = bird.x + BIRD_WIDTH / 2;
        const birdCY = bird.y + BIRD_HEIGHT / 2;
        const dx = turkeyCenterX - birdCX;
        const dy = turkeyCenterY - birdCY;
        const desiredAngle = Math.atan2(dy, dx);

        let angleDiff = desiredAngle - bird.angle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        const maxTurn = BIRD_TURN_RATE * dt;
        if (Math.abs(angleDiff) <= maxTurn) {
            bird.angle = desiredAngle;
        } else {
            bird.angle += Math.sign(angleDiff) * maxTurn;
        }
    }
    // After tracking duration expires: heading is locked, bird flies straight.

    // Constant horizontal speed (chunk 12B: pinned x so arrival time is deterministic)
    bird.x -= BIRD_X_SPEED * dt;
    // Vertical movement from the aiming angle (original steering system)
    bird.y += Math.sin(bird.angle) * BIRD_SPEED * dt;
}

export function isBirdOffScreen(bird) {
    if (bird.state === STATE_WARNING) return false;
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

export function renderBird(ctx, bird) {
    const useAnim = hasAnimation('birdFly');

    if (bird.state === STATE_WARNING) {
        renderWarningIndicator(ctx, bird);
        // Draw the bird start animation peeking in from the right edge, flipped
        // so the beak points left (toward the player).
        if (useAnim) {
            const peekX = CANVAS_WIDTH - 10;
            const peekY = bird.y;
            ctx.save();
            ctx.translate(peekX + BIRD_WIDTH / 2, peekY + BIRD_HEIGHT / 2);
            ctx.scale(-1, 1);
            drawAnimator(ctx, bird.animator, -BIRD_WIDTH / 2, -BIRD_HEIGHT / 2, BIRD_WIDTH, BIRD_HEIGHT);
            ctx.restore();
        }
        return;
    }

    if (useAnim) {
        // Draw the flying bird rotated to match its heading angle.
        // The sprite art faces right; scale(-1,1) flips it to face left,
        // then rotation adjusts from that leftward baseline.
        ctx.save();
        const cx = bird.x + BIRD_WIDTH / 2;
        const cy = bird.y + BIRD_HEIGHT / 2;
        ctx.translate(cx, cy);
        ctx.scale(-1, 1);
        ctx.rotate(-(bird.angle - Math.PI));
        drawAnimator(ctx, bird.animator, -BIRD_WIDTH / 2, -BIRD_HEIGHT / 2, BIRD_WIDTH, BIRD_HEIGHT);
        ctx.restore();
    } else {
        // Fallback colored rectangle
        ctx.fillStyle = BIRD_COLOR;
        ctx.fillRect(bird.x, bird.y, BIRD_WIDTH, BIRD_HEIGHT);
    }
}

function renderWarningIndicator(ctx, bird) {
    // Flash on/off using a sine wave
    const flash = Math.sin(bird.warningTimer * WARNING_FLASH_RATE * Math.PI * 2);
    if (flash < 0) return; // invisible half of cycle

    const centerY = bird.y + BIRD_HEIGHT / 2;
    const arrowTipX = CANVAS_WIDTH - WARNING_ARROW_X;

    // Red triangle pointing left (indicating incoming threat)
    ctx.fillStyle = WARNING_COLOR;
    ctx.beginPath();
    ctx.moveTo(arrowTipX, centerY);
    ctx.lineTo(arrowTipX - WARNING_ARROW_SIZE, centerY - WARNING_ARROW_SIZE);
    ctx.lineTo(arrowTipX - WARNING_ARROW_SIZE, centerY + WARNING_ARROW_SIZE);
    ctx.closePath();
    ctx.fill();

    // Exclamation mark beside arrow
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', arrowTipX - WARNING_ARROW_SIZE - 4, centerY);
}
