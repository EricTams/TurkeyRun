// AIDEV-NOTE: Sprite abstraction layer. All entities draw through this module
// so placeholder rectangles swap to pixel art by dropping a PNG in assets/sprites/
// and calling registerSprite() -- no other code changes needed.

const registry = new Map();

export function registerSprite(key, path) {
    const img = new Image();
    img.src = path;
    const entry = { img, loaded: false, failed: false };
    registry.set(key, entry);
    img.onload = () => { entry.loaded = true; };
    img.onerror = () => { entry.failed = true; };
}

export function drawSprite(ctx, key, x, y, w, h, fallbackColor) {
    const entry = registry.get(key);
    if (entry && entry.loaded) {
        ctx.drawImage(entry.img, x, y, w, h);
        return;
    }
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(x, y, w, h);
}

export function loadAll() {
    const entries = [...registry.values()];
    if (entries.length === 0) return Promise.resolve();

    return Promise.all(entries.map(entry =>
        new Promise(resolve => {
            if (entry.img.complete) { resolve(); return; }
            entry.img.addEventListener('load', resolve, { once: true });
            entry.img.addEventListener('error', resolve, { once: true });
        })
    ));
}
