// Laser pattern definitions. Each pattern has keyframed lasers.
// Helpers generate arc keyframes so rotational beams trace correct curves.

import { CANVAS_WIDTH, GROUND_Y } from '../config.js';

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function hBeam(t, y, state) {
    return { t, x1: 0, y1: y, x2: CANVAS_WIDTH, y2: y, state };
}

function withStartupPad(keyframes, startupPad) {
    if (startupPad <= 0 || !keyframes || keyframes.length === 0) return keyframes;
    const first = keyframes[0];
    const shifted = keyframes.map((k) => ({ ...k, t: k.t + startupPad }));
    return [{ ...first, t: 0, state: 'off' }, ...shifted];
}

function withPatternStartupPad(pattern, startupPad) {
    if (startupPad <= 0) return pattern;
    return {
        ...pattern,
        duration: pattern.duration + startupPad,
        lasers: pattern.lasers.map((laser) => ({
            ...laser,
            keyframes: withStartupPad(laser.keyframes, startupPad),
        })),
    };
}

function arcSweep(pivotX, pivotY, length, tStart, tEnd, angleStart, angleEnd, numSteps, state) {
    const kf = [];
    for (let i = 0; i <= numSteps; i++) {
        const frac = i / numSteps;
        const t = tStart + (tEnd - tStart) * frac;
        const a = angleStart + (angleEnd - angleStart) * frac;
        kf.push({
            t,
            x1: pivotX, y1: pivotY,
            x2: pivotX + length * Math.cos(a),
            y2: pivotY + length * Math.sin(a),
            state,
        });
    }
    return kf;
}

// -----------------------------------------------------------------------
// M1: The Sweep
// Single horizontal beam. Warning from edge to center, active from center
// to opposite edge. Player alternates low/high.
// Cycle: warn up 1.5s -> active up 1.25s -> warn down 1.5s -> active down 1.25s
// -----------------------------------------------------------------------

const H3_BASE = {
    id: 'H3',
    name: 'H3: Sky Lanes',
    tier: 'hard',
    duration: 11.0,
    lasers: [{
        loop: true,
        keyframes: [
            hBeam(0.00, GROUND_Y, 'warn'),
            hBeam(1.50, 200,      'active'),
            hBeam(2.75, 0,        'warn'),
            hBeam(4.25, 200,      'active'),
            hBeam(5.50, GROUND_Y, 'warn'),
        ],
    }],
};
const H3 = withPatternStartupPad(H3_BASE, 0.5);

// -----------------------------------------------------------------------
// M2: Crossing Edges
// Two lasers whose endpoints move along the edge of a square at constant
// speed, producing a rotating crossing in the center. Each laser has
// opposite endpoints (half-perimeter apart) so each beam always crosses
// center. Each beam has an active window so players can survive by timing
// their movement at the player column (x ~= 100): on near bottom-left
// approach, off near upper-left approach.
// -----------------------------------------------------------------------

const M2_SQ_LEFT = 80;
const M2_SQ_TOP = 0;
const M2_SQ_SIZE = GROUND_Y; // 400x400 square in playable space
const M2_CYCLE = 10.0;
const M2_ACTIVE_START = 0.70; // ~80% along bottom, moving left
const M2_ACTIVE_END = 0.95;   // ~80% up left edge, moving up
const M2_SAMPLES = 40;

const M2_ACTIVE_WINDOWS = [
    { start: M2_ACTIVE_START, end: M2_ACTIVE_END },
    // Opposite endpoint reaches the same bottom-left segment half a turn later.
    { start: (M2_ACTIVE_START + 0.5) % 1, end: (M2_ACTIVE_END + 0.5) % 1 },
];

function squareEdgePoint(p) {
    const turn = ((p % 1) + 1) % 1;
    const q = turn * 4;
    const left = M2_SQ_LEFT;
    const top = M2_SQ_TOP;
    const right = M2_SQ_LEFT + M2_SQ_SIZE;
    const bottom = M2_SQ_TOP + M2_SQ_SIZE;

    if (q < 1) return { x: left + M2_SQ_SIZE * q, y: top };
    if (q < 2) return { x: right, y: top + M2_SQ_SIZE * (q - 1) };
    if (q < 3) return { x: right - M2_SQ_SIZE * (q - 2), y: bottom };
    return { x: left, y: bottom - M2_SQ_SIZE * (q - 3) };
}

function buildM2SquareOrbitKeyframes(phaseOffset) {
    const times = new Set([0, M2_CYCLE]);
    for (const w of M2_ACTIVE_WINDOWS) {
        const transitionStart = (((w.start - phaseOffset) % 1) + 1) % 1 * M2_CYCLE;
        const transitionEnd = (((w.end - phaseOffset) % 1) + 1) % 1 * M2_CYCLE;
        times.add(transitionStart);
        times.add(transitionEnd);
    }
    for (let i = 1; i < M2_SAMPLES; i++) times.add((i / M2_SAMPLES) * M2_CYCLE);

    const sortedTimes = Array.from(times).sort((a, b) => a - b);
    return sortedTimes.map((t) => {
        const p = ((t / M2_CYCLE) + phaseOffset) % 1;
        const a = squareEdgePoint(p);
        const b = squareEdgePoint((p + 0.5) % 1);
        const state = isInAnyActiveWindow(p) ? 'active' : 'off';
        return { t, x1: a.x, y1: a.y, x2: b.x, y2: b.y, state };
    });
}

function isInAnyActiveWindow(p) {
    for (const w of M2_ACTIVE_WINDOWS) {
        if (isInWrappedWindow(p, w.start, w.end)) return true;
    }
    return false;
}

function isInWrappedWindow(p, start, end) {
    if (start <= end) return p >= start && p < end;
    return p >= start || p < end;
}

const H4_BASE = {
    id: 'H4',
    name: 'H4: Orbit Cross',
    tier: 'hard',
    duration: 12.0,
    lasers: [
        { loop: true, keyframes: buildM2SquareOrbitKeyframes(0.00) }, // starts at top-left/bottom-right
        { loop: true, keyframes: buildM2SquareOrbitKeyframes(0.25) }, // starts at top-right/bottom-left
    ],
};
const H4 = withPatternStartupPad(H4_BASE, 2.0);

// -----------------------------------------------------------------------
// Path-first helpers
// -----------------------------------------------------------------------

function buildCorridorBeamKeyframes(waypoints, gap, side, cycleDuration) {
    const sideSign = side === 'top' ? -1 : 1;
    const yForCenter = (centerY) => centerY + sideSign * gap * 0.5;
    const first = waypoints[0];
    const last = waypoints[waypoints.length - 1];

    return [
        hBeam(0.0, yForCenter(first.centerY), 'off'),
        hBeam(first.t, yForCenter(first.centerY), 'active'),
        ...waypoints.slice(1).map((w) => hBeam(w.t, yForCenter(w.centerY), 'active')),
        hBeam(last.t, yForCenter(last.centerY), 'off'),
        hBeam(cycleDuration, yForCenter(first.centerY), 'off'),
    ];
}

function buildCorridorPattern({ id, name, tier, duration, cycleDuration, gap, waypoints }) {
    return {
        id,
        name,
        tier,
        duration,
        lasers: [
            { loop: true, keyframes: buildCorridorBeamKeyframes(waypoints, gap, 'top', cycleDuration) },
            { loop: true, keyframes: buildCorridorBeamKeyframes(waypoints, gap, 'bottom', cycleDuration) },
        ],
    };
}

function inWindow(t, window) {
    return t >= window.start && t < window.end;
}

function pulseStateAt(t, windows) {
    for (const w of windows) {
        if (inWindow(t, w)) return 'active';
    }
    return 'off';
}

function buildPulseBeamKeyframes(y, windows, cycleDuration) {
    const times = new Set([0, cycleDuration]);
    for (const w of windows) {
        times.add(w.start);
        times.add(w.end);
    }
    return Array.from(times)
        .sort((a, b) => a - b)
        .map((t) => hBeam(t, y, pulseStateAt(t, windows)));
}

function buildTimedGatePattern({ id, name, tier, duration, cycleDuration, beams }) {
    return {
        id,
        name,
        tier,
        duration,
        lasers: beams.map((beam) => ({
            loop: true,
            keyframes: buildPulseBeamKeyframes(beam.y, beam.windows, cycleDuration),
        })),
    };
}

function buildSineWaypoints({ startT, endT, samples, centerY, amplitude, period }) {
    const waypoints = [];
    for (let i = 0; i <= samples; i++) {
        const frac = i / samples;
        const t = startT + (endT - startT) * frac;
        const phase = (t - startT) / period;
        waypoints.push({
            t,
            centerY: centerY + amplitude * Math.sin(phase * Math.PI * 2),
        });
    }
    return waypoints;
}

function buildDownUpSineWaypoints({
    startT, endT, samples, centerY, waveAmplitude, wavePeriod, trendAmplitude,
}) {
    const waypoints = [];
    for (let i = 0; i <= samples; i++) {
        const frac = i / samples;
        const t = startT + (endT - startT) * frac;
        const wavePhase = ((t - startT) / wavePeriod) * Math.PI * 2;
        const wave = waveAmplitude * Math.sin(wavePhase);
        // Down then up over one cycle: 0 -> +trendAmplitude -> 0.
        const trend = trendAmplitude * (1 - Math.cos(frac * Math.PI * 2)) * 0.5;
        waypoints.push({ t, centerY: centerY + trend + wave });
    }
    return waypoints;
}

// -----------------------------------------------------------------------
// H1: Ribbon Ride (gentle curved lane)
// -----------------------------------------------------------------------
const H1_BASE = buildCorridorPattern({
    id: 'H1',
    name: 'H1: Serpent Run',
    tier: 'hard',
    duration: 12.0,
    cycleDuration: 6.0,
    gap: 204,
    waypoints: buildSineWaypoints({
        startT: 1.0,
        endT: 5.0,
        samples: 20,
        centerY: 200,
        amplitude: 74,
        period: 4.4,
    }),
});
const H1 = withPatternStartupPad(H1_BASE, 1.0);

// -----------------------------------------------------------------------
// H2: Double Curl (deeper curved lane)
// -----------------------------------------------------------------------
const H2_WAYPOINTS = buildSineWaypoints({
    startT: 1.0,
    endT: 5.0,
    samples: 24,
    centerY: 200,
    amplitude: 52,
    period: 2.6,
});

const H2_BASE = {
    id: 'H2',
    name: 'H2: Twin Arcs',
    tier: 'hard',
    duration: 12.0,
    lasers: [
        // Inner pair defines the main gentle middle path.
        { loop: true, keyframes: buildCorridorBeamKeyframes(H2_WAYPOINTS, 160, 'top', 6.0) },
        { loop: true, keyframes: buildCorridorBeamKeyframes(H2_WAYPOINTS, 160, 'bottom', 6.0) },
        // Outer pair adds visual rhythm without forcing large vertical travel.
        { loop: true, keyframes: buildCorridorBeamKeyframes(H2_WAYPOINTS, 300, 'top', 6.0) },
        { loop: true, keyframes: buildCorridorBeamKeyframes(H2_WAYPOINTS, 300, 'bottom', 6.0) },
    ],
};
const H2 = withPatternStartupPad(H2_BASE, 1.0);

// -----------------------------------------------------------------------
// X1: Sine Corridor (moving safe path)
// -----------------------------------------------------------------------
const X1_WAYPOINTS = buildDownUpSineWaypoints({
    startT: 1.0,
    endT: 5.2,
    samples: 28,
    centerY: 170,
    waveAmplitude: 36,
    wavePeriod: 2.2,
    trendAmplitude: 66,
});

const X1_BASE = {
    id: 'X1',
    name: 'X1: Cyclone Ribbon',
    tier: 'extreme',
    duration: 12.0,
    lasers: [
        { loop: true, keyframes: buildCorridorBeamKeyframes(X1_WAYPOINTS, 152, 'top', 6.0) },
        { loop: true, keyframes: buildCorridorBeamKeyframes(X1_WAYPOINTS, 152, 'bottom', 6.0) },
        { loop: true, keyframes: buildCorridorBeamKeyframes(X1_WAYPOINTS, 286, 'top', 6.0) },
        { loop: true, keyframes: buildCorridorBeamKeyframes(X1_WAYPOINTS, 286, 'bottom', 6.0) },
    ],
};
const X1 = withPatternStartupPad(X1_BASE, 1.0);

// -----------------------------------------------------------------------
// X2: Pulse Matrix (original dense static rhythm puzzle)
// -----------------------------------------------------------------------
const X2_BASE = buildTimedGatePattern({
    id: 'X2',
    name: 'X2: Pulse Matrix',
    tier: 'extreme',
    duration: 7.2,
    cycleDuration: 7.2,
    beams: [
        { y: 80,  windows: [{ start: 1.0, end: 1.8 }, { start: 4.6, end: 5.4 }] },
        { y: 140, windows: [{ start: 2.4, end: 3.2 }, { start: 6.0, end: 6.8 }] },
        { y: 200, windows: [{ start: 1.0, end: 1.8 }, { start: 4.6, end: 5.4 }] },
        { y: 260, windows: [{ start: 2.4, end: 3.2 }, { start: 6.0, end: 6.8 }] },
        { y: 320, windows: [{ start: 1.0, end: 1.8 }, { start: 4.6, end: 5.4 }] },
    ],
});
const X2 = withPatternStartupPad(X2_BASE, 1.0);

// -----------------------------------------------------------------------
// X3: Gap Shift Matrix
// Six-laser extreme: required gap shifts through specific adjacent pairs:
// 3-4, 2-3, 4-5, 1-2, 5-6.
// -----------------------------------------------------------------------
const X3_ROWS_A = [40, 85, 130, 270, 315, 360]; // gap 3-4
const X3_ROWS_B = [40, 85, 225, 270, 315, 360]; // gap 2-3
const X3_ROWS_C = [40, 85, 130, 175, 315, 360]; // gap 4-5
const X3_ROWS_D = [40, 180, 225, 270, 315, 360]; // gap 1-2
const X3_ROWS_E = [40, 85, 130, 175, 220, 360]; // gap 5-6
const X3_EVENTS = [
    { t: 0.0, rows: X3_ROWS_A, state: 'off' },
    { t: 1.0, rows: X3_ROWS_A, state: 'active' }, // gap 3-4
    { t: 1.8, rows: X3_ROWS_A, state: 'off' },
    { t: 2.6, rows: X3_ROWS_B, state: 'active' }, // gap 2-3
    { t: 3.4, rows: X3_ROWS_B, state: 'off' },
    { t: 4.2, rows: X3_ROWS_C, state: 'active' }, // gap 4-5
    { t: 5.0, rows: X3_ROWS_C, state: 'off' },
    { t: 5.8, rows: X3_ROWS_D, state: 'active' }, // gap 1-2
    { t: 6.6, rows: X3_ROWS_D, state: 'off' },
    { t: 7.4, rows: X3_ROWS_E, state: 'active' }, // gap 5-6
    { t: 8.2, rows: X3_ROWS_E, state: 'off' },
    { t: 9.0, rows: X3_ROWS_A, state: 'active' }, // back to gap 3-4
    { t: 9.8, rows: X3_ROWS_A, state: 'off' },
    { t: 10.4, rows: X3_ROWS_A, state: 'off' },
];

function buildX3GapShiftKeyframes(laserIndex) {
    return X3_EVENTS.map((event) => hBeam(event.t, event.rows[laserIndex], event.state));
}

const X3_BASE = {
    id: 'X3',
    name: 'X3: Gap Shift Matrix',
    tier: 'extreme',
    duration: 10.4,
    lasers: Array.from({ length: 6 }, (_, i) => ({
        loop: true,
        keyframes: buildX3GapShiftKeyframes(i),
    })),
};
const X3 = withPatternStartupPad(X3_BASE, 1.0);

// -----------------------------------------------------------------------
// Medium starters: easier than M1/M2
// -----------------------------------------------------------------------
const M1_BASE = buildCorridorPattern({
    id: 'M1',
    name: 'M1: Breezy Bend',
    tier: 'medium',
    duration: 12.0,
    cycleDuration: 6.5,
    gap: 232,
    waypoints: buildSineWaypoints({
        startT: 1.0,
        endT: 5.4,
        samples: 20,
        centerY: 205,
        amplitude: 66,
        period: 3.4,
    }),
});
const M1 = withPatternStartupPad(M1_BASE, 1.0);

const M2 = buildTimedGatePattern({
    id: 'M2',
    name: 'M2: Easy Beat',
    tier: 'medium',
    duration: 12.0,
    cycleDuration: 6.5,
    beams: [
        { y: 130, windows: [{ start: 1.1, end: 1.9 }, { start: 4.2, end: 5.0 }] },
        { y: 270, windows: [{ start: 2.2, end: 3.0 }, { start: 5.2, end: 6.0 }] },
    ],
});

// -----------------------------------------------------------------------
// Export all patterns in order
// -----------------------------------------------------------------------

export const LASER_PATTERNS = [M1, M2, H1, H2, H3, H4, X1, X2, X3];

export const LASER_PATTERNS_BY_TIER = {
    medium:  [M1, M2],
    hard:    [H1, H2, H3, H4],
    extreme: [X1, X2, X3],
};
