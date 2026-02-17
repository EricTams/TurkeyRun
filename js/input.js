// AIDEV-NOTE: Input handler (updated chunk 10). Tracks press state for
// gameplay thrust AND click positions (in canvas logical coords) for UI
// screens like slot selection and run summary.

let pressed = false;
let justPressedFlag = false;
let canvasRef = null;
let clickX = -1;
let clickY = -1;
let hasClick = false;

export function initInput(canvas) {
    canvasRef = canvas;

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onRelease);

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Reset input when window loses focus so the turkey doesn't keep
    // thrusting if the user alt-tabs while holding.
    window.addEventListener('blur', onRelease);
}

export function isPressed() {
    return pressed;
}

// Returns true once per press, then resets. Used by the death screen so a
// held press from the previous run doesn't instantly restart.
export function consumeJustPressed() {
    if (justPressedFlag) {
        justPressedFlag = false;
        return true;
    }
    return false;
}

// Returns canvas-coordinate click position {x, y} if a click occurred since
// the last call, or null. Coordinates are in the canvas logical space
// (800x450), not CSS pixels.
export function consumeClick() {
    if (hasClick) {
        hasClick = false;
        return { x: clickX, y: clickY };
    }
    return null;
}

function toCanvasCoords(clientX, clientY) {
    const rect = canvasRef.getBoundingClientRect();
    return {
        x: (clientX - rect.left) * (canvasRef.width / rect.width),
        y: (clientY - rect.top) * (canvasRef.height / rect.height)
    };
}

function recordClick(clientX, clientY) {
    const coords = toCanvasCoords(clientX, clientY);
    clickX = coords.x;
    clickY = coords.y;
    hasClick = true;
}

function onMouseDown(e) {
    pressed = true;
    justPressedFlag = true;
    recordClick(e.clientX, e.clientY);
}

function onRelease() {
    pressed = false;
}

function onTouchStart(e) {
    e.preventDefault();
    pressed = true;
    justPressedFlag = true;
    if (e.touches.length > 0) {
        recordClick(e.touches[0].clientX, e.touches[0].clientY);
    }
}

function onTouchEnd(e) {
    e.preventDefault();
    if (e.touches.length === 0) {
        pressed = false;
    }
}

function onKeyDown(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        pressed = true;
        justPressedFlag = true;
    }
}

function onKeyUp(e) {
    if (e.code === 'Space') {
        pressed = false;
    }
}
