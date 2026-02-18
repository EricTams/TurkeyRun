// AIDEV-NOTE: Laser hazards (chunk 9). Two variants:
// - Static: horizontal beams at fixed heights that cycle warning/active.
// - Sweeping: beams that rotate around a ceiling/ground pivot through an arc.
// Both are safe during warning phase (thin dashed line) and deadly during
// active phase (thick bright beam). The warning flash rate increases as the
// active phase approaches, telegraphing danger.

import {
    AUTO_RUN_SPEED, GROUND_Y,
    LASER_BEAM_THICKNESS, LASER_WARNING_THICKNESS,
    LASER_STATIC_WIDTH, LASER_STATIC_WARNING_DURATION, LASER_STATIC_ACTIVE_DURATION,
    LASER_SWEEP_LENGTH, LASER_SWEEP_WARNING_DURATION, LASER_SWEEP_ACTIVE_DURATION,
    LASER_SWEEP_SPEED, LASER_SWEEP_ARC
} from '../config.js';
import { rectsOverlap } from '../collision.js';
import { drawAnimationFrame, getAnimationFrameCount } from '../animation.js';

// Phase constants
const PHASE_WARNING = 'warning';
const PHASE_ACTIVE = 'active';

// Colors
const WARNING_COLOR_BASE = [255, 50, 50];
const ACTIVE_COLOR = '#FFFFFF';
const ACTIVE_GLOW_COLOR = 'rgba(160, 220, 255, 0.35)';
const ACTIVE_CENTER_COLOR = '#FFFFFF';
const EMITTER_COLOR = '#FF4500';
const EMITTER_INNER_COLOR = '#FFAA00';
const LIGHTNING_SEGMENTS = 16;
const LIGHTNING_JITTER = 12;
const JELLY_SIZE = 56;

// -----------------------------------------------------------------------
// Factory functions
// -----------------------------------------------------------------------

export function createStaticLaser(x, beamY, beamWidth) {
    return {
        type: 'static',
        x,
        beamY,
        beamWidth: beamWidth || LASER_STATIC_WIDTH,
        phase: PHASE_WARNING,
        timer: LASER_STATIC_WARNING_DURATION,
        warningDuration: LASER_STATIC_WARNING_DURATION,
        activeDuration: LASER_STATIC_ACTIVE_DURATION,
        age: 0
    };
}

export function createSweepLaser(pivotX, pivotY, angleMin, angleMax, sweepSpeed) {
    return {
        type: 'sweep',
        pivotX,
        pivotY,
        beamLength: LASER_SWEEP_LENGTH,
        angle: angleMin,
        angleMin,
        angleMax,
        sweepSpeed: sweepSpeed || LASER_SWEEP_SPEED,
        sweepDir: 1,
        phase: PHASE_WARNING,
        timer: LASER_SWEEP_WARNING_DURATION,
        warningDuration: LASER_SWEEP_WARNING_DURATION,
        activeDuration: LASER_SWEEP_ACTIVE_DURATION,
        age: 0
    };
}

// -----------------------------------------------------------------------
// Update
// -----------------------------------------------------------------------

export function updateLaser(laser, dt) {
    laser.age += dt;

    // Scroll with world
    if (laser.type === 'static') {
        laser.x -= AUTO_RUN_SPEED * dt;
    } else {
        laser.pivotX -= AUTO_RUN_SPEED * dt;
    }

    // Phase cycling
    laser.timer -= dt;
    if (laser.timer <= 0) {
        if (laser.phase === PHASE_WARNING) {
            laser.phase = PHASE_ACTIVE;
            laser.timer = laser.activeDuration;
        } else {
            laser.phase = PHASE_WARNING;
            laser.timer = laser.warningDuration;
        }
    }

    // Sweep animation (sweep type only)
    if (laser.type === 'sweep') {
        laser.angle += laser.sweepSpeed * laser.sweepDir * dt;
        if (laser.angle >= laser.angleMax) {
            laser.angle = laser.angleMax;
            laser.sweepDir = -1;
        } else if (laser.angle <= laser.angleMin) {
            laser.angle = laser.angleMin;
            laser.sweepDir = 1;
        }
    }
}

// -----------------------------------------------------------------------
// Off-screen culling
// -----------------------------------------------------------------------

export function isLaserOffScreen(laser) {
    if (laser.type === 'static') {
        return laser.x + laser.beamWidth < 0;
    }
    // Sweep: pivot plus max possible rightward reach
    return laser.pivotX + laser.beamLength < 0;
}

// -----------------------------------------------------------------------
// Collision
// -----------------------------------------------------------------------

export function checkLaserCollision(turkeyRect, laser) {
    if (laser.phase !== PHASE_ACTIVE) return false;

    if (laser.type === 'static') {
        return rectsOverlap(turkeyRect, {
            x: laser.x,
            y: laser.beamY - LASER_BEAM_THICKNESS / 2,
            w: laser.beamWidth,
            h: LASER_BEAM_THICKNESS
        });
    }

    // Sweep: transform turkey center into beam-local coordinates.
    // In local space the beam is axis-aligned from (0,0) to (beamLength,0).
    // Inflate by turkey half-dimensions for conservative overlap check.
    const cx = turkeyRect.x + turkeyRect.w / 2;
    const cy = turkeyRect.y + turkeyRect.h / 2;
    const dx = cx - laser.pivotX;
    const dy = cy - laser.pivotY;
    const cosA = Math.cos(-laser.angle);
    const sinA = Math.sin(-laser.angle);
    const localX = dx * cosA - dy * sinA;
    const localY = dx * sinA + dy * cosA;

    const halfW = turkeyRect.w / 2;
    const halfH = turkeyRect.h / 2;
    const halfThick = LASER_BEAM_THICKNESS / 2;

    return localX >= -halfW && localX <= laser.beamLength + halfW &&
           localY >= -halfThick - halfH && localY <= halfThick + halfH;
}

// -----------------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------------

export function renderLaser(ctx, laser) {
    if (laser.type === 'static') {
        renderStaticLaser(ctx, laser);
    } else {
        renderSweepLaser(ctx, laser);
    }
}

// Warning flash alpha -- increases in urgency as the active phase approaches
function warningAlpha(timer, warningDuration) {
    const urgency = 1 - (timer / warningDuration);
    const flashRate = 4 + urgency * 8;
    return 0.3 + 0.4 * Math.abs(Math.sin(timer * flashRate * Math.PI));
}

function renderStaticLaser(ctx, laser) {
    const { x, beamY, beamWidth, phase, timer, warningDuration, age } = laser;
    const x2 = x + beamWidth;

    if (phase === PHASE_WARNING) {
        const alpha = warningAlpha(timer, warningDuration);
        const [r, g, b] = WARNING_COLOR_BASE;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.lineWidth = LASER_WARNING_THICKNESS;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(x, beamY);
        ctx.lineTo(x2, beamY);
        ctx.stroke();
        ctx.setLineDash([]);
    } else {
        drawLightningBeam(ctx, x, beamY, x2, beamY, LASER_BEAM_THICKNESS, age);
    }

    drawJellyEmitter(ctx, x, beamY, x2, beamY, phase, age, 4);
    drawJellyEmitter(ctx, x2, beamY, x, beamY, phase, age + 0.3, 4);
}

function renderSweepLaser(ctx, laser) {
    const { pivotX, pivotY, beamLength, angle, phase, timer, warningDuration, age } = laser;
    const endX = pivotX + Math.cos(angle) * beamLength;
    const endY = pivotY + Math.sin(angle) * beamLength;

    if (phase === PHASE_WARNING) {
        const alpha = warningAlpha(timer, warningDuration);
        const [r, g, b] = WARNING_COLOR_BASE;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.lineWidth = LASER_WARNING_THICKNESS;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
    } else {
        drawLightningBeam(ctx, pivotX, pivotY, endX, endY, LASER_BEAM_THICKNESS, age);
    }

    drawJellyEmitter(ctx, pivotX, pivotY, endX, endY, phase, age, 6);
    drawJellyEmitter(ctx, endX, endY, pivotX, pivotY, phase, age + 0.3, 6);
}

function drawEmitterNode(ctx, x, y, radius) {
    ctx.fillStyle = EMITTER_COLOR;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = EMITTER_INNER_COLOR;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawLightningBeam(ctx, x1, y1, x2, y2, thickness, age) {
    const points = buildLightningPoints(x1, y1, x2, y2, age);

    // Glow pass
    ctx.strokeStyle = ACTIVE_GLOW_COLOR;
    ctx.lineWidth = thickness * 2.2;
    strokePolyline(ctx, points);

    // Core pass
    ctx.strokeStyle = ACTIVE_COLOR;
    ctx.lineWidth = thickness * 0.9;
    strokePolyline(ctx, points);

    // Hot center pass
    ctx.strokeStyle = ACTIVE_CENTER_COLOR;
    ctx.lineWidth = 2;
    strokePolyline(ctx, points);
}

function strokePolyline(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
}

function buildLightningPoints(x1, y1, x2, y2, age) {
    const points = [{ x: x1, y: y1 }];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    for (let i = 1; i < LIGHTNING_SEGMENTS; i++) {
        const t = i / LIGHTNING_SEGMENTS;
        const baseX = x1 + dx * t;
        const baseY = y1 + dy * t;
        const flicker = Math.sin(age * 34 + i * 2.7) + Math.sin(age * 21 - i * 1.9);
        const offset = (flicker * 0.5) * LIGHTNING_JITTER;
        points.push({
            x: baseX + nx * offset,
            y: baseY + ny * offset
        });
    }

    points.push({ x: x2, y: y2 });
    return points;
}

function drawJellyEmitter(ctx, x, y, targetX, targetY, phase, age, fallbackRadius) {
    const animName = getJellyAnimName(phase);
    const frameCount = getAnimationFrameCount(animName);
    if (frameCount <= 0) {
        drawEmitterNode(ctx, x, y, fallbackRadius);
        return;
    }

    const fps = animName === 'laserJellyElectric' ? 10 : 8;
    const frameIndex = Math.floor(age * fps) % frameCount;
    const angle = Math.atan2(targetY - y, targetX - x) - Math.PI / 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    drawAnimationFrame(ctx, animName, frameIndex, -JELLY_SIZE / 2, -JELLY_SIZE / 2, JELLY_SIZE, JELLY_SIZE);
    ctx.restore();
}

function getJellyAnimName(phase) {
    if (phase === PHASE_ACTIVE) return 'laserJellyElectric';
    if (phase === PHASE_WARNING) return 'laserJellyIntoElectric';
    return 'laserJellyIdle';
}
