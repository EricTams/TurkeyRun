// AIDEV-NOTE: HUD rendering (updated in chunk 7). Shows distance top-left
// and coin count with icon top-right.

import { CANVAS_WIDTH } from './config.js';
import { getDebugBiomeOverride, getCurrentBiomeName } from './biome.js';

const HUD_FONT = 'bold 20px monospace';
const HUD_COLOR = '#FFFFFF';
const HUD_SHADOW_COLOR = '#000000';
const HUD_PADDING = 12;
const COIN_ICON_RADIUS = 8;
const COIN_ICON_COLOR = '#FFD700';
const COIN_SYMBOL_COLOR = '#B8860B';
const COIN_SYMBOL_FONT = 'bold 11px monospace';

function drawTextWithShadow(ctx, text, x, y) {
    ctx.fillStyle = HUD_SHADOW_COLOR;
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = HUD_COLOR;
    ctx.fillText(text, x, y);
}

export function renderHud(ctx, distanceMeters, coins) {
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
