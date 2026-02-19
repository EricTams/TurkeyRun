// Bold on-screen text notifications anchored near the player.
// Two types:
//   Announcements: text that floats upward from the player and fades out
//   Countdowns: persistent text sitting just above the player

import { PLAYER_WIDTH, PLAYER_HEIGHT } from '../config.js';

const announcements = [];   // { text, color, timer, duration, yOff }
const countdowns = [];       // { id, label, color, timer, duration }

const ANNOUNCE_DURATION = 1.5;
const FONT_SIZE = 13;
const COUNTDOWN_FONT_SIZE = 14;
const FLOAT_DISTANCE = 50;

let playerX = 0;
let playerY = 0;

let nextSlot = 0;
const SLOT_STEP = 16;

export function setPlayerPos(x, y) {
    playerX = x;
    playerY = y;
}

export function announce(text, color = '#FFFFFF') {
    const xOff = (nextSlot % 2 === 0) ? 0 : ((nextSlot % 4 < 2) ? -12 : 12);
    announcements.push({
        text, color,
        timer: ANNOUNCE_DURATION,
        duration: ANNOUNCE_DURATION,
        yOff: -PLAYER_HEIGHT - 8 - (nextSlot * SLOT_STEP % (SLOT_STEP * 3)),
        xOff
    });
    nextSlot++;
    if (nextSlot > 5) nextSlot = 0;
}

export function startCountdown(id, label, duration, color = '#FF4444') {
    const idx = countdowns.findIndex(c => c.id === id);
    if (idx >= 0) countdowns.splice(idx, 1);
    countdowns.push({ id, label, color, timer: duration, duration });
}

export function stopCountdown(id) {
    const idx = countdowns.findIndex(c => c.id === id);
    if (idx >= 0) countdowns.splice(idx, 1);
}

export function updateEffects(dt) {
    for (let i = announcements.length - 1; i >= 0; i--) {
        announcements[i].timer -= dt;
        if (announcements[i].timer <= 0) {
            announcements.splice(i, 1);
        }
    }

    for (let i = countdowns.length - 1; i >= 0; i--) {
        countdowns[i].timer -= dt;
        if (countdowns[i].timer <= 0) {
            countdowns.splice(i, 1);
        }
    }

    if (announcements.length === 0) nextSlot = 0;
}

export function renderEffects(ctx) {
    const cx = playerX + PLAYER_WIDTH / 2;
    const baseY = playerY;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const MIN_Y = FONT_SIZE;

    // Announcements: float upward from player, fade out
    for (const a of announcements) {
        const progress = 1 - a.timer / a.duration;
        const alpha = Math.min(1, a.timer / (a.duration * 0.35));
        const floatY = Math.max(MIN_Y, baseY + a.yOff - progress * FLOAT_DISTANCE);
        const x = cx + (a.xOff || 0);

        ctx.save();
        ctx.globalAlpha = alpha;

        ctx.font = `bold ${FONT_SIZE}px monospace`;
        // Outline for readability
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(a.text, x, floatY);

        ctx.fillStyle = a.color;
        ctx.fillText(a.text, x, floatY);

        ctx.restore();
    }

    // Countdowns: stacked just above the player
    let cdy = Math.max(COUNTDOWN_FONT_SIZE, baseY - PLAYER_HEIGHT - 10);
    for (const c of countdowns) {
        const timeStr = c.timer.toFixed(1);
        const text = `${c.label} ${timeStr}`;

        const pulse = c.timer < 0.5 ? (Math.sin(c.timer * 20) * 0.3 + 0.7) : 1.0;

        ctx.save();
        ctx.globalAlpha = pulse;

        ctx.font = `bold ${COUNTDOWN_FONT_SIZE}px monospace`;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(text, cx, cdy);

        ctx.fillStyle = c.color;
        ctx.fillText(text, cx, cdy);

        ctx.restore();
        cdy = Math.max(COUNTDOWN_FONT_SIZE, cdy - 18);
    }
}

export function resetEffects() {
    announcements.length = 0;
    countdowns.length = 0;
    nextSlot = 0;
}
