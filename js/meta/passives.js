// Passive upgrade runtime. Passives are always active once purchased.
// Tiers are derived from purchasedNodes in save data.

import { announce } from './gadgetEffects.js';

let passiveTiers = {};  // passiveId -> current tier (1-indexed, 0 = not owned)

export function setPassiveTiers(tiers) {
    passiveTiers = { ...tiers };
    const active = Object.entries(passiveTiers).filter(([, t]) => t > 0);
    if (active.length > 0) {
        console.log(`[Passives] Active: ${active.map(([id, t]) => `${id} T${t}`).join(', ')}`);
    }
}

function getTier(passiveId) {
    return passiveTiers[passiveId] || 0;
}

// --- Nest Egg: +4% per tier base coins ---
export function getNestEggBonusPct() {
    return getTier('nestEgg') * 4; // 0/4/8/12/16/20
}

// --- Parting Gift: % of distance as bonus coins on death ---
export function getPartingGiftPct() {
    return getTier('partingGift') * 4; // 0/4/8/12/16/20
}

// --- Bargain Hunter: shop price discount tier ---
export function getBargainTier() {
    return getTier('bargainHunter'); // 0/1/2/3
}

// --- Tough Feathers: free shield hits at run start ---
export function getToughFeathersTier() {
    return getTier('toughFeathers'); // 0/1/2/3
}


// --- Ezy-Dodge: hitbox shrink ---
export function getHitboxShrinkFactor() {
    const t = getTier('ezyDodge');
    if (t === 0) return 1.0;
    return [1.0, 0.85, 0.75, 0.65][t];
}

// --- Coin Magnet: pickup radius ---
export function getMagnetMultiplier() {
    const t = getTier('coinMagnet');
    if (t === 0) return 1.0;
    return [1.0, 4, 7, 10][t];
}

export function doesFoodDrift() {
    return getTier('coinMagnet') >= 3;
}

// --- Coin Doubler: coin multiplier ---
export function getCoinDoublerMult() {
    const t = getTier('coinDoubler');
    if (t === 0) return 1.0;
    return [1.0, 1.25, 1.5, 1.75][t];
}

// --- Compound Interest: distance-based multiplier ---
let compoundMult = 1.0;
let compoundDistLast = 0;

export function updateCompound(distanceMeters) {
    const t = getTier('compoundInterest');
    if (t === 0) return;
    const interval = t >= 2 ? 400 : 500;
    const increment = t >= 3 ? 0.15 : 0.1;
    while (distanceMeters >= compoundDistLast + interval) {
        compoundDistLast += interval;
        compoundMult += increment;
    }
}

export function getCompoundMult() {
    return compoundMult;
}

export function resetCompound() {
    compoundMult = 1.0;
    compoundDistLast = 0;
}

// --- Money Grubber: passive coin generation ---
let moneyGrubberTimer = 0;
let moneyGrubberTotal = 0;

export function updateMoneyGrubber(dt, onGround) {
    const t = getTier('moneyGrubber');
    if (t === 0) return 0;
    if (!onGround) return 0;
    const interval = [0, 1.5, 1, 0.75][t];
    moneyGrubberTimer += dt;
    let earned = 0;
    while (moneyGrubberTimer >= interval) {
        moneyGrubberTimer -= interval;
        earned++;
    }
    if (earned > 0) {
        moneyGrubberTotal += earned;
        console.log(`[Money Grubber] +${earned} passive coin(s)`);
    }
    return earned;
}

export function getMoneyGrubberTotal() {
    return moneyGrubberTotal;
}

export function resetMoneyGrubber() {
    moneyGrubberTimer = 0;
    moneyGrubberTotal = 0;
}

// --- Gemologist: chance for high-value food ---
export function rollGemologist() {
    const t = getTier('gemologist');
    if (t === 0) return 1;
    const chance = [0, 0.05, 0.10, 0.15][t];
    const mult = t >= 3 ? 8 : 5;
    const hit = Math.random() < chance;
    if (hit) {
        console.log(`[Gemologist] Proc! Food worth ${mult}x`);
        announce(`GEM! ${mult}x`, '#FF44FF');
    }
    return hit ? mult : 1;
}

// --- Streak Master: rolling 5s window bonus on consecutive food pickups ---
const STREAK_WINDOW = 5;
let streakCount = 0;
let streakTotalBonus = 0;
let streakRecentCoins = [];

export function onFoodCollected(coinValue) {
    const now = performance.now() / 1000;
    streakRecentCoins.push({ value: coinValue, time: now });
    streakRecentCoins = streakRecentCoins.filter(e => now - e.time <= STREAK_WINDOW);
    streakCount++;

    const windowTotal = streakRecentCoins.reduce((s, e) => s + e.value, 0);
    const t = getTier('streakMaster');
    if (t === 0) return 0;

    const threshold = [0, 10, 7, 5][t];
    if (streakCount >= threshold) {
        const bonusPct = t >= 3 ? 0.5 : 0.25;
        const bonus = Math.floor(windowTotal * bonusPct);
        streakTotalBonus += bonus;
        console.log(`[Streak Master] FIRED — ${threshold}-streak! +${bonus}`);
        announce(`${threshold} STREAK! +${bonus}`, '#FFDD44');
        streakCount = 0;
        return bonus;
    }
    return 0;
}

export function onFoodMissed() {
    streakCount = 0;
}

export function getStreakTotalBonus() {
    return streakTotalBonus;
}

export function resetStreak() {
    streakCount = 0;
    streakTotalBonus = 0;
    streakRecentCoins = [];
}

// --- Bounty Hunter: near-miss coin rewards ---
let lastNearMissTime = 0;
let nearMissChain = 0;

export function onNearMiss(currentTime) {
    const t = getTier('bountyHunter');
    if (t === 0) return 0;
    const basePayout = [0, 2, 4, 4][t];
    if (t >= 3 && currentTime - lastNearMissTime < 2) {
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

export function resetBounty() {
    lastNearMissTime = 0;
    nearMissChain = 0;
}

// --- Jackpot: chance for massive food payout ---
export function rollJackpot() {
    const t = getTier('jackpot');
    if (t === 0) return 1;
    const chance = [0, 0.03, 0.05, 0.07][t];
    const mult = t >= 3 ? 30 : 20;
    const hit = Math.random() < chance;
    if (hit) {
        console.log(`[Jackpot] JACKPOT! ${mult}x payout!`);
        announce(`JACKPOT! ${mult}x`, '#FFD700');
    }
    return hit ? mult : 1;
}

// Compute bonus coins from passives at end of run
export function computePassiveBonusCoins(baseCoins, distanceMeters) {
    let bonus = 0;
    // Nest Egg
    const nestPct = getNestEggBonusPct();
    if (nestPct > 0) bonus += Math.floor(baseCoins * nestPct / 100);
    // Parting Gift
    const partPct = getPartingGiftPct();
    if (partPct > 0) bonus += Math.floor(distanceMeters * partPct / 100);
    return bonus;
}
