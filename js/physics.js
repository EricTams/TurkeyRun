import {
    GRAVITY, THRUST, TERMINAL_VEL_UP, TERMINAL_VEL_DOWN,
    GROUND_Y, PLAYER_RENDER_HEIGHT, PLAYER_SPRITE_BOTTOM_PAD,
    PLAYER_START_X
} from './config.js';
import { getGroundYAt } from './terrain.js';

// The effective ground line for the sprite: feet touch GROUND_Y,
// but the frame extends PLAYER_SPRITE_BOTTOM_PAD px of transparent
// space below the feet, so the frame bottom is allowed past GROUND_Y.
const FEET_Y = PLAYER_RENDER_HEIGHT - PLAYER_SPRITE_BOTTOM_PAD;

function clampTurkeyVerticalBounds(turkey) {
    if (turkey.y < 0) {
        turkey.y = 0;
        turkey.vy = 0;
    }

    const groundY = getGroundYAt(PLAYER_START_X);
    if (turkey.y + FEET_Y > groundY) {
        turkey.y = groundY - FEET_Y;
        turkey.vy = 0;
    }
}

export function applyPhysics(turkey, dt, pressing) {
    if (pressing) {
        turkey.vy -= THRUST * dt;
    } else {
        turkey.vy += GRAVITY * dt;
    }

    if (turkey.vy < -TERMINAL_VEL_UP) turkey.vy = -TERMINAL_VEL_UP;
    if (turkey.vy > TERMINAL_VEL_DOWN) turkey.vy = TERMINAL_VEL_DOWN;

    turkey.y += turkey.vy * dt;
    clampTurkeyVerticalBounds(turkey);
}

export function applyGravityPhysics(turkey, dt, gravityScale) {
    turkey.vy += GRAVITY * gravityScale * dt;
    if (turkey.vy > TERMINAL_VEL_DOWN) turkey.vy = TERMINAL_VEL_DOWN;
    turkey.y += turkey.vy * dt;
    clampTurkeyVerticalBounds(turkey);
}
