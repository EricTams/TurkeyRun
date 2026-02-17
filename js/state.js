// AIDEV-NOTE: Game state constants and screen rendering (chunk 10).
// Manages SLOT_SELECT, PLAYING, and DEAD states with full UI for the
// slot-selection screen and the post-death run summary overlay.

import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config.js';
import { getProgressPercent } from './save.js';

// ---------------------------------------------------------------------------
// State constants
// ---------------------------------------------------------------------------
export const SLOT_SELECT = 'SLOT_SELECT';
export const PLAYING = 'PLAYING';
export const DEAD = 'DEAD';

// ---------------------------------------------------------------------------
// Slot-select screen layout
// ---------------------------------------------------------------------------
const PANEL_W = 200;
const PANEL_H = 270;
const PANEL_Y = 110;
const PANEL_GAP = (CANVAS_WIDTH - 3 * PANEL_W) / 4; // 50

const DELETE_BTN_W = 80;
const DELETE_BTN_H = 28;

const SLOT_BG = '#1a1a2e';
const PANEL_BG = 'rgba(42, 42, 74, 0.9)';
const PANEL_BORDER = '#5a5a9a';
const PANEL_EMPTY_BORDER = '#3a3a5a';
const TITLE_COLOR = '#FFD700';
const SUBTITLE_COLOR = '#AAAACC';
const SLOT_LABEL_COLOR = '#8888AA';
const NAME_COLOR = '#FFFFFF';
const STAT_COLOR = '#CCCCEE';
const EMPTY_COLOR = '#666688';
const CREATE_COLOR = '#88AAFF';
const DELETE_BG = '#882222';
const DELETE_BORDER = '#AA4444';
const DELETE_TEXT = '#FFFFFF';

function getPanelX(i) {
    return PANEL_GAP + i * (PANEL_W + PANEL_GAP);
}

function getSlotPanelRect(i) {
    return { x: getPanelX(i), y: PANEL_Y, w: PANEL_W, h: PANEL_H };
}

function getDeleteBtnRect(i) {
    const px = getPanelX(i);
    return {
        x: px + (PANEL_W - DELETE_BTN_W) / 2,
        y: PANEL_Y + PANEL_H - 40,
        w: DELETE_BTN_W,
        h: DELETE_BTN_H
    };
}

function pointInRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// Returns { action: 'select'|'delete', slotIndex } or null.
export function getSlotSelectAction(cx, cy, slots) {
    for (let i = 0; i < 3; i++) {
        const panel = getSlotPanelRect(i);
        if (pointInRect(cx, cy, panel)) {
            if (slots[i]) {
                const del = getDeleteBtnRect(i);
                if (pointInRect(cx, cy, del)) {
                    return { action: 'delete', slotIndex: i };
                }
            }
            return { action: 'select', slotIndex: i };
        }
    }
    return null;
}

function truncateName(name, maxLen) {
    return name.length > maxLen ? name.substring(0, maxLen - 1) + '\u2026' : name;
}

export function renderSlotSelectScreen(ctx, slots) {
    // Background
    ctx.fillStyle = SLOT_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title with drop shadow
    ctx.font = 'bold 42px monospace';
    ctx.fillStyle = '#000000';
    ctx.fillText('TURKEY RUNNER', CANVAS_WIDTH / 2 + 2, 42);
    ctx.fillStyle = TITLE_COLOR;
    ctx.fillText('TURKEY RUNNER', CANVAS_WIDTH / 2, 40);

    // Subtitle
    ctx.font = '18px monospace';
    ctx.fillStyle = SUBTITLE_COLOR;
    ctx.fillText('Select a Save Slot', CANVAS_WIDTH / 2, 78);

    // Three slot panels
    for (let i = 0; i < 3; i++) {
        renderSlotPanel(ctx, i, slots[i]);
    }
}

function renderSlotPanel(ctx, index, slot) {
    const px = getPanelX(index);
    const centerX = px + PANEL_W / 2;

    // Panel background
    ctx.fillStyle = PANEL_BG;
    ctx.fillRect(px, PANEL_Y, PANEL_W, PANEL_H);

    // Border
    ctx.strokeStyle = slot ? PANEL_BORDER : PANEL_EMPTY_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(px, PANEL_Y, PANEL_W, PANEL_H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Slot label
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = SLOT_LABEL_COLOR;
    ctx.fillText(`SLOT ${index + 1}`, centerX, PANEL_Y + 22);

    if (slot) {
        renderUsedSlot(ctx, index, slot, centerX);
    } else {
        renderEmptySlot(ctx, centerX);
    }
}

function renderUsedSlot(ctx, index, slot, centerX) {
    // Player name
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = NAME_COLOR;
    ctx.fillText(truncateName(slot.name, 10), centerX, PANEL_Y + 65);

    // Divider line
    const px = getPanelX(index);
    ctx.strokeStyle = PANEL_BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 20, PANEL_Y + 88);
    ctx.lineTo(px + PANEL_W - 20, PANEL_Y + 88);
    ctx.stroke();

    // Stats
    ctx.font = '15px monospace';
    ctx.fillStyle = STAT_COLOR;
    ctx.fillText(`Best: ${slot.bestDistance}m`, centerX, PANEL_Y + 115);
    ctx.fillText(`Coins: ${slot.totalCoins}`, centerX, PANEL_Y + 143);

    const pct = getProgressPercent(slot);
    ctx.fillText(`Progress: ${pct}%`, centerX, PANEL_Y + 171);

    // "Select" hint
    ctx.font = '13px monospace';
    ctx.fillStyle = CREATE_COLOR;
    ctx.fillText('Tap to Play', centerX, PANEL_Y + 205);

    // Delete button
    const del = getDeleteBtnRect(index);
    ctx.fillStyle = DELETE_BG;
    ctx.fillRect(del.x, del.y, del.w, del.h);
    ctx.strokeStyle = DELETE_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(del.x, del.y, del.w, del.h);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = DELETE_TEXT;
    ctx.fillText('DELETE', del.x + del.w / 2, del.y + del.h / 2);
}

function renderEmptySlot(ctx, centerX) {
    // Large plus icon
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = EMPTY_COLOR;
    ctx.fillText('+', centerX, PANEL_Y + 115);

    // "Empty" label
    ctx.font = '16px monospace';
    ctx.fillStyle = EMPTY_COLOR;
    ctx.fillText('Empty', centerX, PANEL_Y + 165);

    // Call to action
    ctx.font = '13px monospace';
    ctx.fillStyle = CREATE_COLOR;
    ctx.fillText('Tap to Create', centerX, PANEL_Y + 195);
}

// ---------------------------------------------------------------------------
// Run summary (dead) screen
// ---------------------------------------------------------------------------
const OVERLAY_BG = 'rgba(0, 0, 0, 0.7)';
const GAME_OVER_COLOR = '#FF4444';
const NEW_BEST_COLOR = '#FFD700';
const PLAY_AGAIN_BG = '#2a7a2a';
const PLAY_AGAIN_BORDER = '#3a9a3a';
const PLAY_AGAIN_TEXT = '#FFFFFF';

const PLAY_AGAIN_BTN = {
    x: (CANVAS_WIDTH - 200) / 2,
    y: 345,
    w: 200,
    h: 48
};

export function renderRunSummary(ctx, distance, coinsEarned, totalCoins, bestDistance, isNewBest) {
    // Dark overlay
    ctx.fillStyle = OVERLAY_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // "GAME OVER" with drop shadow
    ctx.font = 'bold 44px monospace';
    ctx.fillStyle = '#000000';
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2 + 2, 67);
    ctx.fillStyle = GAME_OVER_COLOR;
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, 65);

    // "NEW BEST!" flash
    let statsY = 135;
    if (isNewBest) {
        const flash = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        ctx.save();
        ctx.globalAlpha = flash;
        ctx.font = 'bold 26px monospace';
        ctx.fillStyle = NEW_BEST_COLOR;
        ctx.fillText('\u2605 NEW BEST! \u2605', CANVAS_WIDTH / 2, 110);
        ctx.restore();
        statsY = 150;
    }

    // Stats
    const lineH = 34;
    const sx = CANVAS_WIDTH / 2;

    ctx.font = '20px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Distance: ${distance}m`, sx, statsY);

    ctx.fillStyle = '#FFD700';
    ctx.fillText(`Coins Earned: ${coinsEarned}`, sx, statsY + lineH);

    ctx.fillStyle = '#CCCCFF';
    ctx.fillText(`Total Coins: ${totalCoins}`, sx, statsY + lineH * 2);

    ctx.fillStyle = '#AADDAA';
    ctx.fillText(`Best Distance: ${bestDistance}m`, sx, statsY + lineH * 3);

    // "Play Again" button
    const btn = PLAY_AGAIN_BTN;
    ctx.fillStyle = PLAY_AGAIN_BG;
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.strokeStyle = PLAY_AGAIN_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = PLAY_AGAIN_TEXT;
    ctx.fillText('Play Again', btn.x + btn.w / 2, btn.y + btn.h / 2);
}
