// Gadget runtime state and effect application.
// Gadgets are equipped in loadout slots. Their effects are queried during runs.

import { announce } from './gadgetEffects.js';
import { getCoinDoublerMult, getCompoundMult } from './passives.js';

let equippedGadgets = []; // array of gadgetId strings
let gadgetLevels = {};    // gadgetId -> 0-based level (0=Lv1, 1=Lv2, 2=Lv3)

// --- Per-run state ---
let shieldHits = 0;
let shieldInvulnTimer = 0;
const SHIELD_INVULN_DURATION = 1.0; // 1 second of i-frames after absorbing a hit
let streakCount = 0;
let streakTotalBonus = 0;
let streakRecentCoins = [];  // { value, time } — rolling 5s window, never manually cleared
let adrenalineTimer = 0;
let adrenalineMult = 1;
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
    streakCount = 0;
    streakTotalBonus = 0;
    streakRecentCoins = [];
    adrenalineTimer = 0;
    adrenalineMult = 1;
    decoyTimer = 0;
    flashInvulnTimer = 0;
    secondWindUsed = false;
    console.log(`[Gadgets] Run start — shield hits: ${shieldHits}, equipped: [${equippedGadgets.join(', ')}]`);
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
        const adLv = equippedLevel('adrenaline');
        if (adLv >= 0) {
            adrenalineTimer = [3, 4, 5][adLv];
            adrenalineMult = adLv >= 2 ? 3 : 2;
            console.log(`[Adrenaline] Triggered: ${adrenalineMult}x coins for ${adrenalineTimer}s`);
            announce(`ADRENALINE ${adrenalineMult}x`, '#FF4444');
        }
        return true;
    }
    return false;
}

export function isShieldInvulnerable() {
    return shieldInvulnTimer > 0;
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

// --- Gemologist ---

export function rollGemologist() {
    const lv = equippedLevel('gemologist');
    if (lv < 0) return 1;
    const chance = [0.05, 0.10, 0.15][lv];
    const mult = lv >= 2 ? 8 : 5;
    const hit = Math.random() < chance;
    if (hit) {
        console.log(`[Gemologist] Proc! Food worth ${mult}x`);
        announce(`GEM! ${mult}x`, '#FF44FF');
    }
    return hit ? mult : 1;
}

// --- Streak Master ---
// Rolling 5-second window tracks coin values. When the consecutive-collect
// threshold is reached, bonus = percentage of everything in that window.
// The window is NEVER manually cleared — it self-manages via time pruning.

const STREAK_WINDOW = 5;

export function onFoodCollected(coinValue) {
    const now = performance.now() / 1000;
    streakRecentCoins.push({ value: coinValue, time: now });
    streakRecentCoins = streakRecentCoins.filter(e => now - e.time <= STREAK_WINDOW);
    streakCount++;

    const windowTotal = streakRecentCoins.reduce((s, e) => s + e.value, 0);
    const windowCount = streakRecentCoins.length;
    console.log(`[Streak] food +${coinValue}, streak: ${streakCount}, window: ${windowCount} items / ${windowTotal} coins (last ${STREAK_WINDOW}s), lv: ${equippedLevel('streakMaster')}`);

    const lv = equippedLevel('streakMaster');
    if (lv < 0) return 0;

    const threshold = [10, 7, 5][lv];
    if (streakCount >= threshold) {
        const bonusPct = lv >= 2 ? 0.5 : 0.25;
        const bonus = Math.floor(windowTotal * bonusPct);
        streakTotalBonus += bonus;
        console.log(`[Streak Master] FIRED — ${threshold}-streak! ${Math.round(bonusPct * 100)}% of ${windowTotal} coins (${windowCount} items in window) = +${bonus}, runTotal now ${streakTotalBonus}`);
        announce(`${threshold} STREAK! +${bonus}`, '#FFDD44');
        streakCount = 0;
        return bonus;
    }
    return 0;
}

export function onFoodMissed() {
    console.log(`[Streak] MISSED — streak broken at ${streakCount}`);
    streakCount = 0;
}

export function getStreakTotalBonus() {
    return streakTotalBonus;
}

// --- Bounty Hunter (near-miss coins) ---

let lastNearMissTime = 0;
let nearMissChain = 0;

export function onNearMiss(currentTime) {
    const lv = equippedLevel('bountyHunter');
    if (lv < 0) return 0;
    const basePayout = [2, 4, 4][lv];
    if (lv >= 2 && currentTime - lastNearMissTime < 2) {
        nearMissChain++;
    } else {
        nearMissChain = 1;
    }
    lastNearMissTime = currentTime;
    const payout = basePayout * nearMissChain;
    if (nearMissChain > 1) {
        announce(`BOUNTY x${nearMissChain}! +${payout}`, '#FFAA00');
    } else {
        announce(`+${payout} BOUNTY`, '#FFAA00');
    }
    return payout;
}

// --- Jackpot ---

export function rollJackpot() {
    const lv = equippedLevel('jackpot');
    if (lv < 0) return 1;
    const chance = [0.03, 0.05, 0.07][lv];
    const mult = lv >= 2 ? 30 : 20;
    const hit = Math.random() < chance;
    if (hit) {
        console.log(`[Jackpot] JACKPOT! ${mult}x payout!`);
        announce(`JACKPOT! ${mult}x`, '#FFD700');
    }
    return hit ? mult : 1;
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

// --- Adrenaline ---

export function getAdrenalineMult() {
    if (adrenalineTimer <= 0) return 1;
    return adrenalineMult;
}

// --- Timers update (call each frame) ---

export function updateGadgetTimers(dt) {
    if (shieldInvulnTimer > 0) shieldInvulnTimer -= dt;
    if (adrenalineTimer > 0) adrenalineTimer -= dt;
    if (decoyTimer > 0) decoyTimer -= dt;
    if (flashInvulnTimer > 0) flashInvulnTimer -= dt;
}

// --- Total coin multiplier from all gadget effects ---

export function getTotalCoinMultiplier() {
    let mult = 1.0;
    mult *= getCoinDoublerMult();
    mult *= getCompoundMult();
    mult *= getAdrenalineMult();
    return mult;
}
