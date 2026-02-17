import {
    GRAVITY, THRUST, TERMINAL_VEL_UP, TERMINAL_VEL_DOWN,
    GROUND_Y, PLAYER_RENDER_HEIGHT, PLAYER_SPRITE_BOTTOM_PAD
} from './config.js';

// The effective ground line for the sprite: feet touch GROUND_Y,
// but the frame extends PLAYER_SPRITE_BOTTOM_PAD px of transparent
// space below the feet, so the frame bottom is allowed past GROUND_Y.
const FEET_Y = PLAYER_RENDER_HEIGHT - PLAYER_SPRITE_BOTTOM_PAD;

export function applyPhysics(turkey, dt, pressing) {
    if (pressing) {
        turkey.vy -= THRUST * dt;
    } else {
        turkey.vy += GRAVITY * dt;
    }

    if (turkey.vy < -TERMINAL_VEL_UP) turkey.vy = -TERMINAL_VEL_UP;
    if (turkey.vy > TERMINAL_VEL_DOWN) turkey.vy = TERMINAL_VEL_DOWN;

    turkey.y += turkey.vy * dt;

    // Clamp to ceiling (y is top of the render sprite)
    if (turkey.y < 0) {
        turkey.y = 0;
        turkey.vy = 0;
    }

    // Clamp to floor (turkey's feet at GROUND_Y, not the frame bottom)
    if (turkey.y + FEET_Y > GROUND_Y) {
        turkey.y = GROUND_Y - FEET_Y;
        turkey.vy = 0;
    }
}
