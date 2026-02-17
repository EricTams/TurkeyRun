// AIDEV-NOTE: Main entry point and game loop (updated chunk 10).
// Flow: SLOT_SELECT -> PLAYING -> DEAD (run summary) -> PLAYING ...

import { TIMESTEP, MAX_ACCUMULATED_TIME, PLAYER_WIDTH, PLAYER_HEIGHT } from './config.js';
import { initRenderer, clear, getCtx, getCanvas } from './renderer.js';
import { initInput, isPressed, consumeJustPressed, consumeClick } from './input.js';
import { createTurkey, resetTurkey, renderTurkey } from './turkey.js';
import { applyPhysics } from './physics.js';
import { loadAll } from './sprites.js';
import { createWorld, updateWorld, renderWorld, getDistanceMeters, getDistancePixels } from './world.js';
import { renderHud } from './hud.js';
import { rectsOverlap } from './collision.js';
import { renderGroundHazard } from './hazards/groundHazard.js';
import { renderZapper, checkZapperCollision } from './hazards/zapper.js';
import { renderBird, checkBirdCollision } from './hazards/bird.js';
import { renderLaser, checkLaserCollision } from './hazards/laser.js';
import { resetSpawner, updateSpawner, getHazards, getZappers, getBirds, getLasers } from './spawner.js';
import { resetCollectibles, updateCollectibles, renderAllFood, getCoins } from './collectible.js';
import {
    SLOT_SELECT, PLAYING, DEAD,
    renderSlotSelectScreen, getSlotSelectAction, renderRunSummary
} from './state.js';
import {
    loadSlots, getSlots, getActiveSlot,
    setActiveSlotIndex, createSlot, deleteSlot, updateActiveSlot
} from './save.js';

let lastTime = 0;
let accumulator = 0;
let turkey = null;
let gameState = SLOT_SELECT;

// Run summary data (captured at moment of death)
let runDistance = 0;
let runCoins = 0;
let isNewBest = false;

// ---------------------------------------------------------------------------
// Collision detection
// ---------------------------------------------------------------------------

function checkCollisions() {
    const turkeyRect = {
        x: turkey.x, y: turkey.y,
        w: PLAYER_WIDTH, h: PLAYER_HEIGHT
    };
    for (const hazard of getHazards()) {
        if (rectsOverlap(turkeyRect, hazard)) {
            return true;
        }
    }
    for (const zapper of getZappers()) {
        if (checkZapperCollision(turkeyRect, zapper)) {
            return true;
        }
    }
    for (const bird of getBirds()) {
        if (checkBirdCollision(turkeyRect, bird)) {
            return true;
        }
    }
    for (const laser of getLasers()) {
        if (checkLaserCollision(turkeyRect, laser)) {
            return true;
        }
    }
    return false;
}

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

function startRun() {
    resetTurkey(turkey);
    createWorld();
    resetSpawner();
    resetCollectibles();
    gameState = PLAYING;
}

function handleDeath() {
    runDistance = getDistanceMeters();
    runCoins = getCoins();
    isNewBest = updateActiveSlot(runCoins, runDistance);
    gameState = DEAD;

    // Drain pending input so held presses don't instantly restart
    consumeJustPressed();
    consumeClick();
}

function handleSlotSelectClick(click) {
    const slots = getSlots();
    const action = getSlotSelectAction(click.x, click.y, slots);
    if (!action) return;

    if (action.action === 'delete') {
        const slot = slots[action.slotIndex];
        if (slot && window.confirm(`Delete save "${slot.name}"?`)) {
            deleteSlot(action.slotIndex);
        }
    } else if (action.action === 'select') {
        const slot = slots[action.slotIndex];
        if (slot) {
            setActiveSlotIndex(action.slotIndex);
            startRun();
        } else {
            const name = window.prompt('Enter your name:');
            if (name && name.trim()) {
                createSlot(action.slotIndex, name.trim());
                setActiveSlotIndex(action.slotIndex);
                startRun();
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Update / render
// ---------------------------------------------------------------------------

function update(dt) {
    if (gameState === SLOT_SELECT) {
        const click = consumeClick();
        consumeJustPressed();
        if (click) {
            handleSlotSelectClick(click);
        }
    } else if (gameState === PLAYING) {
        applyPhysics(turkey, dt, isPressed());
        updateWorld(dt);
        const turkeyCX = turkey.x + PLAYER_WIDTH / 2;
        const turkeyCY = turkey.y + PLAYER_HEIGHT / 2;
        updateSpawner(dt, getDistancePixels(), turkeyCX, turkeyCY);

        const turkeyRect = {
            x: turkey.x, y: turkey.y,
            w: PLAYER_WIDTH, h: PLAYER_HEIGHT
        };
        updateCollectibles(dt, turkeyRect);

        if (checkCollisions()) {
            handleDeath();
        }
    } else if (gameState === DEAD) {
        consumeClick();
        if (consumeJustPressed()) {
            startRun();
        }
    }
}

function render() {
    const ctx = getCtx();
    clear();

    if (gameState === SLOT_SELECT) {
        renderSlotSelectScreen(ctx, getSlots());
        return;
    }

    // Gameplay scene (visible during PLAYING and DEAD)
    renderWorld(ctx);
    for (const hazard of getHazards()) {
        renderGroundHazard(ctx, hazard);
    }
    for (const zapper of getZappers()) {
        renderZapper(ctx, zapper);
    }
    for (const bird of getBirds()) {
        renderBird(ctx, bird);
    }
    for (const laser of getLasers()) {
        renderLaser(ctx, laser);
    }
    renderAllFood(ctx);
    renderTurkey(ctx, turkey);
    renderHud(ctx, getDistanceMeters(), getCoins());

    if (gameState === DEAD) {
        const slot = getActiveSlot();
        const totalCoins = slot ? slot.totalCoins : 0;
        const bestDist = slot ? slot.bestDistance : 0;
        renderRunSummary(ctx, runDistance, runCoins, totalCoins, bestDist, isNewBest);
    }
}

// ---------------------------------------------------------------------------
// Game loop + bootstrap
// ---------------------------------------------------------------------------

function gameLoop(currentTime) {
    const frameTime = Math.min(currentTime - lastTime, MAX_ACCUMULATED_TIME);
    lastTime = currentTime;

    accumulator += frameTime;

    while (accumulator >= TIMESTEP) {
        update(TIMESTEP / 1000);
        accumulator -= TIMESTEP;
    }

    render();
    requestAnimationFrame(gameLoop);
}

function start() {
    loadSlots();
    initRenderer();
    initInput(getCanvas());
    turkey = createTurkey();
    gameState = SLOT_SELECT;

    loadAll().then(() => {
        requestAnimationFrame((time) => {
            lastTime = time;
            gameLoop(time);
        });
    });
}

start();
