// AIDEV-NOTE: Save system with 3 named slots (chunk 10). Each slot stores
// player name, total coins, best distance, and unlock/progression data.
// Progress percentage is computed from unlocks (0% until later chunks add
// unlockable content).

const SAVE_KEY = 'turkeyrun_saves';
const SLOT_COUNT = 3;

let slots = [null, null, null];
let activeSlotIndex = -1;

function createEmptySlotData(name) {
    return {
        name,
        totalCoins: 0,
        bestDistance: 0,
        unlocks: {}
    };
}

export function loadSlots() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length === SLOT_COUNT) {
                slots = parsed;
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
    const isNewBest = distance > slot.bestDistance;
    if (isNewBest) {
        slot.bestDistance = distance;
    }
    persistSlots();
    return isNewBest;
}

// Progress percentage: total items unlocked / total unlockable items.
// Returns 0% until shop/gadgets/cosmetics are added in later chunks.
export function getProgressPercent(slot) {
    if (!slot || !slot.unlocks) return 0;
    const totalUnlockable = 0;
    if (totalUnlockable === 0) return 0;
    const unlocked = Object.keys(slot.unlocks).filter(k => slot.unlocks[k]).length;
    return Math.floor((unlocked / totalUnlockable) * 100);
}

export function getSlotCount() {
    return SLOT_COUNT;
}
