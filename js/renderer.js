import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config.js';

let canvas = null;
let ctx = null;

export function initRenderer() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
        throw new Error('Canvas element #game-canvas not found');
    }

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext('2d');

    resizeDisplay();
    window.addEventListener('resize', resizeDisplay);

    return ctx;
}

export function clear() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

export function getCtx() {
    return ctx;
}

export function getCanvas() {
    return canvas;
}

// AIDEV-NOTE: Scales the canvas CSS size to fill the viewport while
// preserving the logical aspect ratio. Internal resolution stays fixed.
function resizeDisplay() {
    const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
    const windowAspect = window.innerWidth / window.innerHeight;

    let displayWidth, displayHeight;

    if (windowAspect > aspectRatio) {
        displayHeight = window.innerHeight;
        displayWidth = displayHeight * aspectRatio;
    } else {
        displayWidth = window.innerWidth;
        displayHeight = displayWidth / aspectRatio;
    }

    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
}
