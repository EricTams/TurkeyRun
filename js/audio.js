// AIDEV-NOTE: Audio manager for background music and sound effects. Handles
// loading, looping playback, pause/resume, mute toggle with persistent mute
// preference, and one-shot SFX playback via Web Audio API (supports gain > 1).

const MUSIC_PATH = 'assets/music/Mushroom Escape.mp3';
const MUSIC_VOLUME = 0.075; // Keep it low so it doesn't overpower gameplay
const VICTORY_PATH = 'assets/sound/Win.m4a';
const VICTORY_VOLUME = 0.6;
const MUTE_STORAGE_KEY = 'turkeyrun_muted';

let musicElement = null;
let muted = false;
let musicReady = false;
let victoryElement = null;
let victoryReady = false;

// Web Audio API context (created lazily on first user gesture)
let audioCtx = null;

// SFX decoded audio buffers keyed by name
const sfxBuffers = {};
const SFX_MANIFEST = [
    { name: 'eggCrack', path: 'assets/sound/Egg Crack.mp3', gain: 0.4 },
    { name: 'crunch',   path: 'assets/sound/Crunch.m4a',    gain: 3.0 },
    { name: 'gobble2',  path: 'assets/sound/Gobble2.m4a',   gain: 1.0 },
    { name: 'gobble3',  path: 'assets/sound/Gobble3.m4a',   gain: 1.0 },
    { name: 'gobble4',  path: 'assets/sound/Gobble4.m4a',   gain: 1.0 },
    { name: 'fingerEat', path: 'assets/sound/Finger Eat.m4a', gain: 2.4 },
];

/** Ensure the AudioContext exists. */
function ensureAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browsers suspend until a user gesture)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

/** Fetch and decode a single SFX file into a Web Audio buffer. */
function loadSfx(entry) {
    return fetch(entry.path)
        .then(res => res.arrayBuffer())
        .then(buf => ensureAudioCtx().decodeAudioData(buf))
        .then(decoded => {
            sfxBuffers[entry.name] = { buffer: decoded, gain: entry.gain };
        })
        .catch(() => {
            console.warn('Failed to load SFX:', entry.path);
        });
}

/** Load the music file, all SFX, and restore mute preference. Returns a promise. */
export function loadMusic() {
    // Restore mute preference from localStorage
    try {
        muted = localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
    } catch (_) {
        muted = false;
    }

    const musicPromise = new Promise((resolve) => {
        musicElement = new Audio(MUSIC_PATH);
        musicElement.loop = true;
        musicElement.volume = muted ? 0 : MUSIC_VOLUME;
        musicElement.preload = 'auto';

        musicElement.addEventListener('canplaythrough', () => {
            musicReady = true;
            resolve();
        }, { once: true });

        musicElement.addEventListener('error', () => {
            console.warn('Failed to load music:', MUSIC_PATH);
            resolve();
        }, { once: true });

        musicElement.load();
    });

    const victoryPromise = new Promise((resolve) => {
        victoryElement = new Audio(VICTORY_PATH);
        victoryElement.loop = false;
        victoryElement.volume = muted ? 0 : VICTORY_VOLUME;
        victoryElement.preload = 'auto';

        victoryElement.addEventListener('canplaythrough', () => {
            victoryReady = true;
            resolve();
        }, { once: true });

        victoryElement.addEventListener('error', () => {
            console.warn('Failed to load victory music:', VICTORY_PATH);
            resolve();
        }, { once: true });

        victoryElement.load();
    });

    ensureAudioCtx();
    const sfxPromises = SFX_MANIFEST.map(loadSfx);

    return Promise.all([musicPromise, victoryPromise, ...sfxPromises]);
}

/** Start or resume the background music. */
export function playMusic() {
    if (!musicElement || !musicReady) return;
    musicElement.volume = muted ? 0 : MUSIC_VOLUME;
    musicElement.play().catch(() => {});
}

/** Pause the background music (preserves position). */
export function pauseMusic() {
    if (!musicElement) return;
    musicElement.pause();
}

/** Stop the music and reset to the beginning. */
export function stopMusic() {
    if (!musicElement) return;
    musicElement.pause();
    musicElement.currentTime = 0;
}

/** Start the victory music from the beginning. */
export function playVictoryMusic() {
    if (!victoryElement || !victoryReady) return;
    stopMusic();
    victoryElement.currentTime = 0;
    victoryElement.volume = muted ? 0 : VICTORY_VOLUME;
    victoryElement.play().catch(() => {});
}

/** Stop the victory music and reset to start. */
export function stopVictoryMusic() {
    if (!victoryElement) return;
    victoryElement.pause();
    victoryElement.currentTime = 0;
}

/**
 * Play a one-shot sound effect by name using Web Audio API.
 * Gain values above 1.0 amplify quiet sounds.
 */
export function playSfx(name) {
    const entry = sfxBuffers[name];
    if (!entry || muted) return;
    const ctx = ensureAudioCtx();

    const source = ctx.createBufferSource();
    source.buffer = entry.buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.value = entry.gain;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(0);
}

/** Play a random gobble SFX (death sound). */
export function playGobble() {
    const gobbles = ['gobble2', 'gobble3', 'gobble4'];
    const pick = gobbles[Math.floor(Math.random() * gobbles.length)];
    playSfx(pick);
}

/** Toggle mute state. Returns the new muted value. */
export function toggleMute() {
    muted = !muted;
    if (musicElement) {
        musicElement.volume = muted ? 0 : MUSIC_VOLUME;
    }
    if (victoryElement) {
        victoryElement.volume = muted ? 0 : VICTORY_VOLUME;
    }
    try {
        localStorage.setItem(MUTE_STORAGE_KEY, muted ? 'true' : 'false');
    } catch (_) {
        // Storage unavailable -- ignore
    }
    return muted;
}

/** Returns true if music is currently muted. */
export function isMuted() {
    return muted;
}
