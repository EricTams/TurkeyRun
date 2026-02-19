// AIDEV-NOTE: Food collectible system (chunk 7, updated for biome food art).
// Manages food items, coin counting, and formation spawning. Food items scroll
// left with the world and are collected on overlap with a generous hitbox.
// Each food item renders as an animated sprite matching the current biome's
// food types (2 per biome).

import { AUTO_RUN_SPEED, FOOD_SIZE, FOOD_HITBOX_PADDING, FOOD_COLOR } from './config.js';
import { createAnimator, setAnimation, updateAnimator, drawAnimator, hasAnimation } from './animation.js';
import { rectsOverlap } from './collision.js';
import { getDistanceMeters } from './world.js';
import { getBiomeFoodTypes } from './biome.js';
import { playSfx } from './audio.js';
import { rollGemologist, rollJackpot, onFoodCollected, onFoodMissed } from './meta/gadgets.js';
import { getMagnetMultiplier, doesFoodDrift } from './meta/passives.js';

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
// Food type selection based on current biome
// ---------------------------------------------------------------------------

function pickFoodType() {
    const types = getBiomeFoodTypes(getDistanceMeters());
    return types[Math.floor(Math.random() * types.length)];
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
    const magnetMult = getMagnetMultiplier();
    const effectivePad = FOOD_HITBOX_PADDING * magnetMult;
    const collectRect = padRect(turkeyRect, effectivePad);
    const drift = doesFoodDrift();
    const turkeyCX = turkeyRect.x + turkeyRect.w / 2;
    const turkeyCY = turkeyRect.y + turkeyRect.h / 2;

    for (const food of foods) {
        food.x -= AUTO_RUN_SPEED * dt;

        // Coin Magnet Lv3: food drifts toward player
        if (drift && !food.collected) {
            const dx = turkeyCX - (food.x + food.w / 2);
            const dy = turkeyCY - (food.y + food.h / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < effectivePad + FOOD_SIZE && dist > 1) {
                const driftSpeed = 120;
                food.x += (dx / dist) * driftSpeed * dt;
                food.y += (dy / dist) * driftSpeed * dt;
            }
        }

        if (food.animator) {
            updateAnimator(food.animator, dt);
        }

        if (!food.collected && rectsOverlap(collectRect, food)) {
            food.collected = true;
            let value = 1;
            value *= rollGemologist();
            value *= rollJackpot();
            coins += value;
            onFoodCollected(value);
            playSfx('crunch');
        }
    }

    for (const food of foods) {
        if (!food.collected && food.x <= -FOOD_SIZE) {
            onFoodMissed();
        }
    }
    foods = foods.filter(f => !f.collected && f.x > -FOOD_SIZE);
}

export function renderAllFood(ctx) {
    for (const food of foods) {
        if (food.collected) continue;

        if (food.animator && hasAnimation(food.foodType)) {
            drawAnimator(ctx, food.animator, food.x, food.y, food.w, food.h);
        } else {
            // Fallback: gold rectangle if animation not loaded
            ctx.fillStyle = FOOD_COLOR;
            ctx.fillRect(food.x, food.y, food.w, food.h);
        }
    }
}

// ---------------------------------------------------------------------------
// Formation spawners
// ---------------------------------------------------------------------------
// Each creates food items at calculated positions and adds them to the array.

function addFood(x, y) {
    const foodType = pickFoodType();
    const animator = createAnimator();
    setAnimation(animator, foodType);
    // Stagger the animation start so items don't all pulse in sync
    animator.elapsed = Math.random() * 0.2;

    foods.push({
        x, y,
        w: FOOD_SIZE, h: FOOD_SIZE,
        collected: false,
        foodType,
        animator
    });
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

// ---------------------------------------------------------------------------
// Path-based coin placement (Chunk 10A)
// ---------------------------------------------------------------------------
// Spawns food items at specific positions (used by spawner with path-generated
// coordinates). Each position is {x, y} in world-pixel space.

export function spawnCoinsAtPositions(positions) {
    for (const pos of positions) {
        addFood(pos.x, pos.y);
    }
}
