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
    return getTier('partingGift') * 2; // 0/2/4/6/8/10
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
