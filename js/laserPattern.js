// Screen-space laser patterns defined by keyframed endpoints.
// Each laser has two endpoints (x1,y1)-(x2,y2) that lerp between keyframes.
// State per keyframe: "off" (invisible), "warn" (dashed line), "active" (deadly).

import { LASER_BEAM_THICKNESS, LASER_WARNING_THICKNESS } from './config.js';
import { drawAnimationFrame, getAnimationFrameCount } from './animation.js';

const WARNING_COLOR_BASE = [255, 50, 50];
const ACTIVE_COLOR = '#FFFFFF';
const ACTIVE_GLOW_COLOR = 'rgba(160, 220, 255, 0.35)';
const ACTIVE_CENTER_COLOR = '#FFFFFF';
const EMITTER_COLOR = '#FF4500';
const EMITTER_INNER_COLOR = '#FFAA00';
const REQUIRED_WARN_DURATION = 1.0;
const LIGHTNING_SEGMENTS = 16;
const LIGHTNING_JITTER = 12;
const JELLY_SIZE = 56;

// -----------------------------------------------------------------------
// Active pattern state
// -----------------------------------------------------------------------

let activePattern = null;

export function startLaserPattern(patternDef) {
    activePattern = {
        def: patternDef,
        lasers: patternDef.lasers.map((l) => {
            const loop = l.loop !== false;
            return {
                keyframes: l.keyframes,
                loop,
                elapsed: 0,
                cycleDuration: getCycleDuration(l.keyframes),
                activeStarts: collectActiveStartTimes(l.keyframes, loop),
            };
        }),
        elapsed: 0,
        duration: patternDef.duration,
    };
}

export function stopLaserPattern() { activePattern = null; }
export function isLaserPatternActive() { return activePattern !== null; }
export function getActivePatternName() { return activePattern ? activePattern.def.name : ''; }
export function getActivePatternElapsed() { return activePattern ? activePattern.elapsed : 0; }
export function getActivePatternDuration() { return activePattern ? activePattern.duration : 0; }

// -----------------------------------------------------------------------
// Keyframe interpolation
// -----------------------------------------------------------------------

function sampleLaser(laser, elapsed) {
    const { keyframes, loop } = laser;
    const n = keyframes.length;
    if (n === 0) return null;

    const lastT = keyframes[n - 1].t;
    let t = elapsed;
    if (loop && lastT > 0) {
        t = t % lastT;
    }

    if (t <= keyframes[0].t) {
        const k = keyframes[0];
        return {
            x1: k.x1, y1: k.y1, x2: k.x2, y2: k.y2,
            state: enforceWarnWindowState(k.state, t, laser),
        };
    }
    if (t >= lastT) {
        const k = keyframes[n - 1];
        return {
            x1: k.x1, y1: k.y1, x2: k.x2, y2: k.y2,
            state: enforceWarnWindowState(k.state, t, laser),
        };
    }

    let i = 0;
    while (i < n - 1 && keyframes[i + 1].t <= t) i++;

    const a = keyframes[i];
    const b = keyframes[i + 1];
    const seg = b.t - a.t;
    const frac = seg > 0 ? (t - a.t) / seg : 0;

    return {
        x1: a.x1 + (b.x1 - a.x1) * frac,
        y1: a.y1 + (b.y1 - a.y1) * frac,
        x2: a.x2 + (b.x2 - a.x2) * frac,
        y2: a.y2 + (b.y2 - a.y2) * frac,
        state: enforceWarnWindowState(a.state, t, laser),
    };
}

function getCycleDuration(keyframes) {
    if (!keyframes || keyframes.length === 0) return 0;
    return keyframes[keyframes.length - 1].t;
}

function collectActiveStartTimes(keyframes, loop) {
    if (!keyframes || keyframes.length === 0) return [];

    const starts = new Set();
    if (keyframes[0].state === 'active') starts.add(0);

    for (let i = 1; i < keyframes.length; i++) {
        const prev = keyframes[i - 1].state;
        const next = keyframes[i].state;
        if (prev !== 'active' && next === 'active') starts.add(keyframes[i].t);
    }

    if (loop && keyframes.length > 1) {
        const prev = keyframes[keyframes.length - 1].state;
        const next = keyframes[0].state;
        if (prev !== 'active' && next === 'active') starts.add(0);
    }

    return Array.from(starts).sort((a, b) => a - b);
}

function enforceWarnWindowState(rawState, t, laser) {
    if (rawState === 'active') return 'active';

    const starts = laser.activeStarts;
    if (!starts || starts.length === 0) return 'off';

    const dt = timeUntilNextActiveStart(t, starts, laser.loop, laser.cycleDuration);
    if (dt > 0 && dt <= REQUIRED_WARN_DURATION) return 'warn';
    return 'off';
}

function timeUntilNextActiveStart(t, starts, loop, cycleDuration) {
    let best = Infinity;

    for (const s of starts) {
        if (loop && cycleDuration > 0) {
            let dt = s - t;
            if (dt <= 0) dt += cycleDuration;
            if (dt < best) best = dt;
        } else {
            const dt = s - t;
            if (dt > 0 && dt < best) best = dt;
        }
    }

    return best;
}

// -----------------------------------------------------------------------
// Update -- returns true if pattern still active
// -----------------------------------------------------------------------

export function updateLaserPattern(dt) {
    if (!activePattern) return false;

    activePattern.elapsed += dt;
    if (activePattern.elapsed >= activePattern.duration) {
        activePattern = null;
        return false;
    }

    for (const laser of activePattern.lasers) {
        laser.elapsed += dt;
    }
    return true;
}

// -----------------------------------------------------------------------
// Collision
// -----------------------------------------------------------------------

export function checkLaserPatternCollision(turkeyRect) {
    if (!activePattern) return false;

    for (const laser of activePattern.lasers) {
        const s = sampleLaser(laser, laser.elapsed);
        if (!s || s.state !== 'active') continue;
        if (beamHitsRect(s.x1, s.y1, s.x2, s.y2, turkeyRect)) return true;
    }
    return false;
}

function beamHitsRect(x1, y1, x2, y2, rect) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return false;

    const angle = Math.atan2(dy, dx);
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);

    const cx = rect.x + rect.w / 2 - x1;
    const cy = rect.y + rect.h / 2 - y1;
    const lx = cx * cos - cy * sin;
    const ly = cx * sin + cy * cos;

    const hw = rect.w / 2;
    const hh = rect.h / 2;
    const ht = LASER_BEAM_THICKNESS / 2;

    return lx >= -hw && lx <= len + hw && ly >= -ht - hh && ly <= ht + hh;
}

// -----------------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------------

export function renderLaserPattern(ctx) {
    if (!activePattern) return;

    for (const laser of activePattern.lasers) {
        const s = sampleLaser(laser, laser.elapsed);
        if (!s) continue;
        renderBeam(ctx, s, laser.elapsed);
    }
}

function renderBeam(ctx, s, elapsed) {
    const { x1, y1, x2, y2, state } = s;

    if (state === 'off') {
        drawJellyEmitter(ctx, x1, y1, x2, y2, state, elapsed, 3);
        drawJellyEmitter(ctx, x2, y2, x1, y1, state, elapsed + 0.3, 3);
    } else if (state === 'warn') {
        const alpha = 0.3 + 0.4 * Math.abs(Math.sin(elapsed * 8 * Math.PI));
        ctx.strokeStyle = `rgba(${WARNING_COLOR_BASE[0]}, ${WARNING_COLOR_BASE[1]}, ${WARNING_COLOR_BASE[2]}, ${alpha})`;
        ctx.lineWidth = LASER_WARNING_THICKNESS;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        drawJellyEmitter(ctx, x1, y1, x2, y2, state, elapsed, 4);
        drawJellyEmitter(ctx, x2, y2, x1, y1, state, elapsed + 0.3, 4);
    } else if (state === 'active') {
        drawLightningBeam(ctx, x1, y1, x2, y2, LASER_BEAM_THICKNESS, elapsed);
        drawJellyEmitter(ctx, x1, y1, x2, y2, state, elapsed, 6);
        drawJellyEmitter(ctx, x2, y2, x1, y1, state, elapsed + 0.3, 6);
    }
}

function drawEmitter(ctx, x, y, radius, outerColor = EMITTER_COLOR, innerColor = EMITTER_INNER_COLOR) {
    ctx.fillStyle = outerColor;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = innerColor;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawLightningBeam(ctx, x1, y1, x2, y2, thickness, elapsed) {
    const points = buildLightningPoints(x1, y1, x2, y2, elapsed);

    ctx.strokeStyle = ACTIVE_GLOW_COLOR;
    ctx.lineWidth = thickness * 2.2;
    strokePolyline(ctx, points);

    ctx.strokeStyle = ACTIVE_COLOR;
    ctx.lineWidth = thickness * 0.9;
    strokePolyline(ctx, points);

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

function buildLightningPoints(x1, y1, x2, y2, elapsed) {
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
        const flicker = Math.sin(elapsed * 34 + i * 2.7) + Math.sin(elapsed * 21 - i * 1.9);
        const offset = (flicker * 0.5) * LIGHTNING_JITTER;
        points.push({
            x: baseX + nx * offset,
            y: baseY + ny * offset,
        });
    }

    points.push({ x: x2, y: y2 });
    return points;
}

function drawJellyEmitter(ctx, x, y, targetX, targetY, state, elapsed, fallbackRadius) {
    const animName = getJellyAnimName(state);
    const frameCount = getAnimationFrameCount(animName);
    if (frameCount <= 0) {
        drawEmitter(ctx, x, y, fallbackRadius);
        return;
    }

    const fps = animName === 'laserJellyElectric' ? 10 : 8;
    const frameIndex = Math.floor(elapsed * fps) % frameCount;
    const angle = Math.atan2(targetY - y, targetX - x) - Math.PI / 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    drawAnimationFrame(ctx, animName, frameIndex, -JELLY_SIZE / 2, -JELLY_SIZE / 2, JELLY_SIZE, JELLY_SIZE);
    ctx.restore();
}

function getJellyAnimName(state) {
    if (state === 'active') return 'laserJellyElectric';
    if (state === 'warn') return 'laserJellyIntoElectric';
    return 'laserJellyIdle';
}
