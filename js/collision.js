// AIDEV-NOTE: AABB (axis-aligned bounding box) collision detection.
// Each rect is { x, y, w, h }.

export function rectsOverlap(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
}

// Circle-vs-AABB: circle = { cx, cy, r }, rect = { x, y, w, h }.
export function circleRectOverlap(circle, rect) {
    const nearestX = Math.max(rect.x, Math.min(circle.cx, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(circle.cy, rect.y + rect.h));
    const dx = circle.cx - nearestX;
    const dy = circle.cy - nearestY;
    return dx * dx + dy * dy < circle.r * circle.r;
}
