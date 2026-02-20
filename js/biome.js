// AIDEV-NOTE: Biome progression system (chunk 11). Defines 5 biomes with
// distinct color palettes and ground hazard types. Provides smooth color
// lerping during transitions and time-based color shifting for the
// spiritual realm.

import {
    BIOME_BEACH_START, BIOME_GRASS_START, BIOME_MOUNTAIN_START,
    BIOME_MOON_START, BIOME_SPIRITUAL_START, BIOME_TRANSITION_METERS
} from './config.js';

// ---------------------------------------------------------------------------
// Biome definitions
// ---------------------------------------------------------------------------

const BIOMES = [
    {
        name: 'beach',
        startDistance: BIOME_BEACH_START,
        sky: '#87CEEB',
        farBg: '#6DB3D1',
        nearBg: '#5A9E5A',
        ground: '#C2B280',
        groundStripe: '#B0A06A',
        groundHazards: ['oldIguana'],
        skyBlockers: ['pufferfish'],
        foodTypes: ['foodCoconut', 'foodLemonade'],
    },
    {
        name: 'grass',
        startDistance: BIOME_GRASS_START,
        sky: '#78C0D4',
        farBg: '#5C8A5C',
        nearBg: '#3D6B3D',
        ground: '#6AAF4E',
        groundStripe: '#528A3C',
        groundHazards: ['oldIguana'],
        skyBlockers: ['pufferfish'],
        foodTypes: ['foodChickenLeg', 'foodCookie'],
    },
    {
        name: 'mountain',
        startDistance: BIOME_MOUNTAIN_START,
        sky: '#8BAEC4',
        farBg: '#7A8899',
        nearBg: '#5E6670',
        ground: '#8B7D6B',
        groundStripe: '#736B5C',
        groundHazards: ['boulder', 'icePatch'],
        skyBlockers: ['smallAsteroid', 'mediumAsteroid'],
        foodTypes: ['foodPotato', 'foodChurro'],
    },
    {
        name: 'moon',
        startDistance: BIOME_MOON_START,
        sky: '#0C0C28',
        farBg: '#1A1A3A',
        nearBg: '#252545',
        ground: '#9A9A9A',
        groundStripe: '#7A7A7A',
        groundHazards: ['crater', 'alienRock'],
        skyBlockers: ['mediumAsteroid', 'largeAsteroid'],
        foodTypes: ['foodIceCream', 'foodDonut'],
    },
    {
        name: 'spiritual',
        startDistance: BIOME_SPIRITUAL_START,
        sky: '#1A002A',
        farBg: '#2D0050',
        nearBg: '#4A0080',
        ground: '#3A0060',
        groundStripe: '#5A0085',
        groundHazards: ['tieDyeIguana'],
        skyBlockers: ['largeAsteroid'],
        foodTypes: ['foodCarrot', 'foodTaco'],
        shifting: true,
    },
];

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
}

function rgbToHex(r, g, b) {
    const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
    return '#' + [clamp(r), clamp(g), clamp(b)]
        .map(c => c.toString(16).padStart(2, '0'))
        .join('');
}

function lerpColor(hexA, hexB, t) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    return rgbToHex(
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t
    );
}

function shiftColor(hex, timeOffset) {
    const [r, g, b] = hexToRgb(hex);
    const t = Date.now() / 3000 + timeOffset;
    const shift = 25;
    return rgbToHex(
        r + Math.sin(t) * shift,
        g + Math.sin(t + 2.1) * shift,
        b + Math.sin(t + 4.2) * shift
    );
}

// ---------------------------------------------------------------------------
// Debug override -- keys 1-5 force a specific biome regardless of distance
// ---------------------------------------------------------------------------

let debugOverrideIndex = -1;

export function setDebugBiomeOverride(biomeNumber) {
    const idx = biomeNumber - 1;
    if (idx >= 0 && idx < BIOMES.length) {
        debugOverrideIndex = idx;
    }
}

export function clearDebugBiomeOverride() {
    debugOverrideIndex = -1;
}

export function getDebugBiomeOverride() {
    return debugOverrideIndex >= 0 ? debugOverrideIndex + 1 : 0;
}

// ---------------------------------------------------------------------------
// Biome index lookup
// ---------------------------------------------------------------------------

function getBiomeIndex(distanceMeters) {
    if (debugOverrideIndex >= 0) return debugOverrideIndex;
    for (let i = BIOMES.length - 1; i >= 0; i--) {
        if (distanceMeters >= BIOMES[i].startDistance) {
            return i;
        }
    }
    return 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getBiomeColors(distanceMeters) {
    const idx = getBiomeIndex(distanceMeters);
    const current = BIOMES[idx];

    let sky = current.sky;
    let farBg = current.farBg;
    let nearBg = current.nearBg;
    let ground = current.ground;
    let groundStripe = current.groundStripe;

    // Check if we're in a transition zone leading into the next biome
    if (idx < BIOMES.length - 1) {
        const next = BIOMES[idx + 1];
        const transitionStart = next.startDistance - BIOME_TRANSITION_METERS;
        if (distanceMeters >= transitionStart) {
            const t = (distanceMeters - transitionStart) / BIOME_TRANSITION_METERS;
            sky = lerpColor(current.sky, next.sky, t);
            farBg = lerpColor(current.farBg, next.farBg, t);
            nearBg = lerpColor(current.nearBg, next.nearBg, t);
            ground = lerpColor(current.ground, next.ground, t);
            groundStripe = lerpColor(current.groundStripe, next.groundStripe, t);
        }
    }

    // Spiritual realm: apply time-based color shifting
    if (current.shifting) {
        sky = shiftColor(sky, 0);
        farBg = shiftColor(farBg, 1.5);
        nearBg = shiftColor(nearBg, 3.0);
        ground = shiftColor(ground, 4.5);
        groundStripe = shiftColor(groundStripe, 6.0);
    }

    return { sky, farBg, nearBg, ground, groundStripe };
}

export function getBiomeGroundHazards(distanceMeters) {
    const idx = getBiomeIndex(distanceMeters);
    return BIOMES[idx].groundHazards;
}

export function getBiomeSkyBlockers(distanceMeters) {
    const idx = getBiomeIndex(distanceMeters);
    return BIOMES[idx].skyBlockers || [];
}

export function getCurrentBiomeName(distanceMeters) {
    const idx = getBiomeIndex(distanceMeters);
    return BIOMES[idx].name;
}

export function getBiomeFoodTypes(distanceMeters) {
    const idx = getBiomeIndex(distanceMeters);
    return BIOMES[idx].foodTypes;
}

export function isSpiritualRealm(distanceMeters) {
    return getCurrentBiomeName(distanceMeters) === 'spiritual';
}

// Returns a 0-1 blend factor for the spiritual realm (used to fade in effects
// during the transition zone). Returns 0 when fully outside, 1 when fully in.
export function getSpiritualBlend(distanceMeters) {
    if (debugOverrideIndex >= 0) {
        return BIOMES[debugOverrideIndex].name === 'spiritual' ? 1 : 0;
    }
    if (distanceMeters >= BIOME_SPIRITUAL_START) return 1;
    const transitionStart = BIOME_SPIRITUAL_START - BIOME_TRANSITION_METERS;
    if (distanceMeters < transitionStart) return 0;
    return (distanceMeters - transitionStart) / BIOME_TRANSITION_METERS;
}
