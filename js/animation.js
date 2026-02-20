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
 * Check if a named animation is loaded and ready to draw.
 */
export function hasAnimation(name) {
    return animations.has(name);
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
 * Draw a specific frame from a loaded animation by index.
 * Index wraps automatically so callers can pass increasing counters.
 */
export function drawAnimationFrame(ctx, name, frameIndex, x, y, w, h) {
    const anim = animations.get(name);
    if (!anim || anim.frames.length === 0) return;
    const safeIndex = ((frameIndex % anim.frames.length) + anim.frames.length) % anim.frames.length;
    const frame = anim.frames[safeIndex];
    ctx.drawImage(
        anim.img,
        frame.x, frame.y, frame.w, frame.h,
        x, y, w, h
    );
}

/**
 * Return frame count for a loaded animation (0 if missing).
 */
export function getAnimationFrameCount(name) {
    const anim = animations.get(name);
    return anim ? anim.frames.length : 0;
}

/**
 * Load all 8 turkey animations. Returns a promise.
 * Optional onItemLoaded callback is called once per animation as it finishes.
 */
export function loadTurkeyAnimations(onItemLoaded) {
    const base = 'assets/sprites/Turkey/';
    const anims = [
        ['egg',       'Turkey-Egg'],
        ['hatch',     'Turkey-Hatch'],
        ['run',       'Turkey-Run'],
        ['jumpStart', 'Turkey-Jump Start'],
        ['jumpUp',    'Turkey-Jump Up'],
        ['fallDown',  'Turkey-Fall Down'],
        ['die',       'Turkey-Die'],
        ['dead',      'Turkey-Dead']
    ];
    return Promise.all(anims.map(([name, file]) =>
        loadAnimation(name, base + file + '.json', base + file + '.png')
            .then(() => { if (onItemLoaded) onItemLoaded(); })
    ));
}

/** Number of individual animation assets loaded by loadTurkeyAnimations. */
export const TURKEY_ANIM_COUNT = 8;

/**
 * Load bird (Grackle) animations. Returns a promise.
 * Optional onItemLoaded callback is called once per animation as it finishes.
 */
export function loadBirdAnimations(onItemLoaded) {
    const base = 'assets/sprites/Birds/';
    const anims = [
        ['birdStart', 'Grackle-Start'],
        ['birdFly',   'Grackle-Fly']
    ];
    return Promise.all(anims.map(([name, file]) =>
        loadAnimation(name, base + file + '.json', base + file + '.png')
            .then(() => { if (onItemLoaded) onItemLoaded(); })
    ));
}

/** Number of individual animation assets loaded by loadBirdAnimations. */
export const BIRD_ANIM_COUNT = 2;

/**
 * Load all food animations. Returns a promise.
 * Optional onItemLoaded callback is called once per animation as it finishes.
 */
export function loadFoodAnimations(onItemLoaded) {
    const base = 'assets/sprites/Food/';
    const anims = [
        ['foodCarrot',     'Food-Carrot'],
        ['foodChickenLeg', 'Food-Chicken Leg'],
        ['foodChurro',     'Food-Churro'],
        ['foodCoconut',    'Food-Coconut'],
        ['foodCookie',     'Food-Cookie'],
        ['foodDonut',      'Food-Donut'],
        ['foodIceCream',   'Food-Ice Cream'],
        ['foodLemonade',   'Food-Lemonade'],
        ['foodPotato',     'Food-Potato'],
        ['foodTaco',       'Food-Taco']
    ];
    return Promise.all(anims.map(([name, file]) =>
        loadAnimation(name, base + file + '.json', base + file + '.png')
            .then(() => { if (onItemLoaded) onItemLoaded(); })
    ));
}

/** Number of individual animation assets loaded by loadFoodAnimations. */
export const FOOD_ANIM_COUNT = 10;

/**
 * Load jellyfish laser endpoint animations. Returns a promise.
 */
export function loadLaserAnimations(onItemLoaded) {
    const base = 'assets/sprites/Lasers/';
    const anims = [
        ['laserJellyIdle',         'Jellyfish-Idle'],
        ['laserJellyIntoElectric', 'Jellyfish-Into Electric'],
        ['laserJellyElectric',     'Jellyfish-Electric']
    ];
    return Promise.all(anims.map(([name, file]) =>
        loadAnimation(name, base + file + '.json', base + file + '.png')
            .then(() => { if (onItemLoaded) onItemLoaded(); })
    ));
}

/** Number of animation assets loaded by loadLaserAnimations. */
export const LASER_ANIM_COUNT = 3;

/**
 * Load blocker animations (iguanas, pufferfish, asteroids). Returns a promise.
 */
export function loadBlockerAnimations(onItemLoaded) {
    const base = 'assets/sprites/Blockers/';
    const anims = [
        ['oldIguanaIdle',      'Old Iguana-Idle'],
        ['pufferfishIdle',     'Pufferfish-Idle'],
        ['smallAsteroidIdle',  'Small Asteroid-Idle'],
        ['mediumAsteroidIdle', 'Medium Asteroid-Idle'],
        ['largeAsteroidIdle',  'Large Asteroid-Idle'],
        ['tieDyeIguanaIdle',   'Tie Dye Iguana-Idle'],
        ['poolNoodleSpin1',    'Pool Noodle-Spin1'],
        ['poolNoodleSpin2',    'Pool Noodle-Spin2'],
        ['poolNoodleSpin3',    'Pool Noodle-Spin3'],
    ];
    return Promise.all(anims.map(([name, file]) =>
        loadAnimation(name, base + file + '.json', base + file + '.png')
            .then(() => { if (onItemLoaded) onItemLoaded(); })
    ));
}

/** Number of animation assets loaded by loadBlockerAnimations. */
export const BLOCKER_ANIM_COUNT = 9;
