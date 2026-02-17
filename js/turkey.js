import { PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_START_X, GROUND_Y } from './config.js';
import { drawSprite } from './sprites.js';

const TURKEY_COLOR = '#8B4513';

export function createTurkey() {
    return {
        x: PLAYER_START_X,
        y: (GROUND_Y - PLAYER_HEIGHT) / 2,
        vy: 0
    };
}

export function resetTurkey(turkey) {
    turkey.y = (GROUND_Y - PLAYER_HEIGHT) / 2;
    turkey.vy = 0;
}

export function renderTurkey(ctx, turkey) {
    drawSprite(ctx, 'turkey', turkey.x, turkey.y, PLAYER_WIDTH, PLAYER_HEIGHT, TURKEY_COLOR);
}
