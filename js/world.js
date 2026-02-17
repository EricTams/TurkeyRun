// AIDEV-NOTE: Scrolling world (updated chunk 11). Ground and background scroll
// with parallax. Colors now come from the biome system so each biome has its
// own visual identity. The spiritual realm biome adds floating geometry.

import {
    CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y,
    AUTO_RUN_SPEED, PIXELS_PER_METER,
    FAR_BG_PARALLAX, NEAR_BG_PARALLAX
} from './config.js';
import { getBiomeColors, getSpiritualBlend } from './biome.js';

// Scrolling offsets (wrap around their respective layer widths)
let farOffset = 0;
let nearOffset = 0;
let groundOffset = 0;
let distancePixels = 0;

// Layer geometry
const FAR_BG_TOP = 180;
const FAR_BG_HEIGHT = GROUND_Y - FAR_BG_TOP;
const FAR_HILL_WIDTH = 200;

const NEAR_BG_TOP = 280;
const NEAR_BG_HEIGHT = GROUND_Y - NEAR_BG_TOP;
const NEAR_HILL_WIDTH = 150;

const GROUND_STRIPE_SPACING = 80;
const GROUND_STRIPE_WIDTH = 4;
const GROUND_HEIGHT = CANVAS_HEIGHT - GROUND_Y;

export function createWorld() {
    farOffset = 0;
    nearOffset = 0;
    groundOffset = 0;
    distancePixels = 0;
}

export function getDistanceMeters() {
    return Math.floor(distancePixels / PIXELS_PER_METER);
}

export function getDistancePixels() {
    return distancePixels;
}

export function updateWorld(dt) {
    const scrollPx = AUTO_RUN_SPEED * dt;
    distancePixels += scrollPx;
    farOffset = (farOffset + scrollPx * FAR_BG_PARALLAX) % FAR_HILL_WIDTH;
    nearOffset = (nearOffset + scrollPx * NEAR_BG_PARALLAX) % NEAR_HILL_WIDTH;
    groundOffset = (groundOffset + scrollPx) % GROUND_STRIPE_SPACING;
}

export function renderWorld(ctx) {
    const distMeters = Math.floor(distancePixels / PIXELS_PER_METER);
    const colors = getBiomeColors(distMeters);

    renderSky(ctx, colors.sky);
    renderFarHills(ctx, colors.farBg);
    renderNearHills(ctx, colors.nearBg);
    renderGround(ctx, colors.ground, colors.groundStripe);

    // Spiritual realm: floating geometry fades in during transition
    const spiritBlend = getSpiritualBlend(distMeters);
    if (spiritBlend > 0) {
        renderSpiritualEffects(ctx, spiritBlend);
    }
}

function renderSky(ctx, skyColor) {
    ctx.fillStyle = skyColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);
}

// AIDEV-NOTE: Far hills are simple bumps drawn as arcs. They scroll slowly
// to create depth. The pattern tiles seamlessly by wrapping farOffset.
function renderFarHills(ctx, farBgColor) {
    ctx.fillStyle = farBgColor;
    const hillCount = Math.ceil(CANVAS_WIDTH / FAR_HILL_WIDTH) + 2;
    for (let i = 0; i < hillCount; i++) {
        const cx = i * FAR_HILL_WIDTH - farOffset + FAR_HILL_WIDTH / 2;
        drawHill(ctx, cx, GROUND_Y, FAR_HILL_WIDTH * 0.7, FAR_BG_HEIGHT * 0.6);
    }
    ctx.fillRect(0, GROUND_Y - FAR_BG_HEIGHT * 0.15, CANVAS_WIDTH, FAR_BG_HEIGHT * 0.15);
}

function renderNearHills(ctx, nearBgColor) {
    ctx.fillStyle = nearBgColor;
    const hillCount = Math.ceil(CANVAS_WIDTH / NEAR_HILL_WIDTH) + 2;
    for (let i = 0; i < hillCount; i++) {
        const cx = i * NEAR_HILL_WIDTH - nearOffset + NEAR_HILL_WIDTH / 2;
        drawHill(ctx, cx, GROUND_Y, NEAR_HILL_WIDTH * 0.8, NEAR_BG_HEIGHT * 0.6);
    }
    ctx.fillRect(0, GROUND_Y - NEAR_BG_HEIGHT * 0.1, CANVAS_WIDTH, NEAR_BG_HEIGHT * 0.1);
}

function drawHill(ctx, cx, baseY, halfWidth, height) {
    ctx.beginPath();
    ctx.moveTo(cx - halfWidth, baseY);
    ctx.quadraticCurveTo(cx, baseY - height, cx + halfWidth, baseY);
    ctx.fill();
}

function renderGround(ctx, groundColor, stripeColor) {
    ctx.fillStyle = groundColor;
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, GROUND_HEIGHT);

    // Scrolling vertical stripes for ground motion
    ctx.fillStyle = stripeColor;
    const stripeCount = Math.ceil(CANVAS_WIDTH / GROUND_STRIPE_SPACING) + 1;
    for (let i = 0; i < stripeCount; i++) {
        const x = i * GROUND_STRIPE_SPACING - groundOffset;
        ctx.fillRect(x, GROUND_Y, GROUND_STRIPE_WIDTH, GROUND_HEIGHT);
    }
}

// ---------------------------------------------------------------------------
// Spiritual realm kaleidoscope -- draws animated shapes into a single wedge
// on an offscreen canvas, then stamps it with rotations and reflections to
// create a full kaleidoscope pattern across the sky.
// ---------------------------------------------------------------------------

const K_FOLDS = 6;
const K_WEDGE_ANGLE = Math.PI / K_FOLDS;
const K_RADIUS = 450;

let wedgeCanvas = null;
let wedgeCtx = null;

function ensureWedgeCanvas() {
    if (wedgeCanvas) return;
    wedgeCanvas = document.createElement('canvas');
    wedgeCanvas.width = K_RADIUS;
    wedgeCanvas.height = Math.ceil(K_RADIUS * Math.sin(K_WEDGE_ANGLE)) + 2;
    wedgeCtx = wedgeCanvas.getContext('2d');
}

function renderSpiritualEffects(ctx, opacity) {
    ensureWedgeCanvas();
    const time = Date.now() / 1000;

    // Step 1: draw base pattern into a single wedge (offscreen)
    wedgeCtx.clearRect(0, 0, wedgeCanvas.width, wedgeCanvas.height);
    wedgeCtx.save();
    wedgeCtx.beginPath();
    wedgeCtx.moveTo(0, 0);
    wedgeCtx.arc(0, 0, K_RADIUS, 0, K_WEDGE_ANGLE);
    wedgeCtx.closePath();
    wedgeCtx.clip();
    drawKaleidoscopeContent(wedgeCtx, time);
    wedgeCtx.restore();

    // Step 2: stamp the wedge with rotations + mirrors onto the main canvas
    const cx = CANVAS_WIDTH / 2;
    const cy = GROUND_Y / 2;

    ctx.save();
    ctx.globalAlpha = opacity * 0.28;

    // Clip to sky region so nothing bleeds into the ground
    ctx.beginPath();
    ctx.rect(0, 0, CANVAS_WIDTH, GROUND_Y);
    ctx.clip();

    ctx.translate(cx, cy);
    // Slow overall rotation tied to scroll distance for a living feel
    ctx.rotate(time * 0.08 + farOffset * 0.002);

    for (let i = 0; i < K_FOLDS; i++) {
        ctx.save();
        ctx.rotate(i * 2 * K_WEDGE_ANGLE);
        ctx.drawImage(wedgeCanvas, 0, 0);
        ctx.scale(1, -1);
        ctx.drawImage(wedgeCanvas, 0, 0);
        ctx.restore();
    }

    ctx.restore();
}

function drawKaleidoscopeContent(wCtx, time) {
    // Concentric pulsing rings
    for (let i = 0; i < 6; i++) {
        const r = 60 + i * 60 + Math.sin(time * 0.35 + i * 1.1) * 15;
        const hue = (time * 22 + i * 60) % 360;
        const lw = 2 + Math.sin(time * 0.5 + i) * 1.5;
        wCtx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
        wCtx.lineWidth = Math.max(0.5, lw);
        wCtx.beginPath();
        wCtx.arc(0, 0, r, 0, K_WEDGE_ANGLE);
        wCtx.stroke();
    }

    // Drifting orbs at varying distances
    for (let i = 0; i < 14; i++) {
        const dist = 35 + i * 28 + Math.sin(time * 0.4 + i * 0.9) * 16;
        const angle = Math.abs(Math.sin(time * 0.12 + i * 0.55)) * (K_WEDGE_ANGLE - 0.04) + 0.02;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        const radius = 4 + Math.sin(time * 0.6 + i * 0.8) * 3;
        const hue = (time * 28 + i * 26) % 360;

        wCtx.fillStyle = `hsl(${hue}, 85%, 62%)`;
        wCtx.beginPath();
        wCtx.arc(x, y, radius, 0, Math.PI * 2);
        wCtx.fill();
    }

    // Organic flowing curves
    for (let i = 0; i < 4; i++) {
        const hue = (time * 15 + i * 90) % 360;
        wCtx.strokeStyle = `hsl(${hue}, 75%, 55%)`;
        wCtx.lineWidth = 1.5 + Math.sin(time * 0.3 + i) * 0.8;
        wCtx.beginPath();
        for (let j = 0; j < 10; j++) {
            const dist = 25 + j * 42;
            const angle = Math.sin(time * 0.18 + i * 1.3 + j * 0.4)
                * K_WEDGE_ANGLE * 0.38 + K_WEDGE_ANGLE * 0.5;
            const clamped = Math.max(0, Math.min(K_WEDGE_ANGLE, angle));
            const x = Math.cos(clamped) * dist;
            const y = Math.sin(clamped) * dist;
            if (j === 0) wCtx.moveTo(x, y);
            else wCtx.lineTo(x, y);
        }
        wCtx.stroke();
    }

    // Small diamond sparkles
    for (let i = 0; i < 8; i++) {
        const dist = 50 + i * 45 + Math.cos(time * 0.3 + i * 1.2) * 12;
        const angle = (Math.sin(time * 0.25 + i * 0.7) * 0.35 + 0.5) * K_WEDGE_ANGLE;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        const sz = 3 + Math.sin(time * 0.8 + i * 1.4) * 2;
        const hue = (time * 35 + i * 45) % 360;

        wCtx.fillStyle = `hsl(${hue}, 90%, 72%)`;
        wCtx.beginPath();
        wCtx.moveTo(x, y - sz);
        wCtx.lineTo(x + sz * 0.6, y);
        wCtx.lineTo(x, y + sz);
        wCtx.lineTo(x - sz * 0.6, y);
        wCtx.closePath();
        wCtx.fill();
    }
}
