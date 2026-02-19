// Passive upgrade runtime. Passives are always active once purchased.
// Tiers are derived from purchasedNodes in save data.

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

// --- Second Chance: invuln pulse every 500m ---
export function getSecondChanceTier() {
    return getTier('secondChance'); // 0/1/2/3
}

export function getSecondChanceDuration() {
    const t = getTier('secondChance');
    if (t === 0) return 0;
    return [0, 2, 3, 4][t];
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

export function updateMoneyGrubber(dt) {
    const t = getTier('moneyGrubber');
    if (t === 0) return 0;
    const interval = [0, 3, 2, 1.5][t];
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
