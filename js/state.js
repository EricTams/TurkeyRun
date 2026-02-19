// AIDEV-NOTE: Game state constants and screen rendering (chunks 10, 12).
// Manages all game states with full UI for loading, slot selection, main
// menu, pause overlay, and the post-death run summary.

import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config.js';
import { getProgressPercent } from './save.js';

// ---------------------------------------------------------------------------
// Logo image (loaded early so it appears on the loading screen)
// ---------------------------------------------------------------------------
let logoImg = null;

export function loadLogo() {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            logoImg = img;
            resolve();
        };
        img.onerror = () => {
            console.warn('Failed to load logo image');
            resolve();
        };
        img.src = 'assets/sprites/Logo/Logo-Logo.png';
        if (img.complete && img.naturalWidth > 0) {
            logoImg = img;
            resolve();
        }
    });
}

/** Draw the logo centered horizontally at (centerX, topY) with given width. */
function drawLogo(ctx, centerX, topY, width) {
    const height = width / 2; // Logo is 256x128 (2:1 aspect)
    if (logoImg) {
        const prevSmoothing = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(logoImg, centerX - width / 2, topY, width, height);
        ctx.imageSmoothingEnabled = prevSmoothing;
    } else {
        // Fallback text while image loads
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 42px monospace';
        ctx.fillStyle = '#000000';
        ctx.fillText('THE GOBBLER', centerX + 2, topY + height / 2 + 2);
        ctx.fillStyle = TITLE_COLOR;
        ctx.fillText('THE GOBBLER', centerX, topY + height / 2);
    }
}

// ---------------------------------------------------------------------------
// State constants
// ---------------------------------------------------------------------------
export const LOADING = 'LOADING';
export const SLOT_SELECT = 'SLOT_SELECT';
export const MENU = 'MENU';
export const SHOP = 'SHOP';
export const LOADOUT = 'LOADOUT';
export const HATCHING = 'HATCHING';
export const PLAYING = 'PLAYING';
export const PAUSED = 'PAUSED';
export const DYING = 'DYING';
export const DEAD = 'DEAD';

// ---------------------------------------------------------------------------
// Slot-select screen layout
// ---------------------------------------------------------------------------
const PANEL_W = 200;
const PANEL_H = 270;
const PANEL_Y = 135;
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

    // Logo
    drawLogo(ctx, CANVAS_WIDTH / 2, 4, 200);

    // Subtitle
    ctx.font = '18px monospace';
    ctx.fillStyle = SUBTITLE_COLOR;
    ctx.fillText('Select a Save Slot', CANVAS_WIDTH / 2, 116);

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
    ctx.fillText('Tap to Select', centerX, PANEL_Y + 205);

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
// Loading screen
// ---------------------------------------------------------------------------
const LOAD_BG = '#0a0a1e';
const LOAD_BAR_W = 400;
const LOAD_BAR_H = 24;
const LOAD_BAR_X = (CANVAS_WIDTH - LOAD_BAR_W) / 2;
const LOAD_BAR_Y = 300;
const LOAD_BAR_BG = '#1a1a3e';
const LOAD_BAR_BORDER = '#3a3a6a';
const LOAD_BAR_FILL = '#FFD700';
const LOAD_BAR_FILL_GLOW = '#FFF0A0';

export function renderLoadingScreen(ctx, progress) {
    ctx.fillStyle = LOAD_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Logo (large, centered)
    drawLogo(ctx, CANVAS_WIDTH / 2, 50, 460);

    // Progress bar background
    ctx.fillStyle = LOAD_BAR_BG;
    ctx.fillRect(LOAD_BAR_X, LOAD_BAR_Y, LOAD_BAR_W, LOAD_BAR_H);

    // Progress bar fill
    const fillW = Math.max(0, Math.min(1, progress)) * LOAD_BAR_W;
    if (fillW > 0) {
        ctx.fillStyle = LOAD_BAR_FILL;
        ctx.fillRect(LOAD_BAR_X, LOAD_BAR_Y, fillW, LOAD_BAR_H);

        // Subtle glow highlight on top half of bar
        ctx.fillStyle = LOAD_BAR_FILL_GLOW;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(LOAD_BAR_X, LOAD_BAR_Y, fillW, LOAD_BAR_H / 2);
        ctx.globalAlpha = 1;
    }

    // Progress bar border
    ctx.strokeStyle = LOAD_BAR_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(LOAD_BAR_X, LOAD_BAR_Y, LOAD_BAR_W, LOAD_BAR_H);

    // Percentage text
    const pct = Math.floor(progress * 100);
    ctx.font = '16px monospace';
    ctx.fillStyle = SUBTITLE_COLOR;
    ctx.fillText(`Loading... ${pct}%`, CANVAS_WIDTH / 2, LOAD_BAR_Y + LOAD_BAR_H + 26);
}

// ---------------------------------------------------------------------------
// Main menu screen
// ---------------------------------------------------------------------------
const MENU_BG = '#1a1a2e';
const MENU_BTN_W = 240;
const MENU_BTN_H = 48;
const MENU_BTN_X = (CANVAS_WIDTH - MENU_BTN_W) / 2;

const PLAY_BTN_Y = 220;
const SHOP_BTN_Y = 285;
const CHANGE_SLOT_BTN_Y = 350;

const BTN_BG = '#2a5a2a';
const BTN_BORDER = '#3a8a3a';
const BTN_TEXT_COLOR = '#FFFFFF';
const BTN_DISABLED_BG = '#2a2a3e';
const BTN_DISABLED_BORDER = '#3a3a5a';
const BTN_DISABLED_TEXT = '#666688';
const CHANGE_SLOT_BG = '#2a2a5a';
const CHANGE_SLOT_BORDER = '#4a4a8a';

const MENU_PLAY_BTN = { x: MENU_BTN_X, y: PLAY_BTN_Y, w: MENU_BTN_W, h: MENU_BTN_H };
const MENU_SHOP_BTN = { x: MENU_BTN_X, y: SHOP_BTN_Y, w: MENU_BTN_W, h: MENU_BTN_H };
const MENU_CHANGE_SLOT_BTN = { x: MENU_BTN_X, y: CHANGE_SLOT_BTN_Y, w: MENU_BTN_W, h: MENU_BTN_H };

export function renderMenuScreen(ctx, playerName) {
    ctx.fillStyle = MENU_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Logo
    drawLogo(ctx, CANVAS_WIDTH / 2, 15, 280);

    // Player name
    ctx.font = '18px monospace';
    ctx.fillStyle = SUBTITLE_COLOR;
    ctx.fillText(`Playing as: ${playerName}`, CANVAS_WIDTH / 2, 170);

    // Decorative divider
    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2 - 120, 195);
    ctx.lineTo(CANVAS_WIDTH / 2 + 120, 195);
    ctx.stroke();

    // "Play" button
    drawButton(ctx, MENU_PLAY_BTN, 'PLAY', BTN_BG, BTN_BORDER, BTN_TEXT_COLOR, 'bold 24px monospace');

    // "Shop" button
    drawButton(ctx, MENU_SHOP_BTN, 'SHOP', CHANGE_SLOT_BG, CHANGE_SLOT_BORDER, SUBTITLE_COLOR, 'bold 22px monospace');

    // "Change Slot" button
    drawButton(ctx, MENU_CHANGE_SLOT_BTN, 'CHANGE SLOT', CHANGE_SLOT_BG, CHANGE_SLOT_BORDER, SUBTITLE_COLOR, 'bold 18px monospace');
}

/** Returns 'play' | 'shop' | 'changeSlot' | null based on click position. */
export function getMenuAction(cx, cy) {
    if (pointInRect(cx, cy, MENU_PLAY_BTN)) return 'play';
    if (pointInRect(cx, cy, MENU_SHOP_BTN)) return 'shop';
    if (pointInRect(cx, cy, MENU_CHANGE_SLOT_BTN)) return 'changeSlot';
    return null;
}

// ---------------------------------------------------------------------------
// Pause overlay
// ---------------------------------------------------------------------------
const PAUSE_OVERLAY_BG = 'rgba(0, 0, 0, 0.65)';
const PAUSE_BTN_W = 220;
const PAUSE_BTN_H = 48;
const PAUSE_BTN_X = (CANVAS_WIDTH - PAUSE_BTN_W) / 2;
const RESUME_BTN_Y = 215;
const QUIT_BTN_Y = 280;

const RESUME_BTN = { x: PAUSE_BTN_X, y: RESUME_BTN_Y, w: PAUSE_BTN_W, h: PAUSE_BTN_H };
const QUIT_BTN = { x: PAUSE_BTN_X, y: QUIT_BTN_Y, w: PAUSE_BTN_W, h: PAUSE_BTN_H };

export function renderPauseOverlay(ctx) {
    ctx.fillStyle = PAUSE_OVERLAY_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // "PAUSED" with drop shadow
    ctx.font = 'bold 44px monospace';
    ctx.fillStyle = '#000000';
    ctx.fillText('PAUSED', CANVAS_WIDTH / 2 + 2, 132);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('PAUSED', CANVAS_WIDTH / 2, 130);

    // Decorative divider
    ctx.strokeStyle = '#5a5a8a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2 - 100, 170);
    ctx.lineTo(CANVAS_WIDTH / 2 + 100, 170);
    ctx.stroke();

    // "Resume" button
    drawButton(ctx, RESUME_BTN, 'RESUME', BTN_BG, BTN_BORDER, BTN_TEXT_COLOR, 'bold 22px monospace');

    // "Quit" button
    drawButton(ctx, QUIT_BTN, 'QUIT TO MENU', '#5a2a2a', '#8a3a3a', '#FFFFFF', 'bold 18px monospace');
}

/** Returns 'resume' | 'quit' | null based on click position. */
export function getPauseAction(cx, cy) {
    if (pointInRect(cx, cy, RESUME_BTN)) return 'resume';
    if (pointInRect(cx, cy, QUIT_BTN)) return 'quit';
    return null;
}

// ---------------------------------------------------------------------------
// Run summary (dead) screen
// ---------------------------------------------------------------------------
const OVERLAY_BG = 'rgba(0, 0, 0, 0.7)';
const GAME_OVER_COLOR = '#FF4444';
const NEW_BEST_COLOR = '#FFD700';

const DEAD_BTN_W = 180;
const DEAD_BTN_H = 48;
const DEAD_BTN_GAP = 20;
const DEAD_BTN_TOTAL_W = DEAD_BTN_W * 2 + DEAD_BTN_GAP;
const DEAD_BTN_START_X = (CANVAS_WIDTH - DEAD_BTN_TOTAL_W) / 2;
const DEAD_BTN_Y = 345;

const PLAY_AGAIN_BTN = {
    x: DEAD_BTN_START_X,
    y: DEAD_BTN_Y,
    w: DEAD_BTN_W,
    h: DEAD_BTN_H
};

const DEAD_MENU_BTN = {
    x: DEAD_BTN_START_X + DEAD_BTN_W + DEAD_BTN_GAP,
    y: DEAD_BTN_Y,
    w: DEAD_BTN_W,
    h: DEAD_BTN_H
};

export function renderRunSummary(ctx, distance, coinsEarned, totalCoins, bestDistance, isNewBest) {
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
    drawButton(ctx, PLAY_AGAIN_BTN, 'Play Again', '#2a7a2a', '#3a9a3a', '#FFFFFF', 'bold 20px monospace');

    // "Menu" button
    drawButton(ctx, DEAD_MENU_BTN, 'Menu', CHANGE_SLOT_BG, CHANGE_SLOT_BORDER, SUBTITLE_COLOR, 'bold 20px monospace');
}

/** Returns 'playAgain' | 'menu' | null based on click position on the dead screen. */
export function getDeadScreenAction(cx, cy) {
    if (pointInRect(cx, cy, PLAY_AGAIN_BTN)) return 'playAgain';
    if (pointInRect(cx, cy, DEAD_MENU_BTN)) return 'menu';
    return null;
}

// ---------------------------------------------------------------------------
// Shared button drawing helper
// ---------------------------------------------------------------------------
function drawButton(ctx, rect, label, bgColor, borderColor, textColor, font) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font;
    ctx.fillStyle = textColor;
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
}
