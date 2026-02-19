// Save system with 3 named slots. Each slot stores player name, total coins,
// best distance, purchasedNodes (upgrade tree), and loadout (equipped gadgets).

import { TREE_NODES } from './meta/upgradeTree.js';

const SAVE_KEY = 'turkeyrun_saves';
const SLOT_COUNT = 3;

let slots = [null, null, null];
let activeSlotIndex = -1;

function createEmptySlotData(name) {
    return {
        name,
        totalCoins: 0,
        bestDistance: 0,
        purchasedNodes: ['start'],
        loadout: [null, null],
        runCount: 0,
    };
}

export function loadSlots() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length === SLOT_COUNT) {
                slots = parsed;
                // Migrate old saves that lack new fields
                for (const slot of slots) {
                    if (slot && !slot.purchasedNodes) {
                        slot.purchasedNodes = ['start'];
                    }
                    if (slot && !slot.loadout) {
                        slot.loadout = [null, null];
                    }
                    if (slot && slot.runCount == null) {
                        slot.runCount = 0;
                    }
                }
            }
        }
    } catch (e) {
        console.warn('Failed to load save data:', e);
    }
}

function persistSlots() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(slots));
    } catch (e) {
        console.warn('Failed to save data:', e);
    }
}

export function getSlots() {
    return slots;
}

export function getSlot(index) {
    return slots[index] || null;
}

export function getActiveSlot() {
    if (activeSlotIndex < 0 || activeSlotIndex >= SLOT_COUNT) return null;
    return slots[activeSlotIndex];
}

export function getActiveSlotIndex() {
    return activeSlotIndex;
}

export function setActiveSlotIndex(index) {
    activeSlotIndex = index;
}

export function createSlot(index, name) {
    slots[index] = createEmptySlotData(name);
    persistSlots();
}

export function deleteSlot(index) {
    slots[index] = null;
    if (activeSlotIndex === index) {
        activeSlotIndex = -1;
    }
    persistSlots();
}

// Called after each run. Returns true if the player beat their best distance.
export function updateActiveSlot(coinsEarned, distance) {
    const slot = getActiveSlot();
    if (!slot) return false;

    slot.totalCoins += coinsEarned;
    slot.runCount = (slot.runCount || 0) + 1;
    const isNewBest = distance > slot.bestDistance;
    if (isNewBest) {
        slot.bestDistance = distance;
    }
    persistSlots();
    return isNewBest;
}

// Purchase a node: deduct coins, add to purchasedNodes
export function purchaseNode(nodeId, cost) {
    const slot = getActiveSlot();
    if (!slot) return;
    slot.totalCoins -= cost;
    if (!slot.purchasedNodes.includes(nodeId)) {
        slot.purchasedNodes.push(nodeId);
    }
    persistSlots();
}

// Update the loadout (array of gadget IDs)
export function setLoadout(gadgetIds) {
    const slot = getActiveSlot();
    if (!slot) return;
    slot.loadout = gadgetIds;
    persistSlots();
}

export function getLoadout() {
    const slot = getActiveSlot();
    if (!slot) return [null, null];
    return slot.loadout || [null, null];
}

export function getPurchasedNodes() {
    const slot = getActiveSlot();
    if (!slot) return ['start'];
    return slot.purchasedNodes || ['start'];
}

// --- Derive gadget levels from purchased nodes ---
// Returns { gadgetId: maxLevel(0-indexed) } for all owned gadgets
export function deriveGadgetLevels() {
    const purchased = new Set(getPurchasedNodes());
    const levels = {};
    for (const node of TREE_NODES) {
        if (node.type !== 'gadget') continue;
        if (!purchased.has(node.id)) continue;
        const gid = node.gadgetId;
        const current = levels[gid] ?? -1;
        if (node.level > current) levels[gid] = node.level;
    }
    return levels;
}

// --- Derive passive tiers from purchased nodes ---
// Returns { passiveId: maxTier(1-indexed) }
export function derivePassiveTiers() {
    const purchased = new Set(getPurchasedNodes());
    const tiers = {};
    for (const node of TREE_NODES) {
        if (node.type !== 'passive') continue;
        if (!purchased.has(node.id)) continue;
        const pid = node.passiveId;
        const tierVal = node.tier + 1; // 1-indexed
        const current = tiers[pid] ?? 0;
        if (tierVal > current) tiers[pid] = tierVal;
    }
    return tiers;
}

// --- Derive milestones from purchased nodes ---
export function deriveMilestones() {
    const purchased = new Set(getPurchasedNodes());
    const milestones = {};
    for (const node of TREE_NODES) {
        if (node.type !== 'milestone') continue;
        milestones[node.milestoneId] = purchased.has(node.id);
    }
    return milestones;
}

// How many gadget slots the player has (2 base + milestones)
export function getGadgetSlotCount() {
    const ms = deriveMilestones();
    let count = 2;
    if (ms.thirdSlot) count = 3;
    if (ms.fourthSlot) count = 4;
    return count;
}

// Progress percentage: purchased nodes / total nodes (excluding start)
export function getProgressPercent(slot) {
    if (!slot || !slot.purchasedNodes) return 0;
    const total = TREE_NODES.length - 1; // exclude start
    if (total <= 0) return 0;
    const owned = slot.purchasedNodes.filter(id => id !== 'start').length;
    return Math.floor((owned / total) * 100);
}

export function getSlotCount() {
    return SLOT_COUNT;
}
