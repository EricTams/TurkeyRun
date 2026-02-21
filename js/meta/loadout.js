// Loadout screen: shown before each run. Player can equip gadgets into slots.
// Tap a slot to open a full-screen picker. All gadgets fit — no scrolling needed.

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
let loadout = [null, null];
let ownedGadgets = {};
let pickerOpen = false;
let pickerSlotIdx = -1;
let pickerGadgets = [];

const PICKER_HEADER_H = 50;
const PICKER_ROW_H = 56;
const PICKER_PAD = 12;
const PICKER_COLS = 2;
const PICKER_COL_W = (CANVAS_WIDTH - PICKER_PAD * 2) / PICKER_COLS;
const START_GADGET_IDS = ['startGrass', 'startMountain', 'startSpace', 'startRealm'];

export function initLoadout(slots, gadgetLevels, currentLoadout) {
    slotCount = slots;
    ownedGadgets = { ...gadgetLevels };
    loadout = [];
    for (let i = 0; i < slotCount; i++) {
        loadout.push(currentLoadout[i] || null);
    }
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

function getCellIndex(x, y) {
    if (y < PICKER_HEADER_H) return -1;
    const col = Math.floor((x - PICKER_PAD) / PICKER_COL_W);
    const row = Math.floor((y - PICKER_HEADER_H) / PICKER_ROW_H);
    if (col < 0 || col >= PICKER_COLS) return -1;
    const idx = row * PICKER_COLS + col;
    if (idx < 0 || idx >= pickerGadgets.length) return -1;
    return idx;
}

export function onLoadoutClick(x, y) {
    if (pickerOpen) {
        if (y < PICKER_HEADER_H) {
            pickerOpen = false;
            return null;
        }
        const idx = getCellIndex(x, y);
        if (idx >= 0) {
            loadout[pickerSlotIdx] = pickerGadgets[idx];
            pickerOpen = false;
            return 'loadoutChanged';
        }
        return null;
    }

    if (inRect(x, y, START_BTN)) return 'startRun';
    if (inRect(x, y, BACK_BTN)) return 'back';

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
    const inUse = new Set(loadout.filter((g, i) => g && i !== slotIdx));
    pickerGadgets = Object.keys(ownedGadgets).filter(gid => {
        if (inUse.has(gid)) return false;
        if (!START_GADGET_IDS.includes(gid)) return true;
        for (const equipped of inUse) {
            if (START_GADGET_IDS.includes(equipped)) return false;
        }
        return true;
    });
    pickerGadgets.unshift(null);
    pickerOpen = true;
}

// --- Rendering ---

export function renderLoadout(ctx) {
    if (pickerOpen) {
        renderPicker(ctx);
        return;
    }

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = TITLE_COLOR;
    ctx.fillText('LOADOUT', CANVAS_WIDTH / 2, 50);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#AAAACC';
    ctx.fillText('Tap a slot to equip a gadget', CANVAS_WIDTH / 2, 85);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#888899';
    ctx.fillText(`${slotCount} slot${slotCount > 1 ? 's' : ''} available`, CANVAS_WIDTH / 2, 130);

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

    ctx.font = '12px monospace';
    ctx.fillStyle = '#8888BB';
    ctx.fillText('Passives are always active', CANVAS_WIDTH / 2, SLOT_Y + SLOT_SIZE + 30);

    drawBtn(ctx, START_BTN, 'START RUN', '#2a7a2a', '#3aaa3a', '#FFFFFF', 'bold 22px monospace');
    drawBtn(ctx, BACK_BTN, 'BACK', '#2a2a5a', '#4a4a8a', '#AAAACC', 'bold 14px monospace');
}

function renderPicker(ctx) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Header
    ctx.fillStyle = '#222244';
    ctx.fillRect(0, 0, CANVAS_WIDTH, PICKER_HEADER_H);
    ctx.strokeStyle = '#5a5a9a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, PICKER_HEADER_H);
    ctx.lineTo(CANVAS_WIDTH, PICKER_HEADER_H);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Choose Gadget', CANVAS_WIDTH / 2, PICKER_HEADER_H / 2);

    ctx.textAlign = 'left';
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#AAAACC';
    ctx.fillText('< Back', PICKER_PAD, PICKER_HEADER_H / 2);

    // Two-column grid
    for (let i = 0; i < pickerGadgets.length; i++) {
        const col = i % PICKER_COLS;
        const row = Math.floor(i / PICKER_COLS);
        const cx = PICKER_PAD + col * PICKER_COL_W;
        const cy = PICKER_HEADER_H + row * PICKER_ROW_H;
        const gid = pickerGadgets[i];

        ctx.fillStyle = (row + col) % 2 === 0 ? '#1e1e38' : '#252548';
        ctx.fillRect(cx, cy, PICKER_COL_W, PICKER_ROW_H);

        ctx.strokeStyle = '#333355';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx, cy, PICKER_COL_W, PICKER_ROW_H);

        if (gid === null) {
            ctx.textAlign = 'left';
            ctx.font = '14px monospace';
            ctx.fillStyle = '#666688';
            ctx.fillText('(Empty)', cx + 10, cy + PICKER_ROW_H / 2);
        } else {
            const g = GADGETS[gid];
            const level = ownedGadgets[gid] || 0;
            const levelData = g.levels[level];

            ctx.textAlign = 'left';
            ctx.font = '14px monospace';
            ctx.fillStyle = '#FFFFFF';
            const maxNameW = PICKER_COL_W - 84;
            ctx.fillText(ellipsize(ctx, g.name, maxNameW), cx + 10, cy + 18);

            ctx.textAlign = 'right';
            ctx.font = 'bold 12px monospace';
            ctx.fillStyle = '#AADDAA';
            ctx.fillText(`Lv${level + 1}`, cx + PICKER_COL_W - 10, cy + 18);

            ctx.textAlign = 'left';
            ctx.font = '10px monospace';
            ctx.fillStyle = '#AAB2DD';
            const maxDescW = PICKER_COL_W - 20;
            const desc = levelData?.desc || '';
            ctx.fillText(ellipsize(ctx, desc, maxDescW), cx + 10, cy + 38);
        }
    }
}

function drawBtn(ctx, r, label, bg, border, textColor, font) {
    ctx.fillStyle = bg;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font;
    ctx.fillStyle = textColor;
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
}

function inRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function ellipsize(ctx, text, maxW) {
    if (!text) return '';
    if (ctx.measureText(text).width <= maxW) return text;
    const dots = '...';
    const dotsW = ctx.measureText(dots).width;
    let out = text;
    while (out.length > 0 && ctx.measureText(out).width + dotsW > maxW) {
        out = out.slice(0, -1);
    }
    return out + dots;
}
