import {
    PLAYER_RENDER_WIDTH, PLAYER_RENDER_HEIGHT, PLAYER_SPRITE_BOTTOM_PAD,
    PLAYER_WIDTH, PLAYER_HEIGHT,
    PLAYER_HITBOX_OFFSET_X, PLAYER_HITBOX_OFFSET_Y,
    PLAYER_START_X, GROUND_Y, DEBUG_SHOW_HITBOX
} from './config.js';
import { createAnimator, setAnimation, updateAnimator, drawAnimator } from './animation.js';
import { getHitboxShrinkFactor } from './meta/gadgets.js';

// Fallback color used when animation frames aren't loaded
const TURKEY_COLOR = '#8B4513';

// Distance from sprite top to feet (excluding transparent bottom padding)
const FEET_Y = PLAYER_RENDER_HEIGHT - PLAYER_SPRITE_BOTTOM_PAD;

export function createTurkey() {
    return {
        x: PLAYER_START_X,
        y: (GROUND_Y - FEET_Y) / 2,
        vy: 0,
        animator: createAnimator(),
        animState: 'idle'
    };
}

export function resetTurkey(turkey) {
    turkey.y = (GROUND_Y - FEET_Y) / 2;
    turkey.vy = 0;
    turkey.animState = 'run';
    setAnimation(turkey.animator, 'run');
}

/**
 * Returns the hitbox rect for collision detection.
 * The hitbox is inset from the full render rect.
 * Ezy-Dodge gadget shrinks the hitbox further.
 */
export function getTurkeyHitbox(turkey) {
    const shrink = getHitboxShrinkFactor();
    const w = PLAYER_WIDTH * shrink;
    const h = PLAYER_HEIGHT * shrink;
    const cx = turkey.x + PLAYER_HITBOX_OFFSET_X + PLAYER_WIDTH / 2;
    const cy = turkey.y + PLAYER_HITBOX_OFFSET_Y + PLAYER_HEIGHT / 2;
    return {
        x: cx - w / 2,
        y: cy - h / 2,
        w,
        h
    };
}

/**
 * Check if the turkey's feet are on the ground.
 */
export function isTurkeyOnGround(turkey) {
    return turkey.y + FEET_Y >= GROUND_Y;
}

/**
 * Update the turkey's animation state based on physics and input.
 * Called each frame during PLAYING state.
 */
export function updateTurkeyAnimation(turkey, dt, pressing) {
    const onGround = isTurkeyOnGround(turkey);
    const state = turkey.animState;

    if (state === 'run') {
        if (!onGround) {
            if (turkey.vy < 0) {
                turkey.animState = 'jumpUp';
                setAnimation(turkey.animator, 'jumpUp');
            } else {
                turkey.animState = 'fallDown';
                setAnimation(turkey.animator, 'fallDown');
            }
        } else if (pressing) {
            turkey.animState = 'jumpStart';
            setAnimation(turkey.animator, 'jumpStart', {
                loop: false,
                onComplete: () => {
                    turkey.animState = 'jumpUp';
                    setAnimation(turkey.animator, 'jumpUp');
                }
            });
        }
    } else if (state === 'jumpStart') {
        // Let the one-shot animation play through fully.
        // The onComplete callback transitions to jumpUp.
    } else if (state === 'jumpUp') {
        if (turkey.vy > 0) {
            turkey.animState = 'fallDown';
            setAnimation(turkey.animator, 'fallDown');
        }
        if (onGround) {
            turkey.animState = 'run';
            setAnimation(turkey.animator, 'run');
        }
    } else if (state === 'fallDown') {
        if (pressing && turkey.vy < 0) {
            turkey.animState = 'jumpUp';
            setAnimation(turkey.animator, 'jumpUp');
        }
        if (onGround) {
            turkey.animState = 'run';
            setAnimation(turkey.animator, 'run');
        }
    }

    updateAnimator(turkey.animator, dt);
}

/**
 * Set the turkey to the die animation. Returns when complete via callback.
 */
export function setTurkeyFallAnimation(turkey) {
    turkey.animState = 'fallDown';
    setAnimation(turkey.animator, 'fallDown');
}

export function playDeathAnimation(turkey, onComplete, onDeadStart) {
    turkey.animState = 'die';
    setAnimation(turkey.animator, 'die', {
        loop: false,
        onComplete: () => {
            turkey.animState = 'dead';
            setAnimation(turkey.animator, 'dead');
            if (onDeadStart) onDeadStart();
            if (onComplete) onComplete();
        }
    });
}

/**
 * Set the turkey into egg state for the hatching intro.
 */
export function setEggState(turkey) {
    turkey.animState = 'egg';
    setAnimation(turkey.animator, 'egg');
}

/**
 * Play the hatch animation (one-shot). Calls onComplete when done.
 */
export function playHatchAnimation(turkey, onComplete) {
    turkey.animState = 'hatch';
    setAnimation(turkey.animator, 'hatch', {
        loop: false,
        onComplete: () => {
            turkey.animState = 'run';
            setAnimation(turkey.animator, 'run');
            if (onComplete) onComplete();
        }
    });
}

export function renderTurkey(ctx, turkey) {
    if (turkey.animator.currentAnim) {
        drawAnimator(ctx, turkey.animator,
            turkey.x, turkey.y,
            PLAYER_RENDER_WIDTH, PLAYER_RENDER_HEIGHT);
    } else {
        ctx.fillStyle = TURKEY_COLOR;
        ctx.fillRect(turkey.x, turkey.y, PLAYER_RENDER_WIDTH, PLAYER_RENDER_HEIGHT);
    }

    if (DEBUG_SHOW_HITBOX) {
        const hb = getTurkeyHitbox(turkey);
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 1;
        ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
    }
}
