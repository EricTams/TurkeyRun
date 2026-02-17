import {
    GRAVITY, THRUST, TERMINAL_VEL_UP, TERMINAL_VEL_DOWN,
    GROUND_Y, PLAYER_HEIGHT
} from './config.js';

export function applyPhysics(turkey, dt, pressing) {
    if (pressing) {
        turkey.vy -= THRUST * dt;
    } else {
        turkey.vy += GRAVITY * dt;
    }

    if (turkey.vy < -TERMINAL_VEL_UP) turkey.vy = -TERMINAL_VEL_UP;
    if (turkey.vy > TERMINAL_VEL_DOWN) turkey.vy = TERMINAL_VEL_DOWN;

    turkey.y += turkey.vy * dt;

    // Clamp to ceiling
    if (turkey.y < 0) {
        turkey.y = 0;
        turkey.vy = 0;
    }

    // Clamp to floor
    if (turkey.y + PLAYER_HEIGHT > GROUND_Y) {
        turkey.y = GROUND_Y - PLAYER_HEIGHT;
        turkey.vy = 0;
    }
}
