// AIDEV-NOTE: HUD rendering (updated chunk 12). Shows distance top-left,
// coin count with icon top-right, pause button top-center, and mute button
// to the right of pause.

import { CANVAS_WIDTH } from './config.js';
import { getDebugBiomeOverride, getCurrentBiomeName } from './biome.js';
import { isMuted } from './audio.js';

const HUD_FONT = 'bold 20px monospace';
const HUD_COLOR = '#FFFFFF';
const HUD_SHADOW_COLOR = '#000000';
const HUD_PADDING = 12;
const COIN_ICON_RADIUS = 8;
const COIN_ICON_COLOR = '#FFD700';
const COIN_SYMBOL_COLOR = '#B8860B';
const COIN_SYMBOL_FONT = 'bold 11px monospace';

// Pause button (top-center)
const PAUSE_BTN_SIZE = 32;
const PAUSE_BTN_X = (CANVAS_WIDTH - PAUSE_BTN_SIZE) / 2;
const PAUSE_BTN_Y = 8;
const PAUSE_BTN_BG = 'rgba(0, 0, 0, 0.35)';
const PAUSE_BTN_BORDER = 'rgba(255, 255, 255, 0.4)';
const PAUSE_BAR_W = 5;
const PAUSE_BAR_H = 14;
const PAUSE_BAR_GAP = 4;

// Mute button (to the right of pause)
const MUTE_BTN_SIZE = 32;
const MUTE_BTN_X = PAUSE_BTN_X + PAUSE_BTN_SIZE + 8;
const MUTE_BTN_Y = PAUSE_BTN_Y;

function drawTextWithShadow(ctx, text, x, y) {
    ctx.fillStyle = HUD_SHADOW_COLOR;
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = HUD_COLOR;
    ctx.fillText(text, x, y);
}

export function renderHud(ctx, distanceMeters, coins, showPause) {
    ctx.font = HUD_FONT;
    ctx.textBaseline = 'top';

    // Distance (top-left)
    ctx.textAlign = 'left';
    drawTextWithShadow(ctx, `${distanceMeters}m`, HUD_PADDING, HUD_PADDING);

    // Coins (top-right): icon + number
    ctx.textAlign = 'right';
    const coinText = `${coins}`;
    const textX = CANVAS_WIDTH - HUD_PADDING;
    drawTextWithShadow(ctx, coinText, textX, HUD_PADDING);

    // Gold coin icon left of the text
    ctx.font = HUD_FONT;
    const textWidth = ctx.measureText(coinText).width;
    const iconX = textX - textWidth - COIN_ICON_RADIUS - 6;
    const iconY = HUD_PADDING + COIN_ICON_RADIUS;

    ctx.beginPath();
    ctx.arc(iconX, iconY, COIN_ICON_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = COIN_ICON_COLOR;
    ctx.fill();

    ctx.fillStyle = COIN_SYMBOL_COLOR;
    ctx.font = COIN_SYMBOL_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', iconX, iconY);

    // Pause button (top-center) and mute button (right of pause)
    if (showPause) {
        renderPauseButton(ctx);
    }
    renderMuteButton(ctx);

    // Debug biome override indicator
    const dbgBiome = getDebugBiomeOverride();
    if (dbgBiome > 0) {
        const name = getCurrentBiomeName(0); // distance ignored when override active
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#000000';
        ctx.fillText(`[DEBUG] Biome ${dbgBiome}: ${name}`, CANVAS_WIDTH / 2 + 1, HUD_PADDING + 1);
        ctx.fillStyle = '#FF4444';
        ctx.fillText(`[DEBUG] Biome ${dbgBiome}: ${name}`, CANVAS_WIDTH / 2, HUD_PADDING);
    }
}

function renderPauseButton(ctx) {
    // Rounded background
    const r = 6;
    ctx.fillStyle = PAUSE_BTN_BG;
    ctx.beginPath();
    ctx.moveTo(PAUSE_BTN_X + r, PAUSE_BTN_Y);
    ctx.lineTo(PAUSE_BTN_X + PAUSE_BTN_SIZE - r, PAUSE_BTN_Y);
    ctx.arcTo(PAUSE_BTN_X + PAUSE_BTN_SIZE, PAUSE_BTN_Y, PAUSE_BTN_X + PAUSE_BTN_SIZE, PAUSE_BTN_Y + r, r);
    ctx.lineTo(PAUSE_BTN_X + PAUSE_BTN_SIZE, PAUSE_BTN_Y + PAUSE_BTN_SIZE - r);
    ctx.arcTo(PAUSE_BTN_X + PAUSE_BTN_SIZE, PAUSE_BTN_Y + PAUSE_BTN_SIZE, PAUSE_BTN_X + PAUSE_BTN_SIZE - r, PAUSE_BTN_Y + PAUSE_BTN_SIZE, r);
    ctx.lineTo(PAUSE_BTN_X + r, PAUSE_BTN_Y + PAUSE_BTN_SIZE);
    ctx.arcTo(PAUSE_BTN_X, PAUSE_BTN_Y + PAUSE_BTN_SIZE, PAUSE_BTN_X, PAUSE_BTN_Y + PAUSE_BTN_SIZE - r, r);
    ctx.lineTo(PAUSE_BTN_X, PAUSE_BTN_Y + r);
    ctx.arcTo(PAUSE_BTN_X, PAUSE_BTN_Y, PAUSE_BTN_X + r, PAUSE_BTN_Y, r);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = PAUSE_BTN_BORDER;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Two vertical pause bars
    const cx = PAUSE_BTN_X + PAUSE_BTN_SIZE / 2;
    const cy = PAUSE_BTN_Y + PAUSE_BTN_SIZE / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - PAUSE_BAR_GAP / 2 - PAUSE_BAR_W, cy - PAUSE_BAR_H / 2, PAUSE_BAR_W, PAUSE_BAR_H);
    ctx.fillRect(cx + PAUSE_BAR_GAP / 2, cy - PAUSE_BAR_H / 2, PAUSE_BAR_W, PAUSE_BAR_H);
}

/** Check if a click (canvas coords) hit the pause button. */
export function isPauseButtonClick(cx, cy) {
    return cx >= PAUSE_BTN_X && cx <= PAUSE_BTN_X + PAUSE_BTN_SIZE &&
           cy >= PAUSE_BTN_Y && cy <= PAUSE_BTN_Y + PAUSE_BTN_SIZE;
}

/** Check if a click (canvas coords) hit the mute button. */
export function isMuteButtonClick(cx, cy) {
    return cx >= MUTE_BTN_X && cx <= MUTE_BTN_X + MUTE_BTN_SIZE &&
           cy >= MUTE_BTN_Y && cy <= MUTE_BTN_Y + MUTE_BTN_SIZE;
}

function renderMuteButton(ctx) {
    const r = 6;
    const x = MUTE_BTN_X;
    const y = MUTE_BTN_Y;
    const s = MUTE_BTN_SIZE;

    // Rounded background (same style as pause button)
    ctx.fillStyle = PAUSE_BTN_BG;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + s - r, y);
    ctx.arcTo(x + s, y, x + s, y + r, r);
    ctx.lineTo(x + s, y + s - r);
    ctx.arcTo(x + s, y + s, x + s - r, y + s, r);
    ctx.lineTo(x + r, y + s);
    ctx.arcTo(x, y + s, x, y + s - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = PAUSE_BTN_BORDER;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw speaker icon
    const cx = x + s / 2;
    const cy = y + s / 2;
    const muted = isMuted();

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    // Speaker body (small rectangle + triangle cone)
    const bodyW = 4;
    const bodyH = 8;
    const coneW = 6;
    const bodyX = cx - 6;
    const bodyY = cy - bodyH / 2;

    // Rectangle part of speaker
    ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

    // Cone part (triangle extending right from the rectangle)
    ctx.beginPath();
    ctx.moveTo(bodyX + bodyW, bodyY);
    ctx.lineTo(bodyX + bodyW + coneW, bodyY - 4);
    ctx.lineTo(bodyX + bodyW + coneW, bodyY + bodyH + 4);
    ctx.lineTo(bodyX + bodyW, bodyY + bodyH);
    ctx.closePath();
    ctx.fill();

    if (muted) {
        // X mark to the right of the speaker
        const xOff = cx + 5;
        ctx.beginPath();
        ctx.moveTo(xOff, cy - 4);
        ctx.lineTo(xOff + 8, cy + 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(xOff + 8, cy - 4);
        ctx.lineTo(xOff, cy + 4);
        ctx.stroke();
    } else {
        // Sound waves (two arcs)
        const waveX = cx + 5;
        ctx.beginPath();
        ctx.arc(waveX, cy, 5, -Math.PI / 4, Math.PI / 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(waveX, cy, 9, -Math.PI / 4, Math.PI / 4);
        ctx.stroke();
    }

    ctx.lineCap = 'butt';
}
