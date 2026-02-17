import {
    CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y,
    AUTO_RUN_SPEED, PIXELS_PER_METER,
    SKY_COLOR, FAR_BG_COLOR, NEAR_BG_COLOR,
    GROUND_COLOR, GROUND_STRIPE_COLOR,
    FAR_BG_PARALLAX, NEAR_BG_PARALLAX
} from './config.js';

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
    renderSky(ctx);
    renderFarHills(ctx);
    renderNearHills(ctx);
    renderGround(ctx);
}

function renderSky(ctx) {
    ctx.fillStyle = SKY_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);
}

// AIDEV-NOTE: Far hills are simple bumps drawn as arcs. They scroll slowly
// to create depth. The pattern tiles seamlessly by wrapping farOffset.
function renderFarHills(ctx) {
    ctx.fillStyle = FAR_BG_COLOR;
    const hillCount = Math.ceil(CANVAS_WIDTH / FAR_HILL_WIDTH) + 2;
    for (let i = 0; i < hillCount; i++) {
        const cx = i * FAR_HILL_WIDTH - farOffset + FAR_HILL_WIDTH / 2;
        drawHill(ctx, cx, GROUND_Y, FAR_HILL_WIDTH * 0.7, FAR_BG_HEIGHT * 0.6);
    }
    ctx.fillRect(0, GROUND_Y - FAR_BG_HEIGHT * 0.15, CANVAS_WIDTH, FAR_BG_HEIGHT * 0.15);
}

function renderNearHills(ctx) {
    ctx.fillStyle = NEAR_BG_COLOR;
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

function renderGround(ctx) {
    ctx.fillStyle = GROUND_COLOR;
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, GROUND_HEIGHT);

    // Scrolling vertical stripes for ground motion
    ctx.fillStyle = GROUND_STRIPE_COLOR;
    const stripeCount = Math.ceil(CANVAS_WIDTH / GROUND_STRIPE_SPACING) + 1;
    for (let i = 0; i < stripeCount; i++) {
        const x = i * GROUND_STRIPE_SPACING - groundOffset;
        ctx.fillRect(x, GROUND_Y, GROUND_STRIPE_WIDTH, GROUND_HEIGHT);
    }
}
