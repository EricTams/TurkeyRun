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

// Phase constants
const PHASE_WARNING = 'warning';
const PHASE_ACTIVE = 'active';

// Colors
const WARNING_COLOR_BASE = [255, 50, 50];
const ACTIVE_COLOR = '#FF0000';
const ACTIVE_GLOW_COLOR = 'rgba(255, 80, 0, 0.25)';
const ACTIVE_CENTER_COLOR = '#FFFFFF';
const EMITTER_COLOR = '#FF4500';
const EMITTER_INNER_COLOR = '#FFAA00';

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
        activeDuration: LASER_STATIC_ACTIVE_DURATION
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
        activeDuration: LASER_SWEEP_ACTIVE_DURATION
    };
}

// -----------------------------------------------------------------------
// Update
// -----------------------------------------------------------------------

export function updateLaser(laser, dt) {
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
    const { x, beamY, beamWidth, phase, timer, warningDuration } = laser;

    if (phase === PHASE_WARNING) {
        const alpha = warningAlpha(timer, warningDuration);
        const [r, g, b] = WARNING_COLOR_BASE;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.lineWidth = LASER_WARNING_THICKNESS;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(x, beamY);
        ctx.lineTo(x + beamWidth, beamY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Emitter nodes at beam ends
        drawEmitterNode(ctx, x, beamY, 4);
        drawEmitterNode(ctx, x + beamWidth, beamY, 4);
    } else {
        // Outer glow
        ctx.fillStyle = ACTIVE_GLOW_COLOR;
        ctx.fillRect(x, beamY - LASER_BEAM_THICKNESS, beamWidth, LASER_BEAM_THICKNESS * 2);

        // Core beam
        ctx.fillStyle = ACTIVE_COLOR;
        ctx.fillRect(x, beamY - LASER_BEAM_THICKNESS / 2, beamWidth, LASER_BEAM_THICKNESS);

        // Bright center line
        ctx.fillStyle = ACTIVE_CENTER_COLOR;
        ctx.fillRect(x, beamY - 1, beamWidth, 2);

        // Emitter nodes at beam ends
        drawEmitterNode(ctx, x, beamY, 6);
        drawEmitterNode(ctx, x + beamWidth, beamY, 6);
    }
}

function renderSweepLaser(ctx, laser) {
    const { pivotX, pivotY, beamLength, angle, phase, timer, warningDuration } = laser;
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
        // Outer glow
        ctx.strokeStyle = ACTIVE_GLOW_COLOR;
        ctx.lineWidth = LASER_BEAM_THICKNESS * 3;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Core beam
        ctx.strokeStyle = ACTIVE_COLOR;
        ctx.lineWidth = LASER_BEAM_THICKNESS;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Bright center line
        ctx.strokeStyle = ACTIVE_CENTER_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    // Emitter node at pivot (always visible)
    drawEmitterNode(ctx, pivotX, pivotY, 8);
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
