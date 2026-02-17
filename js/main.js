// AIDEV-NOTE: Main entry point and game loop.
// Flow: SLOT_SELECT -> HATCHING -> PLAYING -> DYING -> DEAD -> HATCHING ...

import {
    TIMESTEP, MAX_ACCUMULATED_TIME,
    PLAYER_WIDTH, PLAYER_HEIGHT,
    PLAYER_RENDER_HEIGHT, PLAYER_SPRITE_BOTTOM_PAD,
    GROUND_Y
} from './config.js';
import { initRenderer, clear, getCtx, getCanvas } from './renderer.js';
import { initInput, isPressed, consumeJustPressed, consumeClick, consumeDebugBiome } from './input.js';
import {
    createTurkey, resetTurkey, renderTurkey,
    getTurkeyHitbox, updateTurkeyAnimation,
    playDeathAnimation, setEggState, playHatchAnimation
} from './turkey.js';
import { updateAnimator, loadTurkeyAnimations } from './animation.js';
import { applyPhysics } from './physics.js';
import { loadAll } from './sprites.js';
import { createWorld, updateWorld, renderWorld, getDistanceMeters, getDistancePixels } from './world.js';
import { renderHud } from './hud.js';
import { rectsOverlap } from './collision.js';
import { renderGroundHazard } from './hazards/groundHazard.js';
import { renderZapper, checkZapperCollision } from './hazards/zapper.js';
import { renderBird, checkBirdCollision } from './hazards/bird.js';
import { renderLaser, checkLaserCollision } from './hazards/laser.js';
import { loadPatterns, resetSpawner, updateSpawner, getHazards, getZappers, getBirds, getLasers } from './spawner.js';
import { resetCollectibles, updateCollectibles, renderAllFood, getCoins } from './collectible.js';
import {
    SLOT_SELECT, HATCHING, PLAYING, DYING, DEAD,
    renderSlotSelectScreen, getSlotSelectAction, renderRunSummary
} from './state.js';
import {
    loadSlots, getSlots, getActiveSlot,
    setActiveSlotIndex, createSlot, deleteSlot, updateActiveSlot
} from './save.js';
import { setDebugBiomeOverride, getDebugBiomeOverride } from './biome.js';

let lastTime = 0;
let accumulator = 0;
let turkey = null;
let gameState = SLOT_SELECT;

// Run summary data (captured at moment of death)
let runDistance = 0;
let runCoins = 0;
let isNewBest = false;

// Hatching intro state
const EGG_FALL_GRAVITY = 800;       // slightly slower than gameplay gravity for drama
const EGG_WOBBLE_DURATION = 0.6;    // seconds of egg wobble after landing
const HATCH_PAUSE_AFTER = 0.4;      // pause after hatch before gameplay starts
let hatchPhase = 'falling';         // 'falling' | 'wobble' | 'hatching' | 'pause'
let hatchTimer = 0;
let eggVy = 0;

// ---------------------------------------------------------------------------
// Collision detection (uses hitbox, not render rect)
// ---------------------------------------------------------------------------

function checkCollisions() {
    const turkeyRect = getTurkeyHitbox(turkey);
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

function startHatching() {
    createWorld();
    resetSpawner();
    resetCollectibles();

    // Position egg above screen, centered at PLAYER_START_X
    turkey.y = -PLAYER_RENDER_HEIGHT;
    turkey.vy = 0;
    eggVy = 0;
    setEggState(turkey);

    hatchPhase = 'falling';
    hatchTimer = 0;
    gameState = HATCHING;
}

function startRun() {
    // Don't reset position -- turkey is already on the ground after hatching.
    // Just ensure the animation is set to run and clear any residual velocity.
    turkey.vy = 0;
    turkey.animState = 'run';
    gameState = PLAYING;
}

function handleDeath() {
    gameState = DYING;

    // Drain pending input so held presses don't trigger restart
    consumeJustPressed();
    consumeClick();

    playDeathAnimation(turkey, () => {
        // Death animation complete -- capture stats and show summary
        runDistance = getDistanceMeters();
        runCoins = getCoins();
        isNewBest = updateActiveSlot(runCoins, runDistance);
        gameState = DEAD;
    });
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
            startHatching();
        } else {
            const name = window.prompt('Enter your name:');
            if (name && name.trim()) {
                createSlot(action.slotIndex, name.trim());
                setActiveSlotIndex(action.slotIndex);
                startHatching();
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
    } else if (gameState === HATCHING) {
        updateHatching(dt);
    } else if (gameState === PLAYING) {
        // Debug: keys 1-5 force a biome
        const dbg = consumeDebugBiome();
        if (dbg > 0) setDebugBiomeOverride(dbg);

        applyPhysics(turkey, dt, isPressed());
        updateTurkeyAnimation(turkey, dt, isPressed());
        updateWorld(dt);
        const hitbox = getTurkeyHitbox(turkey);
        const turkeyCX = hitbox.x + PLAYER_WIDTH / 2;
        const turkeyCY = hitbox.y + PLAYER_HEIGHT / 2;
        updateSpawner(dt, getDistancePixels(), turkeyCX, turkeyCY);

        updateCollectibles(dt, hitbox);

        if (checkCollisions()) {
            handleDeath();
        }
    } else if (gameState === DYING) {
        // World is frozen, only the death animation plays
        updateAnimator(turkey.animator, dt);
    } else if (gameState === DEAD) {
        consumeClick();
        if (consumeJustPressed()) {
            startHatching();
        }
    }
}

function updateHatching(dt) {
    const feetY = PLAYER_RENDER_HEIGHT - PLAYER_SPRITE_BOTTOM_PAD;

    if (hatchPhase === 'falling') {
        eggVy += EGG_FALL_GRAVITY * dt;
        turkey.y += eggVy * dt;

        // Landed on the ground (feet touch GROUND_Y)
        if (turkey.y + feetY >= GROUND_Y) {
            turkey.y = GROUND_Y - feetY;
            eggVy = 0;
            hatchPhase = 'wobble';
            hatchTimer = 0;
        }
        updateAnimator(turkey.animator, dt);
    } else if (hatchPhase === 'wobble') {
        hatchTimer += dt;
        updateAnimator(turkey.animator, dt);
        if (hatchTimer >= EGG_WOBBLE_DURATION) {
            hatchPhase = 'hatching';
            hatchTimer = 0;
            playHatchAnimation(turkey, () => {
                hatchPhase = 'pause';
                hatchTimer = 0;
            });
        }
    } else if (hatchPhase === 'hatching') {
        updateAnimator(turkey.animator, dt);
    } else if (hatchPhase === 'pause') {
        hatchTimer += dt;
        updateAnimator(turkey.animator, dt);
        if (hatchTimer >= HATCH_PAUSE_AFTER) {
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

    // All other states show the gameplay scene
    renderWorld(ctx);

    if (gameState === PLAYING || gameState === DYING || gameState === DEAD) {
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
    }

    renderTurkey(ctx, turkey);

    if (gameState === PLAYING) {
        renderHud(ctx, getDistanceMeters(), getCoins());
    }

    if (gameState === DEAD) {
        renderHud(ctx, getDistanceMeters(), getCoins());
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

    Promise.all([loadAll(), loadPatterns(), loadTurkeyAnimations()]).then(() => {
        requestAnimationFrame((time) => {
            lastTime = time;
            gameLoop(time);
        });
    });
}

start();
