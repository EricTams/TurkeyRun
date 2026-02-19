// Gadget runtime state and effect application.
// Gadgets are equipped in loadout slots. Their effects are queried during runs.

import { GADGETS } from './upgradeTree.js';

let equippedGadgets = []; // array of gadgetId strings
let gadgetLevels = {};    // gadgetId -> 0-based level (0=Lv1, 1=Lv2, 2=Lv3)

// --- Per-run state ---
let shieldHits = 0;
let shieldInvulnTimer = 0;
const SHIELD_INVULN_DURATION = 1.0; // 1 second of i-frames after absorbing a hit
let streakCount = 0;
let streakBonusTimer = 0;
let moneyGrubberTimer = 0;
let compoundDistLast = 0;
let compoundMult = 1.0;
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
    streakBonusTimer = 0;
    moneyGrubberTimer = 0;
    compoundDistLast = 0;
    compoundMult = 1.0;
    adrenalineTimer = 0;
    adrenalineMult = 1;
    decoyTimer = 0;
    flashInvulnTimer = 0;
    secondWindUsed = false;
    const magLv = equippedLevel('coinMagnet');
    console.log(`[Gadgets] Run start — shield hits: ${shieldHits}, equipped: [${equippedGadgets.join(', ')}]`);
    if (magLv >= 0) console.log(`[Coin Magnet] Active Lv${magLv + 1} — pickup radius ${getMagnetMultiplier()}x (base 8px → ${8 * getMagnetMultiplier()}px)`);
    if (equippedLevel('coinDoubler') >= 0) console.log(`[Coin Doubler] Active — ${getCoinDoublerMult()}x multiplier`);
    if (equippedLevel('moneyGrubber') >= 0) console.log(`[Money Grubber] Active — 1 coin every ${[3, 2, 1.5][equippedLevel('moneyGrubber')]}s`);
    if (equippedLevel('ezyDodge') >= 0) console.log(`[Ezy-Dodge] Active — hitbox ${Math.round(getHitboxShrinkFactor() * 100)}% size`);
}

// --- Shield ---

export function hasShieldHit() {
    return shieldHits > 0;
}

export function consumeShieldHit() {
    if (shieldHits > 0) {
        shieldHits--;
        shieldInvulnTimer = SHIELD_INVULN_DURATION;
        console.log(`[Shield] Hit absorbed! ${shieldHits} hits remaining, ${SHIELD_INVULN_DURATION}s i-frames`);
        // Trigger adrenaline if equipped
        const adLv = equippedLevel('adrenaline');
        if (adLv >= 0) {
            adrenalineTimer = [3, 4, 5][adLv];
            adrenalineMult = adLv >= 2 ? 3 : 2;
            console.log(`[Adrenaline] Triggered: ${adrenalineMult}x coins for ${adrenalineTimer}s`);
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
        return true;
    }
    console.log(`[Second Wind] Failed (rolled ${(roll * 100).toFixed(0)}% >= ${(chance * 100).toFixed(0)}%)`);
    return false;
}

// --- Ezy-Dodge (hitbox shrink) ---

export function getHitboxShrinkFactor() {
    const lv = equippedLevel('ezyDodge');
    if (lv < 0) return 1.0;
    return [0.85, 0.75, 0.65][lv];
}

// --- Coin Magnet (pickup radius) ---

export function getMagnetMultiplier() {
    const lv = equippedLevel('coinMagnet');
    if (lv < 0) return 1.0;
    return [4, 7, 10][lv];
}

export function doesFoodDrift() {
    return equippedLevel('coinMagnet') >= 2;
}

// --- Coin Doubler ---

export function getCoinDoublerMult() {
    const lv = equippedLevel('coinDoubler');
    if (lv < 0) return 1.0;
    return [1.5, 2.0, 2.5][lv];
}

// --- Gemologist ---

export function rollGemologist() {
    const lv = equippedLevel('gemologist');
    if (lv < 0) return 1;
    const chance = [0.05, 0.10, 0.15][lv];
    const mult = lv >= 2 ? 8 : 5;
    const hit = Math.random() < chance;
    if (hit) console.log(`[Gemologist] Proc! Food worth ${mult}x`);
    return hit ? mult : 1;
}

// --- Streak Master ---

export function onFoodCollected() {
    streakCount++;
    const lv = equippedLevel('streakMaster');
    if (lv >= 0) {
        const threshold = [10, 7, 5][lv];
        if (streakCount >= threshold) {
            streakBonusTimer = 5;
            const bonus = lv >= 2 ? '100%' : '50%';
            console.log(`[Streak Master] ${threshold}-streak! +${bonus} coins for 5s`);
            streakCount = 0;
        }
    }
}

export function onFoodMissed() {
    streakCount = 0;
}

export function getStreakBonusMult() {
    if (streakBonusTimer <= 0) return 1.0;
    const lv = equippedLevel('streakMaster');
    return lv >= 2 ? 2.0 : 1.5;
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
    return basePayout * nearMissChain;
}

// --- Compound Interest ---

export function updateCompound(distanceMeters) {
    const lv = equippedLevel('compoundInterest');
    if (lv < 0) return;
    const interval = lv >= 1 ? 400 : 500;
    const increment = lv >= 2 ? 0.15 : 0.1;
    while (distanceMeters >= compoundDistLast + interval) {
        compoundDistLast += interval;
        compoundMult += increment;
    }
}

export function getCompoundMult() {
    return compoundMult;
}

// --- Jackpot ---

export function rollJackpot() {
    const lv = equippedLevel('jackpot');
    if (lv < 0) return 1;
    const chance = [0.03, 0.05, 0.07][lv];
    const mult = lv >= 2 ? 30 : 20;
    const hit = Math.random() < chance;
    if (hit) console.log(`[Jackpot] JACKPOT! ${mult}x payout!`);
    return hit ? mult : 1;
}

// --- Money Grubber ---

export function updateMoneyGrubber(dt) {
    const lv = equippedLevel('moneyGrubber');
    if (lv < 0) return 0;
    const interval = [3, 2, 1.5][lv];
    moneyGrubberTimer += dt;
    let earned = 0;
    while (moneyGrubberTimer >= interval) {
        moneyGrubberTimer -= interval;
        earned++;
    }
    if (earned > 0) console.log(`[Money Grubber] +${earned} passive coin(s)`);
    return earned;
}

// --- Hazard Jammer ---

export function shouldJamZapper() {
    const lv = equippedLevel('hazardJammer');
    if (lv < 0) return false;
    const chance = [0.05, 0.10, 0.15][lv];
    return Math.random() < chance;
}

export function shouldJamLaser() {
    const lv = equippedLevel('hazardJammer');
    if (lv < 2) return false;
    return Math.random() < 0.15;
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
    if (streakBonusTimer > 0) streakBonusTimer -= dt;
    if (adrenalineTimer > 0) adrenalineTimer -= dt;
    if (decoyTimer > 0) decoyTimer -= dt;
    if (flashInvulnTimer > 0) flashInvulnTimer -= dt;
}

// --- Total coin multiplier from all gadget effects ---

export function getTotalCoinMultiplier() {
    let mult = 1.0;
    mult *= getCoinDoublerMult();
    mult *= getCompoundMult();
    mult *= getStreakBonusMult();
    mult *= getAdrenalineMult();
    return mult;
}
