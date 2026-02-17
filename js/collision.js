// AIDEV-NOTE: AABB (axis-aligned bounding box) collision detection.
// Each rect is { x, y, w, h }.

export function rectsOverlap(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
}
