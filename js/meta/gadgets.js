// Gadget runtime state and effect application.
// Gadgets are equipped in loadout slots. Their effects are queried during runs.

import { announce } from './gadgetEffects.js';
import { getCoinDoublerMult, getCompoundMult } from './passives.js';
import {
    BIOME_GRASS_START,
    BIOME_MOUNTAIN_START,
    BIOME_MOON_START,
    BIOME_SPIRITUAL_START
} from '../config.js';

let equippedGadgets = []; // array of gadgetId strings
let gadgetLevels = {};    // gadgetId -> 0-based level (0=Lv1, 1=Lv2, 2=Lv3)

// --- Per-run state ---
let shieldHits = 0;
let shieldInvulnTimer = 0;
const SHIELD_INVULN_DURATION = 1.0; // 1 second of i-frames after absorbing a hit
let iguanaPunches = 0;
let decoyTimer = 0;
let flashInvulnTimer = 0;
let secondWindUsed = false;

// --- Setup ---

export function setEquippedGadgets(gadgetIds) {
    equippedGadgets = gadgetIds.filter(Boolean);
}

export function setGadgetLevels(levels) {
    gadgetLevels = { ...levels };
}

export function isEquipped(gadgetId) {
    return equippedGadgets.includes(gadgetId);
}

export function getRunStartDistanceMeters() {
    if (isEquipped('startRealm')) return BIOME_SPIRITUAL_START;
    if (isEquipped('startSpace')) return BIOME_MOON_START;
    if (isEquipped('startMountain')) return BIOME_MOUNTAIN_START;
    if (isEquipped('startGrass')) return BIOME_GRASS_START;
    return 0;
}

function getLevel(gadgetId) {
    return gadgetLevels[gadgetId] ?? -1; // -1 = not owned
}

function equippedLevel(gadgetId) {
    if (!isEquipped(gadgetId)) return -1;
    return getLevel(gadgetId);
}

// --- Per-run reset ---

export function resetGadgetRunState(toughFeathersTier) {
    const shieldLv = equippedLevel('shield');
    shieldHits = (shieldLv >= 0 ? shieldLv + 1 : 0) + toughFeathersTier;
    shieldInvulnTimer = 0;
    decoyTimer = 0;
    flashInvulnTimer = 0;
    secondWindUsed = false;
    const punchLv = equippedLevel('iguanaPuncher');
    iguanaPunches = punchLv >= 0 ? [10, 20, Infinity][punchLv] : 0;
    console.log(`[Gadgets] Run start — shield hits: ${shieldHits}, iguana punches: ${iguanaPunches}, equipped: [${equippedGadgets.join(', ')}]`);
}

// --- Shield ---

export function hasShieldHit() {
    return shieldHits > 0;
}

export function shieldHitsRemaining() {
    return shieldHits;
}

export function consumeShieldHit() {
    if (shieldHits > 0) {
        shieldHits--;
        shieldInvulnTimer = SHIELD_INVULN_DURATION;
        console.log(`[Shield] Hit absorbed! ${shieldHits} hits remaining, ${SHIELD_INVULN_DURATION}s i-frames`);
        return true;
    }
    return false;
}

export function isShieldInvulnerable() {
    return shieldInvulnTimer > 0;
}

// --- Second Chance (distance-based invuln pulse) ---

export function getSecondChanceDuration() {
    const lv = equippedLevel('secondChance');
    if (lv < 0) return 0;
    return [16, 24, 32][lv];
}

export function isSecondChanceEquipped() {
    return equippedLevel('secondChance') >= 0;
}

// --- Second Wind (revive chance) ---

export function trySecondWind() {
    if (secondWindUsed) return false;
    const lv = equippedLevel('secondWind');
    if (lv < 0) return false;
    const chance = [0.3, 0.5, 0.75][lv];
    const roll = Math.random();
    secondWindUsed = true;
    if (roll < chance) {
        console.log(`[Second Wind] Revived! (rolled ${(roll * 100).toFixed(0)}% < ${(chance * 100).toFixed(0)}%)`);
        announce('SECOND WIND!', '#44FF44');
        return true;
    }
    console.log(`[Second Wind] Failed (rolled ${(roll * 100).toFixed(0)}% >= ${(chance * 100).toFixed(0)}%)`);
    return false;
}

// --- Iguana Puncher ---

export function hasIguanaPunch() {
    return iguanaPunches > 0;
}

export function iguanaPunchesRemaining() {
    return iguanaPunches;
}

export function consumeIguanaPunch() {
    if (iguanaPunches > 0) {
        if (iguanaPunches !== Infinity) iguanaPunches--;
        const remaining = iguanaPunches === Infinity ? '∞' : iguanaPunches;
        console.log(`[Iguana Puncher] PUNCH! ${remaining} punches remaining`);
        announce('IGUANA PUNCH!', '#FF6600');
        return true;
    }
    return false;
}

// --- Hazard Jammer ---

export function shouldJamZapper() {
    const lv = equippedLevel('hazardJammer');
    if (lv < 0) return false;
    const chance = [0.05, 0.10, 0.15][lv];
    const jammed = Math.random() < chance;
    if (jammed) announce('JAMMED!', '#FF8844');
    return jammed;
}

export function shouldJamLaser() {
    const lv = equippedLevel('hazardJammer');
    if (lv < 2) return false;
    const jammed = Math.random() < 0.15;
    if (jammed) announce('LASER JAMMED!', '#FF8844');
    return jammed;
}

// --- Thick Skin (laser grace) ---

export function getLaserGraceTime() {
    const lv = equippedLevel('thickSkin');
    if (lv < 0) return 0;
    return [0.3, 0.5, 0.7][lv];
}

// --- Flash (near-miss invuln) ---

export function triggerFlashInvuln() {
    const lv = equippedLevel('flash');
    if (lv < 0) return;
    flashInvulnTimer = [0.3, 0.5, 0.8][lv];
    announce('FLASH!', '#FFFFFF');
}

export function isFlashInvulnerable() {
    return flashInvulnTimer > 0;
}

// --- Decoy ---

export function tryDeployDecoy() {
    const lv = equippedLevel('decoy');
    if (lv < 0) return null;
    if (decoyTimer > 0) return null;
    const cooldown = [15, 12, 8][lv];
    const destroys = lv >= 2;
    decoyTimer = cooldown;
    announce('DECOY!', '#AADDFF');
    return { destroys };
}

// --- Timers update (call each frame) ---

export function updateGadgetTimers(dt) {
    if (shieldInvulnTimer > 0) shieldInvulnTimer -= dt;
    if (decoyTimer > 0) decoyTimer -= dt;
    if (flashInvulnTimer > 0) flashInvulnTimer -= dt;
}

// --- Total coin multiplier from all gadget effects ---

export function getTotalCoinMultiplier() {
    let mult = 1.0;
    mult *= getCoinDoublerMult();
    mult *= getCompoundMult();
    return mult;
}
