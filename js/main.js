// AIDEV-NOTE: Main entry point and game loop (updated chunk 12).
// Flow: LOADING -> SLOT_SELECT -> MENU -> HATCHING -> PLAYING <-> PAUSED
//       PLAYING -> DYING -> DEAD -> HATCHING (play again) or MENU (quit)

import {
    TIMESTEP, MAX_ACCUMULATED_TIME,
    PLAYER_WIDTH, PLAYER_HEIGHT,
    PLAYER_RENDER_HEIGHT, PLAYER_SPRITE_BOTTOM_PAD,
    GROUND_Y
} from './config.js';
import { initRenderer, clear, getCtx, getCanvas } from './renderer.js';
import {
    initInput, isPressed, consumeJustPressed, consumeClick,
    consumeDebugBiome, consumeEscapePressed
} from './input.js';
import {
    createTurkey, resetTurkey, renderTurkey,
    getTurkeyHitbox, updateTurkeyAnimation,
    playDeathAnimation, setEggState, playHatchAnimation
} from './turkey.js';
import { updateAnimator, loadTurkeyAnimations, TURKEY_ANIM_COUNT, loadBirdAnimations, BIRD_ANIM_COUNT, loadFoodAnimations, FOOD_ANIM_COUNT } from './animation.js';
import { applyPhysics } from './physics.js';
import { loadAll } from './sprites.js';
import { createWorld, updateWorld, renderWorld, getDistanceMeters, getDistancePixels } from './world.js';
import { renderHud, isPauseButtonClick, isMuteButtonClick } from './hud.js';
import { loadMusic, playMusic, pauseMusic, stopMusic, toggleMute, playSfx, playGobble } from './audio.js';
import { rectsOverlap } from './collision.js';
import { renderGroundHazard } from './hazards/groundHazard.js';
import { renderZapper, checkZapperCollision } from './hazards/zapper.js';
import { renderBird, checkBirdCollision } from './hazards/bird.js';
import { renderLaser, checkLaserCollision } from './hazards/laser.js';
import { loadPatterns, resetSpawner, updateSpawner, getHazards, getZappers, getBirds, getLasers } from './spawner.js';
import { resetCollectibles, updateCollectibles, renderAllFood, getCoins } from './collectible.js';
import {
    LOADING, SLOT_SELECT, MENU, HATCHING, PLAYING, PAUSED, DYING, DEAD,
    renderSlotSelectScreen, getSlotSelectAction,
    renderLoadingScreen, renderMenuScreen, getMenuAction,
    renderPauseOverlay, getPauseAction,
    renderRunSummary, getDeadScreenAction,
    loadLogo
} from './state.js';
import {
    loadSlots, getSlots, getActiveSlot,
    setActiveSlotIndex, createSlot, deleteSlot, updateActiveSlot
} from './save.js';
import { setDebugBiomeOverride, getDebugBiomeOverride } from './biome.js';

let lastTime = 0;
let accumulator = 0;
let turkey = null;
let gameState = LOADING;

// Run summary data (captured at moment of death)
let runDistance = 0;
let runCoins = 0;
let isNewBest = false;

// Loading progress tracking
const loadProgress = { loaded: 0, total: 0 };

// Hatching intro state
const EGG_FALL_GRAVITY = 800;
const EGG_WOBBLE_DURATION = 0.6;
const HATCH_PAUSE_AFTER = 0.4;
let hatchPhase = 'falling';
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

    turkey.y = -PLAYER_RENDER_HEIGHT;
    turkey.vy = 0;
    eggVy = 0;
    setEggState(turkey);

    hatchPhase = 'falling';
    hatchTimer = 0;
    gameState = HATCHING;
    playMusic();
}

function startRun() {
    turkey.vy = 0;
    turkey.animState = 'run';
    gameState = PLAYING;
}

function handleDeath() {
    gameState = DYING;
    stopMusic();
    playGobble();

    consumeJustPressed();
    consumeClick();

    playDeathAnimation(turkey, () => {
        runDistance = getDistanceMeters();
        runCoins = getCoins();
        isNewBest = updateActiveSlot(runCoins, runDistance);
        gameState = DEAD;
    });
}

function goToMenu() {
    consumeJustPressed();
    consumeClick();
    gameState = MENU;
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
            goToMenu();
        } else {
            const name = window.prompt('Enter your name:');
            if (name && name.trim()) {
                createSlot(action.slotIndex, name.trim());
                setActiveSlotIndex(action.slotIndex);
                goToMenu();
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Update / render
// ---------------------------------------------------------------------------

function update(dt) {
    if (gameState === LOADING) {
        // Nothing to update -- rendering handles the progress bar.
        // Transition happens when loadProgress.loaded >= loadProgress.total.
        return;
    }

    if (gameState === SLOT_SELECT) {
        const click = consumeClick();
        consumeJustPressed();
        if (click) {
            handleSlotSelectClick(click);
        }
        return;
    }

    if (gameState === MENU) {
        const click = consumeClick();
        consumeJustPressed();
        if (click) {
            const action = getMenuAction(click.x, click.y);
            if (action === 'play') {
                startHatching();
            } else if (action === 'changeSlot') {
                gameState = SLOT_SELECT;
            }
        }
        return;
    }

    if (gameState === HATCHING) {
        updateHatching(dt);
        return;
    }

    if (gameState === PLAYING) {
        // Check for pause (Escape key or pause button click)
        if (consumeEscapePressed()) {
            consumeClick();
            pauseMusic();
            gameState = PAUSED;
            return;
        }
        const click = consumeClick();
        if (click && isMuteButtonClick(click.x, click.y)) {
            toggleMute();
            return;
        }
        if (click && isPauseButtonClick(click.x, click.y)) {
            pauseMusic();
            gameState = PAUSED;
            return;
        }

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
        return;
    }

    if (gameState === PAUSED) {
        // Check for resume via Escape key
        if (consumeEscapePressed()) {
            consumeClick();
            playMusic();
            gameState = PLAYING;
            return;
        }
        const click = consumeClick();
        consumeJustPressed();
        if (click) {
            if (isMuteButtonClick(click.x, click.y)) {
                toggleMute();
                return;
            }
            const action = getPauseAction(click.x, click.y);
            if (action === 'resume') {
                playMusic();
                gameState = PLAYING;
            } else if (action === 'quit') {
                stopMusic();
                goToMenu();
            }
        }
        return;
    }

    if (gameState === DYING) {
        updateAnimator(turkey.animator, dt);
        return;
    }

    if (gameState === DEAD) {
        const click = consumeClick();
        consumeJustPressed();
        if (click) {
            const action = getDeadScreenAction(click.x, click.y);
            if (action === 'playAgain') {
                startHatching();
            } else if (action === 'menu') {
                goToMenu();
            }
        }
        return;
    }
}

function updateHatching(dt) {
    const feetY = PLAYER_RENDER_HEIGHT - PLAYER_SPRITE_BOTTOM_PAD;

    if (hatchPhase === 'falling') {
        eggVy += EGG_FALL_GRAVITY * dt;
        turkey.y += eggVy * dt;

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
            playSfx('eggCrack');
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

    if (gameState === LOADING) {
        const progress = loadProgress.total > 0
            ? loadProgress.loaded / loadProgress.total
            : 0;
        renderLoadingScreen(ctx, progress);
        return;
    }

    if (gameState === SLOT_SELECT) {
        renderSlotSelectScreen(ctx, getSlots());
        return;
    }

    if (gameState === MENU) {
        const slot = getActiveSlot();
        const name = slot ? slot.name : '???';
        renderMenuScreen(ctx, name);
        return;
    }

    // All gameplay states show the world scene
    renderWorld(ctx);

    if (gameState === PLAYING || gameState === PAUSED ||
        gameState === DYING || gameState === DEAD) {
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
        renderHud(ctx, getDistanceMeters(), getCoins(), true);
    }

    if (gameState === PAUSED) {
        renderHud(ctx, getDistanceMeters(), getCoins(), false);
        renderPauseOverlay(ctx);
    }

    if (gameState === DEAD) {
        renderHud(ctx, getDistanceMeters(), getCoins(), false);
        const slot = getActiveSlot();
        const totalCoins = slot ? slot.totalCoins : 0;
        const bestDist = slot ? slot.bestDistance : 0;
        renderRunSummary(ctx, runDistance, runCoins, totalCoins, bestDist, isNewBest);
    }
}

// ---------------------------------------------------------------------------
// Auto-pause on visibility change
// ---------------------------------------------------------------------------

function onVisibilityChange() {
    if (document.hidden && gameState === PLAYING) {
        pauseMusic();
        gameState = PAUSED;
    }
}

// ---------------------------------------------------------------------------
// Asset loading with progress tracking
// ---------------------------------------------------------------------------

function loadWithProgress() {
    loadProgress.total = TURKEY_ANIM_COUNT + BIRD_ANIM_COUNT + FOOD_ANIM_COUNT + 3;
    loadProgress.loaded = 0;

    const spritePromise = loadAll().then(() => { loadProgress.loaded++; });
    const patternPromise = loadPatterns().then(() => { loadProgress.loaded++; });
    const turkeyAnimPromise = loadTurkeyAnimations(() => { loadProgress.loaded++; });
    const birdAnimPromise = loadBirdAnimations(() => { loadProgress.loaded++; });
    const foodAnimPromise = loadFoodAnimations(() => { loadProgress.loaded++; });
    const musicPromise = loadMusic().then(() => { loadProgress.loaded++; });

    return Promise.all([spritePromise, patternPromise, turkeyAnimPromise, birdAnimPromise, foodAnimPromise, musicPromise]);
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
    gameState = LOADING;

    // Start the game loop immediately so the loading screen renders
    requestAnimationFrame((time) => {
        lastTime = time;
        gameLoop(time);
    });

    // Load logo first (tiny image, appears on loading screen almost immediately)
    loadLogo();

    // Load all game assets, tracking progress
    loadWithProgress().then(() => {
        gameState = SLOT_SELECT;
    });

    // Auto-pause when tab/app loses focus
    document.addEventListener('visibilitychange', onVisibilityChange);
}

start();
