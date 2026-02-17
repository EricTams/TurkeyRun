// AIDEV-NOTE: Procedural generation system (chunk 6, birds chunk 8, lasers chunk 9).
// Replaces fixed-interval spawning with a pattern-pool approach. Patterns are
// pre-made hazard layouts categorised by difficulty tier. The spawner selects
// patterns based on distance traveled and controls density by shrinking the gap
// between patterns. Birds spawn independently on a timer that tightens with
// distance, with optional volleys of 2-3 birds. Lasers (static horizontal beams
// and sweeping pivot beams) are spawned as pattern elements.

import {
    CANVAS_WIDTH, GROUND_Y, PIXELS_PER_METER,
    ZAPPER_GAP_MIN, ZAPPER_GAP_MAX, ZAPPER_GAP_MARGIN,
    SPAWNER_GRACE_DISTANCE, SPAWNER_BASE_GAP, SPAWNER_MIN_GAP,
    SPAWNER_GAP_SHRINK_RATE, SPAWNER_MEDIUM_FROM, SPAWNER_EASY_UNTIL,
    SPAWNER_HARD_FROM, SPAWNER_HARD_DOMINANT,
    FOOD_SPAWN_CHANCE, FOOD_RISKY_CHANCE, FOOD_COUNT_MIN, FOOD_COUNT_MAX,
    FOOD_SPACING, FOOD_ARC_HEIGHT, FOOD_RISE_PER_ITEM,
    FOOD_Y_MIN, FOOD_Y_BOTTOM_MARGIN,
    BIRD_HEIGHT, BIRD_SPAWN_MIN_DISTANCE,
    BIRD_SPAWN_BASE_INTERVAL, BIRD_SPAWN_MIN_INTERVAL,
    BIRD_SPAWN_INTERVAL_DECAY,
    BIRD_VOLLEY_CHANCE, BIRD_VOLLEY_MAX, BIRD_VOLLEY_DELAY,
    LASER_BEAM_THICKNESS, LASER_STATIC_WIDTH,
    LASER_SWEEP_LENGTH, LASER_SWEEP_SPEED, LASER_SWEEP_ARC
} from './config.js';
import {
    createGroundHazard, updateGroundHazard, isOffScreen
} from './hazards/groundHazard.js';
import {
    createZapperAt, updateZapper, isZapperOffScreen
} from './hazards/zapper.js';
import {
    createBird, updateBird, isBirdOffScreen
} from './hazards/bird.js';
import {
    createStaticLaser, createSweepLaser,
    updateLaser, isLaserOffScreen
} from './hazards/laser.js';
import {
    spawnLine, spawnRise, spawnFall, spawnArc
} from './collectible.js';

// Zapper gap size presets (pixels)
const GAP_SMALL = ZAPPER_GAP_MIN;
const GAP_MEDIUM = Math.round((ZAPPER_GAP_MIN + ZAPPER_GAP_MAX) / 2);
const GAP_LARGE = ZAPPER_GAP_MAX;

// Random jitter on gap-center fraction for visual variety
const GAP_CENTER_JITTER = 0.08;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveGapY(gapCenter, gapH) {
    const jitter = (Math.random() * 2 - 1) * GAP_CENTER_JITTER;
    const clamped = Math.max(0, Math.min(1, gapCenter + jitter));
    const available = GROUND_Y - 2 * ZAPPER_GAP_MARGIN - gapH;
    return ZAPPER_GAP_MARGIN + available * clamped;
}

function resolveBeamY(beamCenter) {
    const margin = LASER_BEAM_THICKNESS + 10;
    const clamped = Math.max(0, Math.min(1, beamCenter));
    return margin + (GROUND_Y - 2 * margin) * clamped;
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Food formation helpers
// ---------------------------------------------------------------------------

const FOOD_FORMATIONS = ['line', 'rise', 'fall', 'arc'];

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomInRange(min, max) {
    return min + Math.random() * Math.max(0, max - min);
}

function foodBaseX(patternWidth, count) {
    if (Math.random() < FOOD_RISKY_CHANCE) {
        const maxOffset = Math.max(0, patternWidth - count * FOOD_SPACING);
        return CANVAS_WIDTH + Math.random() * maxOffset;
    }
    return CANVAS_WIDTH + patternWidth + 40;
}

function spawnFormationByType(formation, baseX, count) {
    const minY = FOOD_Y_MIN;
    const maxY = GROUND_Y - FOOD_Y_BOTTOM_MARGIN;
    const totalRise = (count - 1) * FOOD_RISE_PER_ITEM;

    if (formation === 'line') {
        spawnLine(baseX, randomInRange(minY, maxY), count, FOOD_SPACING);
    } else if (formation === 'rise') {
        const y = randomInRange(minY + totalRise, maxY);
        spawnRise(baseX, y, count, FOOD_SPACING, FOOD_RISE_PER_ITEM);
    } else if (formation === 'fall') {
        const y = randomInRange(minY, maxY - totalRise);
        spawnFall(baseX, y, count, FOOD_SPACING, FOOD_RISE_PER_ITEM);
    } else {
        const y = randomInRange(minY + FOOD_ARC_HEIGHT, maxY);
        spawnArc(baseX, y, count, (count - 1) * FOOD_SPACING, FOOD_ARC_HEIGHT);
    }
}

function spawnFoodFormation(patternWidth) {
    if (Math.random() > FOOD_SPAWN_CHANCE) return;
    const count = randomInt(FOOD_COUNT_MIN, FOOD_COUNT_MAX);
    const formation = pickRandom(FOOD_FORMATIONS);
    const baseX = foodBaseX(patternWidth, count);
    spawnFormationByType(formation, baseX, count);
}

// ---------------------------------------------------------------------------
// Pattern pool
// ---------------------------------------------------------------------------
// Each pattern: { tier, width (px span), elements[] }
// Ground element:       { type: 'ground', subType, offsetX }
// Zapper element:       { type: 'zapper', offsetX, gapCenter (0-1), gapH }
// Static laser element: { type: 'laserStatic', offsetX, beamCenter (0-1), beamWidth? }
// Sweep laser element:  { type: 'laserSweep', offsetX, pivotSide: 'ceiling'|'ground' }

const PATTERNS = [
    // ---- EASY: simple, sparse, forgiving ----
    { tier: 'easy', width: 15, elements: [
        { type: 'ground', subType: 'poolNoodle', offsetX: 0 }
    ]},
    { tier: 'easy', width: 50, elements: [
        { type: 'ground', subType: 'sandCastle', offsetX: 0 }
    ]},
    { tier: 'easy', width: 250, elements: [
        { type: 'ground', subType: 'poolNoodle', offsetX: 0 },
        { type: 'ground', subType: 'sandCastle', offsetX: 200 }
    ]},
    { tier: 'easy', width: 30, elements: [
        { type: 'zapper', offsetX: 0, gapCenter: 0.5, gapH: GAP_LARGE }
    ]},
    { tier: 'easy', width: 30, elements: [
        { type: 'zapper', offsetX: 0, gapCenter: 0.3, gapH: GAP_LARGE }
    ]},
    { tier: 'easy', width: 30, elements: [
        { type: 'zapper', offsetX: 0, gapCenter: 0.7, gapH: GAP_LARGE }
    ]},
    { tier: 'easy', width: 350, elements: [
        { type: 'ground', subType: 'sandCastle', offsetX: 0 },
        { type: 'zapper', offsetX: 300, gapCenter: 0.4, gapH: GAP_LARGE }
    ]},

    // ---- MEDIUM: combos, tighter gaps, more elements ----
    { tier: 'medium', width: 300, elements: [
        { type: 'ground', subType: 'poolNoodle', offsetX: 0 },
        { type: 'ground', subType: 'sandCastle', offsetX: 120 },
        { type: 'ground', subType: 'poolNoodle', offsetX: 280 }
    ]},
    { tier: 'medium', width: 300, elements: [
        { type: 'zapper', offsetX: 0, gapCenter: 0.3, gapH: GAP_MEDIUM },
        { type: 'zapper', offsetX: 250, gapCenter: 0.7, gapH: GAP_MEDIUM }
    ]},
    { tier: 'medium', width: 250, elements: [
        { type: 'ground', subType: 'sandCastle', offsetX: 0 },
        { type: 'zapper', offsetX: 200, gapCenter: 0.5, gapH: GAP_MEDIUM }
    ]},
    { tier: 'medium', width: 280, elements: [
        { type: 'ground', subType: 'poolNoodle', offsetX: 0 },
        { type: 'ground', subType: 'poolNoodle', offsetX: 80 },
        { type: 'zapper', offsetX: 230, gapCenter: 0.6, gapH: GAP_MEDIUM }
    ]},
    { tier: 'medium', width: 30, elements: [
        { type: 'zapper', offsetX: 0, gapCenter: 0.5, gapH: GAP_MEDIUM }
    ]},
    { tier: 'medium', width: 200, elements: [
        { type: 'zapper', offsetX: 0, gapCenter: 0.4, gapH: GAP_MEDIUM },
        { type: 'ground', subType: 'sandCastle', offsetX: 150 }
    ]},

    // ---- HARD: dense, precise, demanding ----
    { tier: 'hard', width: 200, elements: [
        { type: 'zapper', offsetX: 0, gapCenter: 0.25, gapH: GAP_SMALL },
        { type: 'zapper', offsetX: 160, gapCenter: 0.75, gapH: GAP_SMALL }
    ]},
    { tier: 'hard', width: 400, elements: [
        { type: 'ground', subType: 'sandCastle', offsetX: 0 },
        { type: 'ground', subType: 'poolNoodle', offsetX: 80 },
        { type: 'ground', subType: 'sandCastle', offsetX: 200 },
        { type: 'zapper', offsetX: 350, gapCenter: 0.4, gapH: GAP_SMALL }
    ]},
    { tier: 'hard', width: 380, elements: [
        { type: 'zapper', offsetX: 0, gapCenter: 0.3, gapH: GAP_SMALL },
        { type: 'zapper', offsetX: 170, gapCenter: 0.65, gapH: GAP_SMALL },
        { type: 'zapper', offsetX: 340, gapCenter: 0.4, gapH: GAP_SMALL }
    ]},
    { tier: 'hard', width: 280, elements: [
        { type: 'ground', subType: 'poolNoodle', offsetX: 0 },
        { type: 'ground', subType: 'poolNoodle', offsetX: 60 },
        { type: 'ground', subType: 'poolNoodle', offsetX: 120 },
        { type: 'ground', subType: 'sandCastle', offsetX: 220 }
    ]},
    { tier: 'hard', width: 230, elements: [
        { type: 'zapper', offsetX: 0, gapCenter: 0.7, gapH: GAP_SMALL },
        { type: 'ground', subType: 'sandCastle', offsetX: 180 }
    ]},

    // ---- MEDIUM: static lasers (horizontal beams at fixed heights) ----
    { tier: 'medium', width: 300, elements: [
        { type: 'laserStatic', offsetX: 0, beamCenter: 0.45 }
    ]},
    { tier: 'medium', width: 300, elements: [
        { type: 'laserStatic', offsetX: 0, beamCenter: 0.25 }
    ]},
    { tier: 'medium', width: 300, elements: [
        { type: 'laserStatic', offsetX: 0, beamCenter: 0.7 }
    ]},
    { tier: 'medium', width: 350, elements: [
        { type: 'laserStatic', offsetX: 0, beamCenter: 0.65 },
        { type: 'ground', subType: 'poolNoodle', offsetX: 200 }
    ]},
    { tier: 'medium', width: 400, elements: [
        { type: 'ground', subType: 'sandCastle', offsetX: 0 },
        { type: 'laserStatic', offsetX: 150, beamCenter: 0.4, beamWidth: 250 }
    ]},

    // ---- HARD: sweeping lasers + laser combos ----
    { tier: 'hard', width: 300, elements: [
        { type: 'laserSweep', offsetX: 150, pivotSide: 'ceiling' }
    ]},
    { tier: 'hard', width: 300, elements: [
        { type: 'laserSweep', offsetX: 150, pivotSide: 'ground' }
    ]},
    { tier: 'hard', width: 400, elements: [
        { type: 'laserStatic', offsetX: 0, beamCenter: 0.35 },
        { type: 'ground', subType: 'sandCastle', offsetX: 320 }
    ]},
    { tier: 'hard', width: 450, elements: [
        { type: 'laserSweep', offsetX: 100, pivotSide: 'ceiling' },
        { type: 'ground', subType: 'poolNoodle', offsetX: 380 }
    ]},
    { tier: 'hard', width: 400, elements: [
        { type: 'laserStatic', offsetX: 0, beamCenter: 0.3, beamWidth: 200 },
        { type: 'laserStatic', offsetX: 0, beamCenter: 0.7, beamWidth: 200 }
    ]},
    { tier: 'hard', width: 500, elements: [
        { type: 'laserSweep', offsetX: 80, pivotSide: 'ground' },
        { type: 'zapper', offsetX: 400, gapCenter: 0.4, gapH: GAP_SMALL }
    ]},
];

// Group by tier for fast lookup
const POOL_BY_TIER = {
    easy:   PATTERNS.filter(p => p.tier === 'easy'),
    medium: PATTERNS.filter(p => p.tier === 'medium'),
    hard:   PATTERNS.filter(p => p.tier === 'hard')
};

// ---------------------------------------------------------------------------
// Tier selection -- shifts from easy toward hard as distance increases
// ---------------------------------------------------------------------------

function selectTier(distanceMeters) {
    const roll = Math.random();

    if (distanceMeters < SPAWNER_MEDIUM_FROM) {
        return 'easy';
    }
    if (distanceMeters < SPAWNER_EASY_UNTIL) {
        return roll < 0.6 ? 'easy' : 'medium';
    }
    if (distanceMeters < SPAWNER_HARD_FROM) {
        return roll < 0.3 ? 'easy' : 'medium';
    }
    if (distanceMeters < SPAWNER_HARD_DOMINANT) {
        if (roll < 0.15) return 'easy';
        if (roll < 0.55) return 'medium';
        return 'hard';
    }
    // Beyond HARD_DOMINANT: mostly hard, easy for breathers
    if (roll < 0.1) return 'easy';
    if (roll < 0.35) return 'medium';
    return 'hard';
}

// ---------------------------------------------------------------------------
// Gap between patterns -- shrinks with distance for increasing density
// ---------------------------------------------------------------------------

function getGapForDistance(distanceMeters) {
    const shrink = (distanceMeters / 1000) * SPAWNER_GAP_SHRINK_RATE;
    return Math.max(SPAWNER_MIN_GAP, SPAWNER_BASE_GAP - shrink);
}

// ---------------------------------------------------------------------------
// Spawn a single pattern element into the appropriate array
// ---------------------------------------------------------------------------

function spawnElement(elem, groundArr, zapperArr, laserArr) {
    if (elem.type === 'ground') {
        const hazard = createGroundHazard(elem.subType);
        hazard.x = CANVAS_WIDTH + elem.offsetX;
        groundArr.push(hazard);
        return;
    }
    if (elem.type === 'zapper') {
        const gapY = resolveGapY(elem.gapCenter, elem.gapH);
        zapperArr.push(createZapperAt(CANVAS_WIDTH + elem.offsetX, gapY, elem.gapH));
        return;
    }
    if (elem.type === 'laserStatic') {
        const beamY = resolveBeamY(elem.beamCenter);
        const width = elem.beamWidth || LASER_STATIC_WIDTH;
        laserArr.push(createStaticLaser(CANVAS_WIDTH + elem.offsetX, beamY, width));
        return;
    }
    if (elem.type === 'laserSweep') {
        const pivotY = elem.pivotSide === 'ceiling' ? 0 : GROUND_Y;
        const halfArc = LASER_SWEEP_ARC / 2;
        const centerAngle = elem.pivotSide === 'ceiling' ? Math.PI / 2 : -Math.PI / 2;
        laserArr.push(createSweepLaser(
            CANVAS_WIDTH + elem.offsetX,
            pivotY,
            centerAngle - halfArc,
            centerAngle + halfArc,
            LASER_SWEEP_SPEED
        ));
    }
}

// ---------------------------------------------------------------------------
// Bird spawn helpers
// ---------------------------------------------------------------------------

function getBirdSpawnInterval(distanceMeters) {
    const beyond = Math.max(0, distanceMeters - BIRD_SPAWN_MIN_DISTANCE);
    const reduction = (beyond / 1000) * BIRD_SPAWN_INTERVAL_DECAY;
    return Math.max(BIRD_SPAWN_MIN_INTERVAL, BIRD_SPAWN_BASE_INTERVAL - reduction);
}

function randomBirdY() {
    const margin = 20;
    return margin + Math.random() * (GROUND_Y - BIRD_HEIGHT - 2 * margin);
}

// ---------------------------------------------------------------------------
// Spawner state
// ---------------------------------------------------------------------------

let nextSpawnDistancePx = 0;
let hazards = [];
let zappers = [];
let birds = [];
let lasers = [];
let birdSpawnTimer = 0;
let birdVolleyQueue = 0;
let birdVolleyTimer = 0;

export function resetSpawner() {
    nextSpawnDistancePx = SPAWNER_GRACE_DISTANCE;
    hazards = [];
    zappers = [];
    birds = [];
    lasers = [];
    birdSpawnTimer = 0;
    birdVolleyQueue = 0;
    birdVolleyTimer = 0;
}

export function updateSpawner(dt, distancePx, turkeyCenterX, turkeyCenterY) {
    const distanceMeters = Math.floor(distancePx / PIXELS_PER_METER);

    // Spawn next pattern when distance threshold is reached
    if (distancePx >= nextSpawnDistancePx) {
        const tier = selectTier(distanceMeters);
        const pattern = pickRandom(POOL_BY_TIER[tier]);
        for (const elem of pattern.elements) {
            spawnElement(elem, hazards, zappers, lasers);
        }
        spawnFoodFormation(pattern.width);
        nextSpawnDistancePx = distancePx + pattern.width + getGapForDistance(distanceMeters);
    }

    // Update and cull ground hazards
    for (const h of hazards) {
        updateGroundHazard(h, dt);
    }
    hazards = hazards.filter(h => !isOffScreen(h));

    // Update and cull zappers
    for (const z of zappers) {
        updateZapper(z, dt);
    }
    zappers = zappers.filter(z => !isZapperOffScreen(z));

    // Update and cull lasers
    for (const l of lasers) {
        updateLaser(l, dt);
    }
    lasers = lasers.filter(l => !isLaserOffScreen(l));

    // --- Birds (timer-based, independent of pattern pool) ---
    if (distanceMeters >= BIRD_SPAWN_MIN_DISTANCE) {
        // Volley: spawn queued birds with a delay between them
        if (birdVolleyQueue > 0) {
            birdVolleyTimer -= dt;
            if (birdVolleyTimer <= 0) {
                birds.push(createBird(randomBirdY()));
                birdVolleyQueue--;
                birdVolleyTimer = BIRD_VOLLEY_DELAY;
            }
        }

        // Main bird spawn timer
        birdSpawnTimer -= dt;
        if (birdSpawnTimer <= 0) {
            birds.push(createBird(randomBirdY()));
            birdSpawnTimer = getBirdSpawnInterval(distanceMeters);

            // Possibly trigger a volley (1-2 extra birds after a short delay)
            if (Math.random() < BIRD_VOLLEY_CHANCE) {
                birdVolleyQueue = 1 + Math.floor(Math.random() * (BIRD_VOLLEY_MAX - 1));
                birdVolleyTimer = BIRD_VOLLEY_DELAY;
            }
        }
    }

    // Update and cull birds
    for (const b of birds) {
        updateBird(b, dt, turkeyCenterX, turkeyCenterY);
    }
    birds = birds.filter(b => !isBirdOffScreen(b));
}

export function getHazards() {
    return hazards;
}

export function getZappers() {
    return zappers;
}

export function getBirds() {
    return birds;
}

export function getLasers() {
    return lasers;
}
