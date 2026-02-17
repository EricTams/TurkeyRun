// AIDEV-NOTE: Homing bird hazard (chunk 8). Birds spawn off-screen right with
// a flashing warning indicator, then steer toward the player at fixed speed.
// Steering is limited by BIRD_TURN_RATE (radians/s) so the player can dodge
// with a well-timed vertical change -- the bird overshoots and curves back.
// Instant kill on contact during the active phase.

import {
    CANVAS_WIDTH, GROUND_Y,
    BIRD_WIDTH, BIRD_HEIGHT, BIRD_SPEED, BIRD_TURN_RATE, BIRD_WARNING_DURATION
} from '../config.js';
import { drawSprite } from '../sprites.js';
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
    return {
        x: CANVAS_WIDTH + BIRD_WIDTH,
        y: targetY,
        angle: Math.PI,   // facing left (toward the player)
        state: STATE_WARNING,
        warningTimer: BIRD_WARNING_DURATION
    };
}

export function updateBird(bird, dt, turkeyCenterX, turkeyCenterY) {
    if (bird.state === STATE_WARNING) {
        bird.warningTimer -= dt;
        if (bird.warningTimer <= 0) {
            bird.state = STATE_ACTIVE;
        }
        return;
    }

    // Desired angle toward turkey center
    const birdCX = bird.x + BIRD_WIDTH / 2;
    const birdCY = bird.y + BIRD_HEIGHT / 2;
    const dx = turkeyCenterX - birdCX;
    const dy = turkeyCenterY - birdCY;
    const desiredAngle = Math.atan2(dy, dx);

    // Steer toward desired angle, limited by turn rate
    let angleDiff = desiredAngle - bird.angle;
    // Normalize to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    const maxTurn = BIRD_TURN_RATE * dt;
    if (Math.abs(angleDiff) <= maxTurn) {
        bird.angle = desiredAngle;
    } else {
        bird.angle += Math.sign(angleDiff) * maxTurn;
    }

    // Move along current heading
    bird.x += Math.cos(bird.angle) * BIRD_SPEED * dt;
    bird.y += Math.sin(bird.angle) * BIRD_SPEED * dt;
}

export function isBirdOffScreen(bird) {
    if (bird.state === STATE_WARNING) return false;
    return bird.x + BIRD_WIDTH < -80 ||
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
    if (bird.state === STATE_WARNING) {
        renderWarningIndicator(ctx, bird);
        return;
    }
    drawSprite(ctx, 'bird', bird.x, bird.y, BIRD_WIDTH, BIRD_HEIGHT, BIRD_COLOR);
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
