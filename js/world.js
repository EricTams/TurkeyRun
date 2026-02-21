// AIDEV-NOTE: Scrolling world (updated chunk 11). Ground and background scroll
// with parallax. Colors now come from the biome system so each biome has its
// own visual identity. The spiritual realm biome adds floating geometry.

import {
    CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y,
    AUTO_RUN_SPEED, PIXELS_PER_METER,
    FAR_BG_PARALLAX, NEAR_BG_PARALLAX,
    TILE_SIZE, TILE_ROW_Y,
    DEBUG_SHOW_HITBOX,
    BIOME_BEACH_START, BIOME_GRASS_START, BIOME_MOUNTAIN_START,
    BIOME_MOON_START, BIOME_SPIRITUAL_START
} from './config.js';
import { getBiomeColors, getSpiritualBlend, getCurrentBiomeName } from './biome.js';
import { getVisibleTileColumns, getGroundYAt } from './terrain.js';
import { getTile } from './terrainTiles.js';
import { drawAnimationFrame } from './animation.js';

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

// Decorative background elements (non-interactive)
const SIGN_WIDTH = 64;
const SIGN_HEIGHT = 76;
const SIGN_BASE_Y = GROUND_Y - SIGN_HEIGHT + 10;

const PALM_WIDTH = 128;
const PALM_HEIGHT = 256;
const PALM_SPACING_MIN = 220;
const PALM_SPACING_MAX = 360;
const PALM_COVERAGE_BUFFER = 420;
const PALM_OFFSCREEN_MARGIN = 140;
const PALM_FAR_PARALLAX = 0.14;
const PALM_NEAR_PARALLAX = 0.35;

const signDecor = [
    { worldX: BIOME_BEACH_START * PIXELS_PER_METER, key: 'signBeach' },
    { worldX: BIOME_GRASS_START * PIXELS_PER_METER, key: 'signGrass' },
    { worldX: BIOME_MOUNTAIN_START * PIXELS_PER_METER, key: 'signMountain' },
    { worldX: BIOME_MOON_START * PIXELS_PER_METER, key: 'signMoon' },
    { worldX: BIOME_SPIRITUAL_START * PIXELS_PER_METER, key: 'signRealm' },
];

let farPalmDecor = [];
let nearPalmDecor = [];
let nextFarPalmWorldX = 0;
let nextNearPalmWorldX = 0;

function wrapOffset(value, width) {
    return ((value % width) + width) % width;
}

export function createWorld() {
    farOffset = 0;
    nearOffset = 0;
    groundOffset = 0;
    distancePixels = 0;
    resetDecor();
}

export function getDistanceMeters() {
    return Math.floor(distancePixels / PIXELS_PER_METER);
}

export function getDistancePixels() {
    return distancePixels;
}

export function setDistanceMeters(distanceMeters) {
    const clampedMeters = Math.max(0, distanceMeters);
    distancePixels = clampedMeters * PIXELS_PER_METER;
    farOffset = wrapOffset(distancePixels * FAR_BG_PARALLAX, FAR_HILL_WIDTH);
    nearOffset = wrapOffset(distancePixels * NEAR_BG_PARALLAX, NEAR_HILL_WIDTH);
    groundOffset = wrapOffset(distancePixels, TILE_SIZE);
    resetDecor();
}

export function updateWorld(dt) {
    const scrollPx = AUTO_RUN_SPEED * dt;
    distancePixels += scrollPx;
    farOffset = (farOffset + scrollPx * FAR_BG_PARALLAX) % FAR_HILL_WIDTH;
    nearOffset = (nearOffset + scrollPx * NEAR_BG_PARALLAX) % NEAR_HILL_WIDTH;
    groundOffset = (groundOffset + scrollPx) % TILE_SIZE;

    ensurePalmCoverage();
    cullPalmDecor(farPalmDecor);
    cullPalmDecor(nearPalmDecor);
}

export function renderWorld(ctx) {
    const distMeters = Math.floor(distancePixels / PIXELS_PER_METER);
    const colors = getBiomeColors(distMeters);
    const spiritBlend = getSpiritualBlend(distMeters);

    renderSky(ctx, colors.sky);
    // Draw crazy lvl5 backdrop first so all parallax/decor/terrain layers sit above it.
    if (spiritBlend > 0) {
        renderSpiritualEffects(ctx, spiritBlend);
    }
    renderFarHills(ctx, colors.farBg);
    renderPalmDecor(ctx, farPalmDecor);
    renderNearHills(ctx, colors.nearBg);
    renderPalmDecor(ctx, nearPalmDecor);
    renderBiomeSigns(ctx);
    renderGroundBase(ctx, colors.ground);
}

export function renderWorldTerrain(ctx) {
    renderGroundTerrain(ctx);
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

function renderGroundBase(ctx, groundColor) {
    ctx.fillStyle = groundColor;
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
}

function renderGroundTerrain(ctx) {
    const distMeters = Math.floor(distancePixels / PIXELS_PER_METER);
    const biome = getCurrentBiomeName(distMeters);

    const tileCount = Math.ceil(CANVAS_WIDTH / TILE_SIZE) + 2;
    const defaultTile = getTile(biome, 'flatLow');
    const fullTile = getTile(biome, 'full');

    // Default scrolling ground: surface tile + Full tile directly below it
    for (let i = 0; i < tileCount; i++) {
        const x = i * TILE_SIZE - groundOffset;
        if (fullTile) {
            ctx.drawImage(fullTile, x, TILE_ROW_Y + TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
        if (defaultTile) {
            ctx.drawImage(defaultTile, x, TILE_ROW_Y, TILE_SIZE, TILE_SIZE);
        }
    }

    // Overdraw section terrain tiles on top (with Full tile below each)
    const columns = getVisibleTileColumns();
    for (const col of columns) {
        if (fullTile) {
            ctx.drawImage(fullTile, col.screenX, TILE_ROW_Y + TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
        const tile = getTile(biome, col.tileType);
        if (tile) {
            ctx.drawImage(tile, col.screenX, TILE_ROW_Y, TILE_SIZE, TILE_SIZE);
        }
    }

    // Debug: dashed magenta collision line
    if (DEBUG_SHOW_HITBOX) {
        ctx.save();
        ctx.strokeStyle = '#FF00FF';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        for (let x = 0; x <= CANVAS_WIDTH; x += 3) {
            const y = getGroundYAt(x);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }
}

function resetDecor() {
    farPalmDecor = [];
    nearPalmDecor = [];
    nextFarPalmWorldX = -CANVAS_WIDTH * 0.6;
    nextNearPalmWorldX = -CANVAS_WIDTH * 0.3;
    ensurePalmCoverage();
}

function hash01(value) {
    const s = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
    return s - Math.floor(s);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function getPalmKeyForBiome(biomeName) {
    // One assigned palm style per biome (non-random mapping).
    if (biomeName === 'beach') return 'palmDefault';
    if (biomeName === 'grass') return 'palmDefault';
    if (biomeName === 'mountain') return 'palmSnow';
    if (biomeName === 'moon') return 'palmDome';
    if (biomeName === 'spiritual') return 'palmInverted';
    return 'palmDefault';
}

function createPalmDecor(worldX, lane) {
    const isFar = lane === 'far';
    const biomeMeters = Math.floor(worldX / PIXELS_PER_METER);
    const biome = getCurrentBiomeName(biomeMeters);
    const key = getPalmKeyForBiome(biome);

    const scale = isFar ? 0.5 : 1.0;

    const h = Math.round(PALM_HEIGHT * scale);
    const w = Math.round(PALM_WIDTH * scale);
    const yJitter = Math.round(lerp(-8, 10, hash01(worldX * 0.01 + (isFar ? 1.0 : 3.0))));
    const y = GROUND_Y - h + (isFar ? -10 : 10) + yJitter;

    return {
        worldX,
        key,
        width: w,
        height: h,
        y,
        parallax: isFar ? PALM_FAR_PARALLAX : PALM_NEAR_PARALLAX,
    };
}

function nextPalmSpacing(worldX, lane) {
    const t = hash01(worldX * 0.008 + (lane === 'far' ? 1.7 : 9.4));
    return Math.round(lerp(PALM_SPACING_MIN, PALM_SPACING_MAX, t));
}

function getPalmTargetWorldX(parallax) {
    return distancePixels * parallax + CANVAS_WIDTH + PALM_COVERAGE_BUFFER;
}

function ensurePalmCoverage() {
    const farTarget = getPalmTargetWorldX(PALM_FAR_PARALLAX);
    const nearTarget = getPalmTargetWorldX(PALM_NEAR_PARALLAX);

    while (nextFarPalmWorldX < farTarget) {
        farPalmDecor.push(createPalmDecor(nextFarPalmWorldX, 'far'));
        nextFarPalmWorldX += nextPalmSpacing(nextFarPalmWorldX, 'far');
    }
    while (nextNearPalmWorldX < nearTarget) {
        nearPalmDecor.push(createPalmDecor(nextNearPalmWorldX, 'near'));
        nextNearPalmWorldX += nextPalmSpacing(nextNearPalmWorldX, 'near');
    }
}

function getDecorScreenX(worldX, parallax) {
    return worldX - distancePixels * parallax;
}

function cullPalmDecor(palms) {
    while (palms.length > 0) {
        const first = palms[0];
        const x = getDecorScreenX(first.worldX, first.parallax);
        if (x + first.width < -PALM_OFFSCREEN_MARGIN) {
            palms.shift();
            continue;
        }
        break;
    }
}

function renderPalmDecor(ctx, palms) {
    for (const palm of palms) {
        const x = getDecorScreenX(palm.worldX, palm.parallax);
        if (x > CANVAS_WIDTH + PALM_OFFSCREEN_MARGIN) continue;
        if (x + palm.width < -PALM_OFFSCREEN_MARGIN) continue;

        drawAnimationFrame(
            ctx,
            palm.key,
            0,
            Math.round(x),
            Math.round(palm.y),
            palm.width,
            palm.height
        );
    }
}

function renderBiomeSigns(ctx) {
    for (const sign of signDecor) {
        const x = sign.worldX - distancePixels;
        if (x > CANVAS_WIDTH + 24) continue;
        if (x + SIGN_WIDTH < -24) continue;
        const signGroundY = getGroundYAt(x + SIGN_WIDTH / 2);
        const signY = Math.round(signGroundY - SIGN_HEIGHT + 10);
        drawAnimationFrame(
            ctx,
            sign.key,
            0,
            Math.round(x),
            signY,
            SIGN_WIDTH,
            SIGN_HEIGHT
        );
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
