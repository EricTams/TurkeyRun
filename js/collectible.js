// AIDEV-NOTE: Food collectible system (chunk 7). Manages food items, coin
// counting, and formation spawning. Food items scroll left with the world
// and are collected on overlap with a generous hitbox.

import { AUTO_RUN_SPEED, FOOD_SIZE, FOOD_HITBOX_PADDING, FOOD_COLOR } from './config.js';
import { drawSprite } from './sprites.js';
import { rectsOverlap } from './collision.js';

let foods = [];
let coins = 0;

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

export function resetCollectibles() {
    foods = [];
    coins = 0;
}

export function getCoins() {
    return coins;
}

// ---------------------------------------------------------------------------
// Update & render
// ---------------------------------------------------------------------------

function padRect(rect, pad) {
    return {
        x: rect.x - pad, y: rect.y - pad,
        w: rect.w + pad * 2, h: rect.h + pad * 2
    };
}

export function updateCollectibles(dt, turkeyRect) {
    const collectRect = padRect(turkeyRect, FOOD_HITBOX_PADDING);

    for (const food of foods) {
        food.x -= AUTO_RUN_SPEED * dt;
        if (!food.collected && rectsOverlap(collectRect, food)) {
            food.collected = true;
            coins++;
        }
    }

    foods = foods.filter(f => !f.collected && f.x > -FOOD_SIZE);
}

export function renderAllFood(ctx) {
    for (const food of foods) {
        if (!food.collected) {
            drawSprite(ctx, 'food', food.x, food.y, food.w, food.h, FOOD_COLOR);
        }
    }
}

// ---------------------------------------------------------------------------
// Formation spawners
// ---------------------------------------------------------------------------
// Each creates food items at calculated positions and adds them to the array.

function addFood(x, y) {
    foods.push({ x, y, w: FOOD_SIZE, h: FOOD_SIZE, collected: false });
}

export function spawnLine(originX, y, count, spacing) {
    for (let i = 0; i < count; i++) {
        addFood(originX + i * spacing, y);
    }
}

export function spawnRise(originX, startY, count, spacing, risePerItem) {
    for (let i = 0; i < count; i++) {
        addFood(originX + i * spacing, startY - i * risePerItem);
    }
}

export function spawnFall(originX, startY, count, spacing, fallPerItem) {
    for (let i = 0; i < count; i++) {
        addFood(originX + i * spacing, startY + i * fallPerItem);
    }
}

export function spawnArc(originX, baseY, count, totalWidth, arcHeight) {
    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5;
        addFood(originX + t * totalWidth, baseY - 4 * arcHeight * t * (1 - t));
    }
}
