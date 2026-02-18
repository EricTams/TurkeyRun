import { LASER_PATTERNS } from '../js/data/laserPatterns.js';
import {
    GROUND_Y,
    PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_START_X,
    LASER_BEAM_THICKNESS,
    TERMINAL_VEL_UP, TERMINAL_VEL_DOWN
} from '../js/config.js';

const payload = {
    config: {
        GROUND_Y,
        PLAYER_HEIGHT,
        PLAYER_WIDTH,
        PLAYER_START_X,
        LASER_BEAM_THICKNESS,
        TERMINAL_VEL_UP,
        TERMINAL_VEL_DOWN,
    },
    patterns: LASER_PATTERNS,
};

process.stdout.write(JSON.stringify(payload));
