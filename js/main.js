// AIDEV-NOTE: Main entry point and game loop (updated chunk 13).
// Flow: LOADING -> SLOT_SELECT -> MENU -> SHOP/LOADOUT -> HATCHING -> PLAYING <-> PAUSED
//       PLAYING -> DYING -> DEAD -> HATCHING (play again) or MENU (quit)

import {
    TIMESTEP, MAX_ACCUMULATED_TIME,
    CANVAS_WIDTH,
    PLAYER_WIDTH, PLAYER_HEIGHT,
    PLAYER_RENDER_HEIGHT, PLAYER_SPRITE_BOTTOM_PAD,
    PLAYER_START_X, GROUND_Y,
    DEATH_BOOST_VELOCITY, DEATH_FALL_GRAVITY_SCALE,
    DEATH_SETTLE_VY_THRESHOLD, DEATH_STEAM_HOLD_SECONDS,
    DEATH_FORWARD_DRIFT_SPEED, DEATH_FORWARD_BOUNCE_DAMPING,
    DEATH_BOUNCE_DAMPING, DEATH_BOUNCE_MIN_IMPACT_VY,
    BIOME_BEACH_START, BIOME_GRASS_START, BIOME_MOUNTAIN_START,
    BIOME_MOON_START, BIOME_SPIRITUAL_START,
    DEBUG_LASER_TEST, LASER_PATTERN_PAUSE,
    ENDGAME_BOSS_TRIGGER_METERS, ENDGAME_BOSS_SIZE,
    ENDGAME_BOSS_START_X, ENDGAME_BOSS_START_Y,
    ENDGAME_BOSS_APPROACH_SPEED, ENDGAME_BOSS_EXIT_SPEED_X, ENDGAME_BOSS_EXIT_SPEED_Y,
    ENDGAME_BOSS_BITE_HOLD_SECONDS, ENDGAME_BOSS_SHAKE_SECONDS,
    ENDGAME_BOSS_SHAKE_PX, ENDGAME_BOSS_HITBOX_INSET_X, ENDGAME_BOSS_HITBOX_INSET_Y,
    ENDGAME_VICTORY_SETTLE_SECONDS
} from './config.js';
import { initRenderer, clear, getCtx, getCanvas } from './renderer.js';
import {
    initInput, isPressed, consumeJustPressed, consumeClick,
    consumeDebugBiome, consumeEscapePressed,
    drainPointerDown, drainPointerMove, drainPointerUp
} from './input.js';
import {
    createTurkey, resetTurkey, renderTurkey,
    getTurkeyHitbox, updateTurkeyAnimation,
    playDeathAnimation, setEggState, playHatchAnimation,
    setTurkeyFallAnimation, isTurkeyOnGround,
    updateInvulnEffect
} from './turkey.js';
import {
    updateAnimator,
    loadTurkeyAnimations, TURKEY_ANIM_COUNT,
    loadBirdAnimations, BIRD_ANIM_COUNT,
    loadFoodAnimations, FOOD_ANIM_COUNT,
    loadLaserAnimations, LASER_ANIM_COUNT,
    loadBlockerAnimations, BLOCKER_ANIM_COUNT,
    loadBackgroundDecorAnimations, BACKGROUND_DECOR_ANIM_COUNT,
    loadBossAnimations, BOSS_ANIM_COUNT,
    setAnimation, drawAnimationFrame
} from './animation.js';
import { applyPhysics, applyGravityPhysics } from './physics.js';
import { loadAll } from './sprites.js';
import { createWorld, updateWorld, renderWorld, renderWorldTerrain, getDistanceMeters, getDistancePixels, setDistanceMeters } from './world.js';
import { renderHud, isPauseButtonClick, isMuteButtonClick } from './hud.js';
import { loadMusic, playMusic, pauseMusic, stopMusic, playVictoryMusic, stopVictoryMusic, toggleMute, playSfx, playGobble } from './audio.js';
import { renderGroundHazard, checkGroundHazardCollision, isIguana, punchHazard } from './hazards/groundHazard.js';
import { renderSkyBlocker, checkSkyBlockerCollision } from './hazards/skyBlocker.js';
import { renderZapper, checkZapperCollision } from './hazards/zapper.js';
import { renderBird, checkBirdCollision } from './hazards/bird.js';
import { renderLaser, checkLaserCollision } from './hazards/laser.js';
import { loadPatterns, resetSpawner, updateSpawner, getHazards, getZappers, getBirds, getLasers, getSkyBlockers, jumpSpawnerToDistance } from './spawner.js';
import { loadTerrainTiles } from './terrainTiles.js';
import { resetCollectibles, updateCollectibles, renderAllFood, getCoins } from './collectible.js';
import {
    LOADING, SLOT_SELECT, MENU, SHOP, LOADOUT, HATCHING, PLAYING, PAUSED, DYING, DEAD,
    renderSlotSelectScreen, getSlotSelectAction,
    renderLoadingScreen, renderMenuScreen, getMenuAction,
    renderPauseOverlay, getPauseAction,
    renderRunSummary, getDeadScreenAction,
    loadLogo
} from './state.js';
import {
    loadSlots, getSlots, getActiveSlot,
    setActiveSlotIndex, createSlot, deleteSlot, updateActiveSlot,
    purchaseNode, getPurchasedNodes, deriveGadgetLevels, derivePassiveTiers,
    deriveMilestones, getGadgetSlotCount, getLoadout, setLoadout
} from './save.js';
import { clearDebugBiomeOverride } from './biome.js';
import {
    initShop, updateShopCoins, updateShopPurchased,
    renderShop, onShopPointerDown, onShopPointerMove, onShopPointerUp,
    onShopRecenter, consumeShopAction
} from './meta/shop.js';
import { initLoadout, getLoadoutResult, onLoadoutClick, renderLoadout } from './meta/loadout.js';
import {
    setEquippedGadgets, setGadgetLevels, resetGadgetRunState,
    hasShieldHit, consumeShieldHit, isShieldInvulnerable, shieldHitsRemaining,
    trySecondWind,
    hasIguanaPunch, consumeIguanaPunch,
    isSecondChanceEquipped, getSecondChanceDuration,
    getTotalCoinMultiplier, getRunStartDistanceMeters,
    updateGadgetTimers, isFlashInvulnerable, getLaserGraceTime
} from './meta/gadgets.js';
import {
    setPassiveTiers, getToughFeathersTier, computePassiveBonusCoins,
    getNestEggBonusPct, getPartingGiftPct,
    getHitboxShrinkFactor, getMagnetMultiplier, doesFoodDrift,
    getCoinDoublerMult, getCompoundMult, updateCompound,
    updateMoneyGrubber, getMoneyGrubberTotal, resetCompound, resetMoneyGrubber,
    getStreakTotalBonus, resetStreak, resetBounty
} from './meta/passives.js';
import { announce, startCountdown, stopCountdown, updateEffects, renderEffects, resetEffects, setPlayerPos } from './meta/gadgetEffects.js';
import {
    startLaserPattern, stopLaserPattern, isLaserPatternActive,
    updateLaserPattern, checkLaserPatternCollision, renderLaserPattern,
    getActivePatternName, getActivePatternElapsed, getActivePatternDuration
} from './laserPattern.js';
import { LASER_PATTERNS } from './data/laserPatterns.js';

let lastTime = 0;
let accumulator = 0;
let turkey = null;
let gameState = LOADING;

// Run summary data (captured at moment of death)
let runDistance = 0;
let runCoins = 0;
let isNewBest = false;
let runBreakdown = [];  // { label, value, color, prefix } for count-up display
let deadScreenTimer = 0;
const DEATH_PHASE_NONE = 'none';
const DEATH_PHASE_FALL = 'fall';
const DEATH_PHASE_SETTLED = 'settled';
let deathPhase = DEATH_PHASE_NONE;
let deathSteamTimer = 0;
let deathForwardSpeed = 0;

// Laser test mode state
let laserTestIndex = 0;
let laserTestPauseTimer = 0;

// Loading progress tracking
const loadProgress = { loaded: 0, total: 0 };

// Hatching intro state
const EGG_FALL_GRAVITY = 800;
const EGG_WOBBLE_DURATION = 0.6;
const HATCH_PAUSE_AFTER = 0.4;
const SECOND_CHANCE_STEP_METERS = 500;
let hatchPhase = 'falling';
let hatchTimer = 0;
let eggVy = 0;
const DEBUG_SECTION_STARTS = [
    BIOME_BEACH_START,
    BIOME_GRASS_START,
    BIOME_MOUNTAIN_START,
    BIOME_MOON_START,
    BIOME_SPIRITUAL_START
];
const DEBUG_BOSS_SECTION = 6;

const BOSS_PHASE_NONE = 'none';
const BOSS_PHASE_APPROACH = 'approach';
const BOSS_PHASE_BITE = 'bite';
const BOSS_PHASE_EXIT = 'exit';
const BOSS_PHASE_VICTORY_FALL = 'victoryFall';
const BOSS_PHASE_VICTORY_IDLE = 'victoryIdle';

let bossPhase = BOSS_PHASE_NONE;
let bossX = ENDGAME_BOSS_START_X;
let bossY = ENDGAME_BOSS_START_Y;
let bossAnim = 'bossFinger';
let bossTimer = 0;
let bossShakeTimer = 0;
let victorySettleTimer = 0;

// ---------------------------------------------------------------------------
// Collision detection (uses hitbox, not render rect)
// ---------------------------------------------------------------------------

function checkCollisions() {
    const turkeyRect = getTurkeyHitbox(turkey);
    for (const hazard of getHazards()) {
        if (checkGroundHazardCollision(turkeyRect, hazard)) {
            if (isIguana(hazard) && hasIguanaPunch()) {
                consumeIguanaPunch();
                punchHazard(hazard);
                continue;
            }
            return true;
        }
    }
    for (const sb of getSkyBlockers()) {
        if (checkSkyBlockerCollision(turkeyRect, sb)) {
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
    if (checkLaserPatternCollision(turkeyRect)) {
        return true;
    }
    return false;
}

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------


function startHatching() {
    createWorld();
    resetSpawner();
    const runStartMeters = getRunStartDistanceMeters();
    if (runStartMeters > 0) {
        setDistanceMeters(runStartMeters);
        jumpSpawnerToDistance(getDistancePixels());
    }
    resetCollectibles();
    secondChanceNextDist = SECOND_CHANCE_STEP_METERS;
    secondChanceInvulnTimer = 0;
    laserGraceActive = false;
    resetEffects();

    turkey.x = PLAYER_START_X;
    turkey.y = -PLAYER_RENDER_HEIGHT;
    turkey.vy = 0;
    eggVy = 0;
    setEggState(turkey);

    hatchPhase = 'falling';
    hatchTimer = 0;
    resetDeathState();
    resetBossSequence();
    gameState = HATCHING;
    playMusic();
}

function startRun() {
    turkey.vy = 0;
    turkey.animState = 'run';
    resetDeathState();
    gameState = PLAYING;
}

function resetDeathState() {
    deathPhase = DEATH_PHASE_NONE;
    deathSteamTimer = 0;
    deathForwardSpeed = 0;
}

function resetBossSequence() {
    bossPhase = BOSS_PHASE_NONE;
    bossX = ENDGAME_BOSS_START_X;
    bossY = ENDGAME_BOSS_START_Y;
    bossAnim = 'bossFinger';
    bossTimer = 0;
    bossShakeTimer = 0;
    victorySettleTimer = 0;
    stopVictoryMusic();
}

function isBossSequenceActive() {
    return bossPhase !== BOSS_PHASE_NONE;
}

function getBossRect() {
    return {
        x: bossX + ENDGAME_BOSS_HITBOX_INSET_X,
        y: bossY + ENDGAME_BOSS_HITBOX_INSET_Y,
        w: ENDGAME_BOSS_SIZE - ENDGAME_BOSS_HITBOX_INSET_X * 2,
        h: ENDGAME_BOSS_SIZE - ENDGAME_BOSS_HITBOX_INSET_Y * 2
    };
}

function checkBossCollision() {
    const turkeyRect = getTurkeyHitbox(turkey);
    const bossRect = getBossRect();
    return !(
        turkeyRect.x + turkeyRect.w <= bossRect.x ||
        turkeyRect.x >= bossRect.x + bossRect.w ||
        turkeyRect.y + turkeyRect.h <= bossRect.y ||
        turkeyRect.y >= bossRect.y + bossRect.h
    );
}

function startBossSequence() {
    if (isBossSequenceActive()) return;
    bossPhase = BOSS_PHASE_APPROACH;
    bossX = ENDGAME_BOSS_START_X;
    bossY = ENDGAME_BOSS_START_Y;
    bossAnim = 'bossFinger';
    bossTimer = 0;
    bossShakeTimer = 0;
    victorySettleTimer = 0;
    // Endgame sequence runs cleanly without procedural patterns/hazards.
    jumpSpawnerToDistance(getDistancePixels());
    resetCollectibles();
}

function jumpToBossDebugSequence() {
    setDistanceMeters(ENDGAME_BOSS_TRIGGER_METERS - 20);
    jumpSpawnerToDistance(getDistancePixels());
    clearDebugBiomeOverride();
    secondChanceNextDist = Math.floor(ENDGAME_BOSS_TRIGGER_METERS / SECOND_CHANCE_STEP_METERS + 1) * SECOND_CHANCE_STEP_METERS;
    startBossSequence();
}

function updateBossSequence(dt) {
    if (bossShakeTimer > 0) bossShakeTimer -= dt;

    if (bossPhase === BOSS_PHASE_APPROACH) {
        bossX -= ENDGAME_BOSS_APPROACH_SPEED * dt;
        if (checkBossCollision()) {
            bossPhase = BOSS_PHASE_BITE;
            bossAnim = 'bossFingerEaten';
            bossTimer = ENDGAME_BOSS_BITE_HOLD_SECONDS;
            bossShakeTimer = ENDGAME_BOSS_SHAKE_SECONDS;
            stopMusic();
            playSfx('fingerEat');
            setTurkeyFallAnimation(turkey);
            turkey.vy = 0;
        }
        return;
    }

    if (bossPhase === BOSS_PHASE_BITE) {
        bossTimer -= dt;
        if (bossTimer <= 0) {
            bossPhase = BOSS_PHASE_EXIT;
        }
        return;
    }

    if (bossPhase === BOSS_PHASE_EXIT) {
        bossX += ENDGAME_BOSS_EXIT_SPEED_X * dt;
        bossY += ENDGAME_BOSS_EXIT_SPEED_Y * dt;
        applyGravityPhysics(turkey, dt, 1.0);
        updateAnimator(turkey.animator, dt);
        if (bossX > CANVAS_WIDTH + ENDGAME_BOSS_SIZE || bossY + ENDGAME_BOSS_SIZE < -60) {
            bossPhase = BOSS_PHASE_VICTORY_FALL;
        }
        return;
    }

    if (bossPhase === BOSS_PHASE_VICTORY_FALL) {
        applyGravityPhysics(turkey, dt, 1.0);
        updateAnimator(turkey.animator, dt);
        if (isTurkeyOnGround(turkey)) {
            victorySettleTimer += dt;
            if (victorySettleTimer >= ENDGAME_VICTORY_SETTLE_SECONDS) {
                turkey.vy = 0;
                setAnimation(turkey.animator, 'fallDown');
                playVictoryMusic();
                bossPhase = BOSS_PHASE_VICTORY_IDLE;
                consumeClick();
                consumeJustPressed();
            }
        } else {
            victorySettleTimer = 0;
        }
        return;
    }

    if (bossPhase === BOSS_PHASE_VICTORY_IDLE) {
        const click = consumeClick();
        const press = consumeJustPressed();
        if (click || press) {
            stopVictoryMusic();
            goToMenu();
        }
    }
}

function finishDeathSequence() {
    runDistance = getDistanceMeters();
    runBreakdown = [];

    // --- Additive section first ---
    let subtotal = 0;

    const collected = getCoins();
    subtotal += collected;
    runBreakdown.push({ label: 'Collected', value: collected, color: '#FFD700', prefix: '' });

    const grubberTotal = getMoneyGrubberTotal();
    if (grubberTotal > 0) {
        subtotal += grubberTotal;
        runBreakdown.push({ label: 'Money Grubber', value: grubberTotal, color: '#88DDFF', prefix: '+' });
    }

    const streakBonus = getStreakTotalBonus();
    if (streakBonus > 0) {
        subtotal += streakBonus;
        runBreakdown.push({ label: 'Streak Bonus', value: streakBonus, color: '#FFDD44', prefix: '+' });
    }

    const partPct = getPartingGiftPct();
    if (partPct > 0) {
        const partBonus = Math.floor(runDistance * partPct / 100);
        subtotal += partBonus;
        runBreakdown.push({ label: 'Parting Gift', value: partBonus, color: '#CCAAFF', prefix: '+', note: `${partPct}% dist` });
    }

    // --- Multiplicative section ---
    let running = subtotal;

    const coinDoublerM = getCoinDoublerMult();
    const compoundM = getCompoundMult();
    const nestPct = getNestEggBonusPct();

    if (coinDoublerM > 1) {
        const before = running;
        running = Math.floor(running * coinDoublerM);
        runBreakdown.push({ label: 'Coin Doubler', value: running - before, color: '#FFAA44', prefix: '+', note: `x${coinDoublerM}` });
    }
    if (compoundM > 1) {
        const before = running;
        running = Math.floor(running * compoundM);
        runBreakdown.push({ label: 'Compound', value: running - before, color: '#88DDFF', prefix: '+', note: `x${compoundM.toFixed(1)}` });
    }
    if (nestPct > 0) {
        const nestBonus = Math.floor(running * nestPct / 100);
        running += nestBonus;
        runBreakdown.push({ label: 'Nest Egg', value: nestBonus, color: '#AADDAA', prefix: '+', note: `${nestPct}%` });
    }

    // Golden Run (every 10th run doubled) -- always last multiplier
    const slot = getActiveSlot();
    const milestones = deriveMilestones();
    if (milestones.goldenRuns && slot) {
        const runNum = (slot.runCount || 0) + 1;
        if (runNum % 10 === 0) {
            const before = running;
            running *= 2;
            runBreakdown.push({ label: 'GOLDEN RUN!', value: before, color: '#FFD700', prefix: '+', note: 'x2' });
        }
    }

    runCoins = running;

    console.log(`[Run End] breakdown: ${runBreakdown.map(b => `${b.label}: ${b.prefix}${b.value}`).join(', ')} → total: ${runCoins}`);

    isNewBest = updateActiveSlot(runCoins, runDistance);
    deadScreenTimer = 0;
    gameState = DEAD;
}

function handleDeath() {
    gameState = DYING;
    stopMusic();
    playGobble();

    consumeJustPressed();
    consumeClick();
    deathPhase = DEATH_PHASE_FALL;
    deathSteamTimer = 0;
    deathForwardSpeed = DEATH_FORWARD_DRIFT_SPEED;
    turkey.vy = DEATH_BOOST_VELOCITY;
    setTurkeyFallAnimation(turkey);
}

function goToMenu() {
    resetBossSequence();
    stopMusic();
    consumeJustPressed();
    consumeClick();
    drainPointerDown(); drainPointerMove(); drainPointerUp();
    gameState = MENU;
}

function openShop() {
    const slot = getActiveSlot();
    initShop(
        getPurchasedNodes(),
        slot ? slot.totalCoins : 0,
        (nodeId, cost) => {
            purchaseNode(nodeId, cost);
            updateShopCoins(getActiveSlot().totalCoins);
            updateShopPurchased(getPurchasedNodes());
        }
    );
    consumeJustPressed();
    consumeClick();
    drainPointerDown(); drainPointerMove(); drainPointerUp();
    gameState = SHOP;
}

function openLoadout() {
    const levels = deriveGadgetLevels();
    const slotCount = getGadgetSlotCount();
    const currentLoadout = getLoadout();
    initLoadout(slotCount, levels, currentLoadout);
    consumeJustPressed();
    consumeClick();
    gameState = LOADOUT;
}

function applyMetaProgression() {
    const levels = deriveGadgetLevels();
    const tiers = derivePassiveTiers();
    const loadout = getLoadout();
    const milestones = deriveMilestones();

    setGadgetLevels(levels);
    setEquippedGadgets(loadout);
    setPassiveTiers(tiers);
    resetGadgetRunState(getToughFeathersTier());
    resetCompound();
    resetMoneyGrubber();
    resetStreak();
    resetBounty();
}

function jumpToDebugSection(sectionNumber) {
    const sectionIdx = sectionNumber - 1;
    if (sectionIdx < 0 || sectionIdx >= DEBUG_SECTION_STARTS.length) return;

    const targetMeters = DEBUG_SECTION_STARTS[sectionIdx];
    setDistanceMeters(targetMeters);
    jumpSpawnerToDistance(getDistancePixels());
    clearDebugBiomeOverride();
    secondChanceNextDist = Math.floor(targetMeters / SECOND_CHANCE_STEP_METERS + 1) * SECOND_CHANCE_STEP_METERS;
}

// Second Chance passive: invuln pulse tracking
let secondChanceNextDist = SECOND_CHANCE_STEP_METERS;
let secondChanceInvulnTimer = 0;

// Thick Skin: laser grace countdown tracking
let laserGraceActive = false;

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
                openLoadout();
            } else if (action === 'shop') {
                openShop();
            } else if (action === 'changeSlot') {
                gameState = SLOT_SELECT;
            }
        }
        return;
    }

    if (gameState === SHOP) {
        // Forward pointer events for drag-to-pan
        for (const p of drainPointerDown()) onShopPointerDown(p.x, p.y);
        for (const p of drainPointerMove()) onShopPointerMove(p.x, p.y);
        for (const p of drainPointerUp()) onShopPointerUp(p.x, p.y);

        consumeClick();
        consumeJustPressed();

        const action = consumeShopAction();
        if (action === 'back') {
            goToMenu();
        } else if (action === 'recenter') {
            onShopRecenter();
        }
        if (consumeEscapePressed()) goToMenu();
        return;
    }

    if (gameState === LOADOUT) {
        const click = consumeClick();
        consumeJustPressed();
        if (click) {
            const action = onLoadoutClick(click.x, click.y);
            if (action === 'startRun') {
                const finalLoadout = getLoadoutResult();
                setLoadout(finalLoadout);
                applyMetaProgression();
                startHatching();
            } else if (action === 'back') {
                goToMenu();
            } else if (action === 'loadoutChanged') {
                setLoadout(getLoadoutResult());
            }
        }
        if (consumeEscapePressed()) goToMenu();
        return;
    }

    if (gameState === HATCHING) {
        updateHatching(dt);
        return;
    }

    if (gameState === PLAYING) {
        if (DEBUG_LASER_TEST) {
            updateLaserTestMode(dt);
            return;
        }

        // Check for pause (Escape key or pause button click)
        if (!isBossSequenceActive() && consumeEscapePressed()) {
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
        if (!isBossSequenceActive() && click && isPauseButtonClick(click.x, click.y)) {
            pauseMusic();
            gameState = PAUSED;
            return;
        }

        // Debug: keys 1-5 jump to biome starts, 6 jumps to boss test setup.
        const dbg = consumeDebugBiome();
        if (dbg === DEBUG_BOSS_SECTION) {
            jumpToBossDebugSequence();
        } else if (dbg > 0) {
            jumpToDebugSection(dbg);
        }

        const allowPlayerControl = !isBossSequenceActive() || bossPhase === BOSS_PHASE_APPROACH;
        if (allowPlayerControl) {
            applyPhysics(turkey, dt, isPressed());
            updateTurkeyAnimation(turkey, dt, isPressed());
        }
        updateWorld(dt);
        const hitbox = getTurkeyHitbox(turkey);
        const turkeyCX = hitbox.x + PLAYER_WIDTH / 2;
        const turkeyCY = hitbox.y + PLAYER_HEIGHT / 2;
        if (!isBossSequenceActive()) {
            updateSpawner(dt, getDistancePixels(), turkeyCX, turkeyCY);
        }

        setPlayerPos(turkey.x, turkey.y);
        if (!isBossSequenceActive()) {
            updateCollectibles(dt, hitbox);
        }
        updateGadgetTimers(dt);
        updateEffects(dt);

        if (!isBossSequenceActive() && getDistanceMeters() >= ENDGAME_BOSS_TRIGGER_METERS) {
            startBossSequence();
        }

        // Money Grubber: passive coin generation (tracked in passives.js)
        const grubberEarned = updateMoneyGrubber(dt, isTurkeyOnGround(turkey));
        if (grubberEarned > 0) {
            announce(`+${grubberEarned} GRUB`, '#88DDFF');
        }

        // Compound Interest: update multiplier based on distance
        const prevCompound = getCompoundMult();
        updateCompound(getDistanceMeters());
        const newCompound = getCompoundMult();
        if (newCompound > prevCompound) {
            announce(`COMPOUND +${(newCompound - prevCompound).toFixed(1)}x`, '#88DDFF');
        }

        // Second Chance gadget: invuln pulse every 500m
        if (isSecondChanceEquipped() && getDistanceMeters() >= secondChanceNextDist) {
            secondChanceInvulnTimer = getSecondChanceDuration();
            secondChanceNextDist += SECOND_CHANCE_STEP_METERS;
            startCountdown('secondChance', 'SAFE', secondChanceInvulnTimer, '#44FF44');
            announce('SECOND CHANCE!', '#44FF44');
        }
        if (secondChanceInvulnTimer > 0) {
            secondChanceInvulnTimer -= dt;
            if (secondChanceInvulnTimer <= 0) stopCountdown('secondChance');
        }

        // Thick Skin: show countdown while in laser
        const graceTime = getLaserGraceTime();
        if (graceTime > 0) {
            let inLaser = false;
            for (const laser of getLasers()) {
                if (checkLaserCollision(hitbox, laser)) { inLaser = true; break; }
            }
            if (!inLaser && checkLaserPatternCollision(hitbox)) inLaser = true;

            if (inLaser && !laserGraceActive) {
                laserGraceActive = true;
                startCountdown('thickSkin', 'SAFE', graceTime, '#FF6644');
            } else if (!inLaser && laserGraceActive) {
                laserGraceActive = false;
                stopCountdown('thickSkin');
            }
        }

        const isInvuln = secondChanceInvulnTimer > 0 || isFlashInvulnerable() || isShieldInvulnerable();
        updateInvulnEffect(dt, isInvuln);

        if (isBossSequenceActive()) {
            updateBossSequence(dt);
        } else if (checkCollisions()) {
            if (isInvuln) {
                // Invulnerable -- skip death (i-frames active)
            } else if (hasShieldHit()) {
                consumeShieldHit();
                playSfx('crunch');
                const remaining = shieldHitsRemaining();
                const noun = remaining === 1 ? 'Shield' : 'Shields';
                announce(`${remaining} ${noun} Left`, remaining === 0 ? '#FF4444' : '#44AAFF');
                startCountdown('shieldIframes', 'IMMUNE', 1.0, '#44AAFF');
            } else if (trySecondWind()) {
                // announce fires inside trySecondWind()
            } else {
                handleDeath();
            }
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
        if (deathForwardSpeed > 0) {
            turkey.x += deathForwardSpeed * dt;
        }

        if (deathPhase === DEATH_PHASE_FALL) {
            const impactVy = turkey.vy;
            applyGravityPhysics(turkey, dt, DEATH_FALL_GRAVITY_SCALE);
            updateAnimator(turkey.animator, dt);
            const hitGround = isTurkeyOnGround(turkey) && impactVy > 0 && turkey.vy <= DEATH_SETTLE_VY_THRESHOLD;
            if (hitGround && impactVy >= DEATH_BOUNCE_MIN_IMPACT_VY) {
                turkey.vy = -impactVy * DEATH_BOUNCE_DAMPING;
                deathForwardSpeed *= DEATH_FORWARD_BOUNCE_DAMPING;
                return;
            }
            if (hitGround) {
                deathPhase = DEATH_PHASE_SETTLED;
                turkey.vy = 0;
                playDeathAnimation(turkey, null, () => {
                    deathForwardSpeed = 0;
                    deathSteamTimer = DEATH_STEAM_HOLD_SECONDS;
                });
            }
            return;
        }

        updateAnimator(turkey.animator, dt);
        if (deathPhase === DEATH_PHASE_SETTLED && deathSteamTimer > 0) {
            deathSteamTimer -= dt;
            if (deathSteamTimer <= 0) {
                finishDeathSequence();
            }
        }
        return;
    }

    if (gameState === DEAD) {
        deadScreenTimer += dt;
        const click = consumeClick();
        consumeJustPressed();
        if (click) {
            const action = getDeadScreenAction(click.x, click.y);
            if (action === 'playAgain') {
                openLoadout();
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

// -----------------------------------------------------------------------
// Laser test mode
// -----------------------------------------------------------------------

function updateLaserTestMode(dt) {
    applyPhysics(turkey, dt, isPressed());
    updateTurkeyAnimation(turkey, dt, isPressed());
    updateWorld(dt);

    if (isLaserPatternActive()) {
        const stillActive = updateLaserPattern(dt);
        if (!stillActive) {
            laserTestPauseTimer = LASER_PATTERN_PAUSE;
        }
    } else {
        laserTestPauseTimer -= dt;
        if (laserTestPauseTimer <= 0) {
            laserTestIndex = (laserTestIndex + 1) % LASER_PATTERNS.length;
            startLaserPattern(LASER_PATTERNS[laserTestIndex]);
        }
    }

    // Collision check (invincible -- just flash, don't die)
    const hitbox = getTurkeyHitbox(turkey);
    if (checkLaserPatternCollision(hitbox)) {
        turkey._laserHitFlash = 0.15;
    }
    if (turkey._laserHitFlash > 0) {
        turkey._laserHitFlash -= dt;
    }
}

function renderLaserTestHud(ctx) {
    const name = getActivePatternName();
    const elapsed = getActivePatternElapsed();
    const duration = getActivePatternDuration();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (isLaserPatternActive()) {
        // Pattern name
        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = '#000000';
        ctx.fillText(name, CANVAS_WIDTH / 2 + 1, 11);
        ctx.fillStyle = '#FF4444';
        ctx.fillText(name, CANVAS_WIDTH / 2, 10);

        // Timer bar
        const barW = 200;
        const barH = 6;
        const barX = (CANVAS_WIDTH - barW) / 2;
        const barY = 34;
        const frac = Math.min(1, elapsed / duration);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = '#FF6644';
        ctx.fillRect(barX, barY, barW * frac, barH);
    } else {
        const nextIdx = (laserTestIndex + 1) % LASER_PATTERNS.length;
        const nextName = LASER_PATTERNS[nextIdx].name;
        const secs = Math.max(0, laserTestPauseTimer).toFixed(1);
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#000000';
        ctx.fillText(`Next: ${nextName} in ${secs}s`, CANVAS_WIDTH / 2 + 1, 11);
        ctx.fillStyle = '#AAAACC';
        ctx.fillText(`Next: ${nextName} in ${secs}s`, CANVAS_WIDTH / 2, 10);
    }
}

function renderBoss(ctx) {
    if (!isBossSequenceActive()) return;
    drawAnimationFrame(
        ctx,
        bossAnim,
        0,
        Math.round(bossX),
        Math.round(bossY),
        ENDGAME_BOSS_SIZE,
        ENDGAME_BOSS_SIZE
    );
}

function renderVictoryCredits(ctx) {
    if (bossPhase !== BOSS_PHASE_VICTORY_IDLE) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.font = 'bold 40px monospace';
    ctx.fillStyle = '#000000';
    ctx.fillText('YOU WIN', CANVAS_WIDTH / 2 + 2, 22);
    ctx.fillStyle = '#FFD700';
    ctx.fillText('YOU WIN', CANVAS_WIDTH / 2, 20);

    drawAnimationFrame(ctx, 'specialThanksArt', 0, Math.round((CANVAS_WIDTH - 232) / 2), 86, 232, 81);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('Credits', CANVAS_WIDTH / 2, 186);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText('Art/Music/Sound', CANVAS_WIDTH / 2, 220);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Raptor G', CANVAS_WIDTH / 2, 242);

    ctx.fillStyle = '#CCCCCC';
    ctx.fillText('Code', CANVAS_WIDTH / 2, 270);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Eric Tams', CANVAS_WIDTH / 2, 292);

    ctx.fillStyle = '#CCCCCC';
    ctx.fillText('Design', CANVAS_WIDTH / 2, 320);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Raptor / Eric / John', CANVAS_WIDTH / 2, 342);

    ctx.fillStyle = '#AAAACC';
    ctx.font = '14px monospace';
    ctx.fillText('Tap or press Space to return to menu', CANVAS_WIDTH / 2, 372);
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

    if (gameState === SHOP) {
        renderShop(ctx);
        return;
    }

    if (gameState === LOADOUT) {
        renderLoadout(ctx);
        return;
    }

    const shouldShake = gameState === PLAYING && bossShakeTimer > 0 && isBossSequenceActive();
    const shakeX = shouldShake ? (Math.random() * 2 - 1) * ENDGAME_BOSS_SHAKE_PX : 0;
    const shakeY = shouldShake ? (Math.random() * 2 - 1) * ENDGAME_BOSS_SHAKE_PX : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // All gameplay states show the world scene
    renderWorld(ctx);

    const suppressPatterns = gameState === PLAYING && isBossSequenceActive();

    if (!suppressPatterns && (gameState === PLAYING || gameState === PAUSED ||
        gameState === DYING || gameState === DEAD)) {
        // Pool noodle zappers draw behind terrain
        for (const zapper of getZappers()) {
            renderZapper(ctx, zapper);
        }
    }

    renderWorldTerrain(ctx);

    if (!suppressPatterns && (gameState === PLAYING || gameState === PAUSED ||
        gameState === DYING || gameState === DEAD)) {
        const canPunch = hasIguanaPunch();
        for (const hazard of getHazards()) {
            renderGroundHazard(ctx, hazard, canPunch);
        }
        for (const sb of getSkyBlockers()) {
            renderSkyBlocker(ctx, sb);
        }
        for (const bird of getBirds()) {
            renderBird(ctx, bird, false);
        }
        for (const laser of getLasers()) {
            renderLaser(ctx, laser);
        }
        renderAllFood(ctx);
    }

    if (gameState === PLAYING && DEBUG_LASER_TEST) {
        renderLaserPattern(ctx);
    } else if (isLaserPatternActive()) {
        renderLaserPattern(ctx);
    }

    renderTurkey(ctx, turkey);
    renderBoss(ctx);

    // Hit flash overlay in laser test mode (invincible but shows collision)
    if (DEBUG_LASER_TEST && turkey._laserHitFlash > 0) {
        const hitbox = getTurkeyHitbox(turkey);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fillRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
    }

    ctx.restore();

    if (gameState === PLAYING && DEBUG_LASER_TEST) {
        renderLaserTestHud(ctx);
    } else if (gameState === PLAYING) {
        renderHud(ctx, getDistanceMeters(), getCoins(), true);
        renderEffects(ctx);
        renderVictoryCredits(ctx);
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
        renderRunSummary(ctx, runDistance, runCoins, totalCoins, bestDist, isNewBest, runBreakdown, deadScreenTimer);
    }
}

// ---------------------------------------------------------------------------
// Auto-pause on visibility change
// ---------------------------------------------------------------------------

function onVisibilityChange() {
    if (document.hidden && gameState === PLAYING) {
        if (isBossSequenceActive()) return;
        pauseMusic();
        gameState = PAUSED;
    }
}

// ---------------------------------------------------------------------------
// Asset loading with progress tracking
// ---------------------------------------------------------------------------

function loadWithProgress() {
    loadProgress.total = TURKEY_ANIM_COUNT + BIRD_ANIM_COUNT + FOOD_ANIM_COUNT
        + LASER_ANIM_COUNT + BLOCKER_ANIM_COUNT + BACKGROUND_DECOR_ANIM_COUNT
        + BOSS_ANIM_COUNT + 4;
    loadProgress.loaded = 0;

    const spritePromise = loadAll().then(() => { loadProgress.loaded++; });
    const patternPromise = loadPatterns().then(() => { loadProgress.loaded++; });
    const turkeyAnimPromise = loadTurkeyAnimations(() => { loadProgress.loaded++; });
    const birdAnimPromise = loadBirdAnimations(() => { loadProgress.loaded++; });
    const foodAnimPromise = loadFoodAnimations(() => { loadProgress.loaded++; });
    const laserAnimPromise = loadLaserAnimations(() => { loadProgress.loaded++; });
    const blockerAnimPromise = loadBlockerAnimations(() => { loadProgress.loaded++; });
    const decorAnimPromise = loadBackgroundDecorAnimations(() => { loadProgress.loaded++; });
    const bossAnimPromise = loadBossAnimations(() => { loadProgress.loaded++; });
    const musicPromise = loadMusic().then(() => { loadProgress.loaded++; });
    const terrainPromise = loadTerrainTiles().then(() => { loadProgress.loaded++; });

    return Promise.all([
        spritePromise,
        patternPromise,
        turkeyAnimPromise,
        birdAnimPromise,
        foodAnimPromise,
        laserAnimPromise,
        blockerAnimPromise,
        decorAnimPromise,
        bossAnimPromise,
        musicPromise,
        terrainPromise
    ]);
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
        if (DEBUG_LASER_TEST) {
            createWorld();
            resetTurkey(turkey);
            laserTestIndex = 0;
            startLaserPattern(LASER_PATTERNS[0]);
            gameState = PLAYING;
        } else {
            gameState = SLOT_SELECT;
        }
    });

    // Auto-pause when tab/app loses focus
    document.addEventListener('visibilitychange', onVisibilityChange);
}

start();
