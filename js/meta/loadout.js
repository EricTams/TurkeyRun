// Loadout screen: shown before each run. Player can equip gadgets into slots.
// Tap a slot to open a picker of unlocked gadgets. Tap "Start Run" to begin.

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config.js';
import { GADGETS } from './upgradeTree.js';

const BG = '#1a1a2e';
const SLOT_SIZE = 64;
const SLOT_GAP = 16;
const SLOT_Y = 160;
const SLOT_BG = '#2a2a4a';
const SLOT_BORDER = '#5a5a9a';
const SLOT_EMPTY_TEXT = '#666688';
const SLOT_FILLED_BG = '#2a5a2a';
const SLOT_FILLED_BORDER = '#3a8a3a';
const TITLE_COLOR = '#FFD700';

const START_BTN = { x: (CANVAS_WIDTH - 200) / 2, y: 340, w: 200, h: 48 };
const BACK_BTN = { x: 10, y: CANVAS_HEIGHT - 44, w: 80, h: 34 };

let slotCount = 2;
let loadout = [null, null];   // gadget IDs
let ownedGadgets = {};        // gadgetId -> level
let pickerOpen = false;
let pickerSlotIdx = -1;
let pickerGadgets = [];       // list of gadgetIds to choose from
let pickerScroll = 0;

const PICKER_W = 300;
const PICKER_H = 240;
const PICKER_X = (CANVAS_WIDTH - PICKER_W) / 2;
const PICKER_Y = (CANVAS_HEIGHT - PICKER_H) / 2;
const PICKER_ROW_H = 36;

export function initLoadout(slots, gadgetLevels, currentLoadout) {
    slotCount = slots;
    ownedGadgets = { ...gadgetLevels };
    // Ensure loadout array matches slot count
    loadout = [];
    for (let i = 0; i < slotCount; i++) {
        loadout.push(currentLoadout[i] || null);
    }
    // Remove any gadgets that are no longer owned
    for (let i = 0; i < loadout.length; i++) {
        if (loadout[i] && !(loadout[i] in ownedGadgets)) {
            loadout[i] = null;
        }
    }
    pickerOpen = false;
}

export function getLoadoutResult() {
    return [...loadout];
}

export function onLoadoutClick(x, y) {
    if (pickerOpen) {
        return handlePickerClick(x, y);
    }

    // Start run button
    if (inRect(x, y, START_BTN)) return 'startRun';

    // Back button
    if (inRect(x, y, BACK_BTN)) return 'back';

    // Slot tap
    const slotsStartX = (CANVAS_WIDTH - (slotCount * SLOT_SIZE + (slotCount - 1) * SLOT_GAP)) / 2;
    for (let i = 0; i < slotCount; i++) {
        const sx = slotsStartX + i * (SLOT_SIZE + SLOT_GAP);
        if (x >= sx && x <= sx + SLOT_SIZE && y >= SLOT_Y && y <= SLOT_Y + SLOT_SIZE) {
            openPicker(i);
            return null;
        }
    }
    return null;
}

function openPicker(slotIdx) {
    pickerSlotIdx = slotIdx;
    pickerScroll = 0;
    // Build list of gadgets available (owned, not already in another slot)
    const inUse = new Set(loadout.filter((g, i) => g && i !== slotIdx));
    pickerGadgets = Object.keys(ownedGadgets).filter(gid => !inUse.has(gid));
    pickerGadgets.unshift(null); // "Empty" option
    pickerOpen = true;
}

function handlePickerClick(x, y) {
    // Outside picker = close
    if (x < PICKER_X || x > PICKER_X + PICKER_W ||
        y < PICKER_Y || y > PICKER_Y + PICKER_H) {
        pickerOpen = false;
        return null;
    }
    // Which row?
    const headerH = 32;
    const listY = PICKER_Y + headerH;
    const relY = y - listY + pickerScroll;
    const rowIdx = Math.floor(relY / PICKER_ROW_H);
    if (rowIdx >= 0 && rowIdx < pickerGadgets.length) {
        loadout[pickerSlotIdx] = pickerGadgets[rowIdx];
        pickerOpen = false;
        return 'loadoutChanged';
    }
    return null;
}

export function renderLoadout(ctx) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = TITLE_COLOR;
    ctx.fillText('LOADOUT', CANVAS_WIDTH / 2, 50);

    // Subtitle
    ctx.font = '14px monospace';
    ctx.fillStyle = '#AAAACC';
    ctx.fillText('Tap a slot to equip a gadget', CANVAS_WIDTH / 2, 85);

    // Slots label
    ctx.font = '12px monospace';
    ctx.fillStyle = '#888899';
    ctx.fillText(`${slotCount} slot${slotCount > 1 ? 's' : ''} available`, CANVAS_WIDTH / 2, 130);

    // Draw slots
    const slotsStartX = (CANVAS_WIDTH - (slotCount * SLOT_SIZE + (slotCount - 1) * SLOT_GAP)) / 2;
    for (let i = 0; i < slotCount; i++) {
        const sx = slotsStartX + i * (SLOT_SIZE + SLOT_GAP);
        const gid = loadout[i];
        const filled = gid && GADGETS[gid];

        ctx.fillStyle = filled ? SLOT_FILLED_BG : SLOT_BG;
        ctx.fillRect(sx, SLOT_Y, SLOT_SIZE, SLOT_SIZE);
        ctx.strokeStyle = filled ? SLOT_FILLED_BORDER : SLOT_BORDER;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, SLOT_Y, SLOT_SIZE, SLOT_SIZE);

        ctx.font = '10px monospace';
        ctx.fillStyle = filled ? '#FFFFFF' : SLOT_EMPTY_TEXT;
        const label = filled ? GADGETS[gid].name : 'Empty';
        ctx.fillText(label, sx + SLOT_SIZE / 2, SLOT_Y + SLOT_SIZE / 2);

        if (filled) {
            const lv = ownedGadgets[gid];
            ctx.font = '9px monospace';
            ctx.fillStyle = '#AADDAA';
            ctx.fillText(`Lv${lv + 1}`, sx + SLOT_SIZE / 2, SLOT_Y + SLOT_SIZE - 8);
        }
    }

    // Active passives summary
    ctx.font = '12px monospace';
    ctx.fillStyle = '#8888BB';
    ctx.fillText('Passives are always active', CANVAS_WIDTH / 2, SLOT_Y + SLOT_SIZE + 30);

    // Start button
    ctx.fillStyle = '#2a7a2a';
    ctx.fillRect(START_BTN.x, START_BTN.y, START_BTN.w, START_BTN.h);
    ctx.strokeStyle = '#3aaa3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(START_BTN.x, START_BTN.y, START_BTN.w, START_BTN.h);
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('START RUN', START_BTN.x + START_BTN.w / 2, START_BTN.y + START_BTN.h / 2);

    // Back button
    ctx.fillStyle = '#2a2a5a';
    ctx.fillRect(BACK_BTN.x, BACK_BTN.y, BACK_BTN.w, BACK_BTN.h);
    ctx.strokeStyle = '#4a4a8a';
    ctx.lineWidth = 1;
    ctx.strokeRect(BACK_BTN.x, BACK_BTN.y, BACK_BTN.w, BACK_BTN.h);
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#AAAACC';
    ctx.fillText('BACK', BACK_BTN.x + BACK_BTN.w / 2, BACK_BTN.y + BACK_BTN.h / 2);

    // Picker overlay
    if (pickerOpen) renderPicker(ctx);
}

function renderPicker(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(PICKER_X, PICKER_Y, PICKER_W, PICKER_H);
    ctx.strokeStyle = '#5a5a9a';
    ctx.lineWidth = 2;
    ctx.strokeRect(PICKER_X, PICKER_Y, PICKER_W, PICKER_H);

    // Header
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Choose Gadget', PICKER_X + PICKER_W / 2, PICKER_Y + 16);

    // Clip for list
    ctx.save();
    const headerH = 32;
    ctx.beginPath();
    ctx.rect(PICKER_X, PICKER_Y + headerH, PICKER_W, PICKER_H - headerH);
    ctx.clip();

    const listY = PICKER_Y + headerH;
    for (let i = 0; i < pickerGadgets.length; i++) {
        const ry = listY + i * PICKER_ROW_H - pickerScroll;
        const gid = pickerGadgets[i];

        // Hover-style alternating bg
        ctx.fillStyle = i % 2 === 0 ? '#1a1a3a' : '#222244';
        ctx.fillRect(PICKER_X + 2, ry, PICKER_W - 4, PICKER_ROW_H);

        ctx.textAlign = 'left';
        ctx.font = '13px monospace';
        if (gid === null) {
            ctx.fillStyle = '#666688';
            ctx.fillText('  (Empty)', PICKER_X + 10, ry + PICKER_ROW_H / 2);
        } else {
            const g = GADGETS[gid];
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(`  ${g.name}`, PICKER_X + 10, ry + PICKER_ROW_H / 2);
            ctx.textAlign = 'right';
            ctx.font = '11px monospace';
            ctx.fillStyle = '#AADDAA';
            ctx.fillText(`Lv${(ownedGadgets[gid] || 0) + 1}`, PICKER_X + PICKER_W - 12, ry + PICKER_ROW_H / 2);
        }
    }

    ctx.restore();
}

function inRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
