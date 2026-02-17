// Animation system for Aseprite-exported sprite sheets.
// Loads JSON + PNG pairs and provides frame-based animation playback.

const animations = new Map();

/**
 * Load an Aseprite-exported animation (JSON metadata + PNG sprite sheet).
 * Returns a promise that resolves when both are ready.
 */
export function loadAnimation(name, jsonPath, pngPath) {
    return fetch(jsonPath)
        .then(res => res.json())
        .then(data => {
            const img = new Image();
            img.src = pngPath;

            const frames = data.frames.map(f => ({
                x: f.frame.x,
                y: f.frame.y,
                w: f.frame.w,
                h: f.frame.h,
                duration: f.duration / 1000
            }));

            return new Promise((resolve, reject) => {
                img.onload = () => {
                    animations.set(name, { img, frames });
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to load sprite sheet: ${pngPath}`);
                    reject(new Error(`Failed to load ${pngPath}`));
                };
                if (img.complete && img.naturalWidth > 0) {
                    animations.set(name, { img, frames });
                    resolve();
                }
            });
        });
}

/**
 * Create an animator instance that tracks playback state.
 */
export function createAnimator() {
    return {
        currentAnim: null,
        frameIndex: 0,
        elapsed: 0,
        loop: true,
        finished: false,
        onComplete: null
    };
}

/**
 * Switch the animator to a different animation.
 * opts.loop (default true) -- whether to loop.
 * opts.onComplete -- callback when a non-looping animation finishes its last frame.
 */
export function setAnimation(animator, name, opts) {
    if (!opts) opts = {};
    if (animator.currentAnim === name && !opts.force) return;
    animator.currentAnim = name;
    animator.frameIndex = 0;
    animator.elapsed = 0;
    animator.loop = opts.loop !== undefined ? opts.loop : true;
    animator.finished = false;
    animator.onComplete = opts.onComplete || null;
}

/**
 * Advance the animator by dt seconds. Handles frame advancement and
 * one-shot completion.
 */
export function updateAnimator(animator, dt) {
    if (!animator.currentAnim || animator.finished) return;

    const anim = animations.get(animator.currentAnim);
    if (!anim) return;

    animator.elapsed += dt;
    const frame = anim.frames[animator.frameIndex];
    if (!frame) return;

    while (animator.elapsed >= frame.duration) {
        animator.elapsed -= frame.duration;
        animator.frameIndex++;

        if (animator.frameIndex >= anim.frames.length) {
            if (animator.loop) {
                animator.frameIndex = 0;
            } else {
                animator.frameIndex = anim.frames.length - 1;
                animator.finished = true;
                animator.elapsed = 0;
                if (animator.onComplete) {
                    animator.onComplete();
                }
                return;
            }
        }

        const nextFrame = anim.frames[animator.frameIndex];
        if (animator.elapsed < nextFrame.duration) break;
    }
}

/**
 * Draw the current animation frame.
 * x, y, w, h define the destination rectangle on screen.
 */
export function drawAnimator(ctx, animator, x, y, w, h) {
    if (!animator.currentAnim) return;

    const anim = animations.get(animator.currentAnim);
    if (!anim) return;

    const frame = anim.frames[animator.frameIndex];
    if (!frame) return;

    ctx.drawImage(
        anim.img,
        frame.x, frame.y, frame.w, frame.h,
        x, y, w, h
    );
}

/**
 * Load all 8 turkey animations. Returns a promise.
 */
export function loadTurkeyAnimations() {
    const base = 'assets/sprites/Turkey/';
    return Promise.all([
        loadAnimation('egg',       base + 'Turkey-Egg.json',        base + 'Turkey-Egg.png'),
        loadAnimation('hatch',     base + 'Turkey-Hatch.json',      base + 'Turkey-Hatch.png'),
        loadAnimation('run',       base + 'Turkey-Run.json',        base + 'Turkey-Run.png'),
        loadAnimation('jumpStart', base + 'Turkey-Jump Start.json', base + 'Turkey-Jump Start.png'),
        loadAnimation('jumpUp',    base + 'Turkey-Jump Up.json',    base + 'Turkey-Jump Up.png'),
        loadAnimation('fallDown',  base + 'Turkey-Fall Down.json',  base + 'Turkey-Fall Down.png'),
        loadAnimation('die',       base + 'Turkey-Die.json',        base + 'Turkey-Die.png'),
        loadAnimation('dead',      base + 'Turkey-Dead.json',       base + 'Turkey-Dead.png')
    ]);
}
