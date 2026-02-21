// AIDEV-NOTE: Input handler (updated chunk 10). Tracks press state for
// gameplay thrust AND click positions (in canvas logical coords) for UI
// screens like slot selection and run summary.

let pressed = false;
let justPressedFlag = false;
let canvasRef = null;
let clickX = -1;
let clickY = -1;
let hasClick = false;
let debugBiomeKey = 0;
let escapeJustPressed = false;

// Pointer event queues for shop drag-to-pan
let ptrDownQueue = [];
let ptrMoveQueue = [];
let ptrUpQueue = [];
let wheelDelta = 0;

export function initInput(canvas) {
    canvasRef = canvas;

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

    canvas.addEventListener('wheel', onWheel, { passive: false });

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
    ptrDownQueue.push(toCanvasCoords(e.clientX, e.clientY));
}

function onMouseMove(e) {
    if (pressed) ptrMoveQueue.push(toCanvasCoords(e.clientX, e.clientY));
}

function onMouseUp(e) {
    pressed = false;
    ptrUpQueue.push(toCanvasCoords(e.clientX, e.clientY));
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
        ptrDownQueue.push(toCanvasCoords(e.touches[0].clientX, e.touches[0].clientY));
    }
}

function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
        ptrMoveQueue.push(toCanvasCoords(e.touches[0].clientX, e.touches[0].clientY));
    }
}

function onTouchEnd(e) {
    e.preventDefault();
    if (e.changedTouches.length > 0) {
        ptrUpQueue.push(toCanvasCoords(e.changedTouches[0].clientX, e.changedTouches[0].clientY));
    }
    if (e.touches.length === 0) {
        pressed = false;
    }
}

// Returns debug section number 1-6 if a debug key was pressed, or 0.
export function consumeDebugBiome() {
    const val = debugBiomeKey;
    debugBiomeKey = 0;
    return val;
}

// Returns true once if Escape was pressed since last call.
export function consumeEscapePressed() {
    if (escapeJustPressed) {
        escapeJustPressed = false;
        return true;
    }
    return false;
}

// Drain pointer event queues (used by shop for drag-to-pan)
export function drainPointerDown() {
    const q = ptrDownQueue; ptrDownQueue = []; return q;
}
export function drainPointerMove() {
    const q = ptrMoveQueue; ptrMoveQueue = []; return q;
}
export function drainPointerUp() {
    const q = ptrUpQueue; ptrUpQueue = []; return q;
}
export function consumeWheelDelta() {
    const d = wheelDelta; wheelDelta = 0; return d;
}

function onWheel(e) {
    e.preventDefault();
    wheelDelta += e.deltaY;
}

function onKeyDown(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        pressed = true;
        justPressedFlag = true;
    }
    if (e.code === 'Escape') {
        escapeJustPressed = true;
    }
    // Debug: keys 1-6 jump to progression checkpoints.
    if (e.code >= 'Digit1' && e.code <= 'Digit6') {
        debugBiomeKey = parseInt(e.code.charAt(5), 10);
    }
}

function onKeyUp(e) {
    if (e.code === 'Space') {
        pressed = false;
    }
}
