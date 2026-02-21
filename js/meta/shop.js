// Shop screen: pannable upgrade tree on a sparse grid.
// Renders nodes with fog-of-war, handles buy/cancel popup.

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config.js';
import { TREE_NODES, ADJACENCY, getNode, getEffectiveCost } from './upgradeTree.js';
import { getBargainTier } from './passives.js';

const CELL_SIZE = 56;
const CELL_GAP = 8;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const NODE_RADIUS = 4;

const BG_COLOR = '#0e0e1a';
const GRID_LINE_COLOR = 'rgba(50,50,80,0.15)';
const LINK_COLOR = 'rgba(100,100,140,0.4)';
const NODE_GREEN = '#2a8a2a';
const NODE_GREEN_BORDER = '#3aba3a';
const NODE_YELLOW = '#8a8a2a';
const NODE_YELLOW_BORDER = '#baba3a';
const NODE_GREY = '#4a4a5a';
const NODE_GREY_BORDER = '#6a6a7a';
const NODE_TEXT = '#FFFFFF';
const POPUP_BG = 'rgba(20,20,40,0.95)';
const POPUP_BORDER = '#6a6aaa';
const BTN_BUY_BG = '#2a7a2a';
const BTN_BUY_BORDER = '#3aaa3a';
const BTN_CANCEL_BG = '#5a2a2a';
const BTN_CANCEL_BORDER = '#8a3a3a';
const BTN_DISABLED_BG = '#2a2a3a';
const BTN_DISABLED_BORDER = '#3a3a5a';
const COIN_COLOR = '#FFD700';
const TITLE_COLOR = '#FFD700';

let panX = 0;
let panY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let panStartX = 0;
let panStartY = 0;
let hasDragged = false;
let pendingAction = null;
let lastRecenterAtMs = 0;

let selectedNodeId = null; // for popup

let purchasedNodes = new Set();
let totalCoins = 0;
let onPurchaseCallback = null;
const RECENTER_DEBOUNCE_MS = 180;

function isInsideBtn(x, y, btn) {
    return x >= btn.x && x <= btn.x + btn.w &&
        y >= btn.y && y <= btn.y + btn.h;
}

function tryQueueRecenter() {
    const now = performance.now();
    if (now - lastRecenterAtMs < RECENTER_DEBOUNCE_MS) return false;
    lastRecenterAtMs = now;
    pendingAction = 'recenter';
    return true;
}

// --- Public API ---

export function initShop(purchased, coins, onPurchase) {
    purchasedNodes = new Set(purchased);
    if (!purchasedNodes.has('start')) purchasedNodes.add('start');
    totalCoins = coins;
    onPurchaseCallback = onPurchase;
    selectedNodeId = null;
    panX = 0;
    panY = 0;
    isDragging = false;
    hasDragged = false;
    pendingAction = null;
    lastRecenterAtMs = 0;
}

export function updateShopCoins(coins) {
    totalCoins = coins;
}

export function updateShopPurchased(purchased) {
    purchasedNodes = new Set(purchased);
    if (!purchasedNodes.has('start')) purchasedNodes.add('start');
}

function isRevealed(nodeId) {
    if (purchasedNodes.has(nodeId)) return true;
    const neighbors = ADJACENCY[nodeId] || [];
    return neighbors.some(nid => purchasedNodes.has(nid));
}

function canPurchase(nodeId) {
    if (purchasedNodes.has(nodeId)) return false;
    return isRevealed(nodeId);
}

function gridToScreen(col, row) {
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    return {
        x: cx + col * CELL_STEP + panX,
        y: cy + row * CELL_STEP + panY,
    };
}

// --- Input handling ---

export function onShopPointerDown(x, y) {
    // Recenter should be robust even when multi-touch up/down ordering
    // causes us to miss the matching pointer-up.
    if (isInsideBtn(x, y, RECENTER_BTN)) {
        tryQueueRecenter();
        return;
    }
    isDragging = true;
    hasDragged = false;
    dragStartX = x;
    dragStartY = y;
    panStartX = panX;
    panStartY = panY;
}

export function onShopPointerMove(x, y) {
    if (!isDragging) return;
    const dx = x - dragStartX;
    const dy = y - dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged = true;
    panX = panStartX + dx;
    panY = panStartY + dy;
}

export function onShopPointerUp(x, y) {
    if (!isDragging) {
        // Handle up-only recenter taps from touch ordering quirks.
        if (isInsideBtn(x, y, RECENTER_BTN)) {
            tryQueueRecenter();
        }
        return;
    }
    isDragging = false;
    if (hasDragged) return; // was a drag, not a tap

    // Bottom-bar actions should only trigger on tap release (not on pointer-down).
    if (isInsideBtn(x, y, BACK_BTN)) {
        pendingAction = 'back';
        return;
    }
    if (isInsideBtn(x, y, RECENTER_BTN)) {
        tryQueueRecenter();
        return;
    }

    // Check popup buttons first
    if (selectedNodeId) {
        const action = getPopupAction(x, y);
        if (action === 'buy') {
            attemptPurchase(selectedNodeId);
            return;
        }
        if (action === 'cancel' || action === 'close') {
            selectedNodeId = null;
            return;
        }
        // Clicked outside popup — close it
        if (!isInsidePopup(x, y)) {
            selectedNodeId = null;
        }
        return;
    }

    // Check node taps
    for (const node of TREE_NODES) {
        if (!isRevealed(node.id)) continue;
        const pos = gridToScreen(node.col, node.row);
        const half = CELL_SIZE / 2;
        if (x >= pos.x - half && x <= pos.x + half &&
            y >= pos.y - half && y <= pos.y + half) {
            selectedNodeId = node.id;
            return;
        }
    }
}

export function onShopRecenter() {
    panX = 0;
    panY = 0;
}

export function consumeShopAction() {
    const action = pendingAction;
    pendingAction = null;
    return action;
}

function attemptPurchase(nodeId) {
    const node = getNode(nodeId);
    if (!node || purchasedNodes.has(nodeId)) return;
    const cost = getEffectiveCost(node, getBargainTier());
    if (totalCoins < cost) return;

    totalCoins -= cost;
    purchasedNodes.add(nodeId);
    selectedNodeId = null;

    if (onPurchaseCallback) {
        onPurchaseCallback(nodeId, cost);
    }
}

// --- Popup geometry ---

const POPUP_W = 280;
const POPUP_H = 160;
const POPUP_X = (CANVAS_WIDTH - POPUP_W) / 2;
const POPUP_Y = (CANVAS_HEIGHT - POPUP_H) / 2;
const POPUP_BTN_W = 100;
const POPUP_BTN_H = 34;
const POPUP_BTN_Y = POPUP_Y + POPUP_H - 48;
const POPUP_BTN_BUY_X = POPUP_X + POPUP_W / 2 - POPUP_BTN_W - 10;
const POPUP_BTN_CANCEL_X = POPUP_X + POPUP_W / 2 + 10;

function isInsidePopup(x, y) {
    return x >= POPUP_X && x <= POPUP_X + POPUP_W &&
           y >= POPUP_Y && y <= POPUP_Y + POPUP_H;
}

function getPopupAction(x, y) {
    if (!selectedNodeId) return null;
    const node = getNode(selectedNodeId);
    const owned = purchasedNodes.has(selectedNodeId);

    if (owned) {
        // Close button (centered)
        const closeBtnX = POPUP_X + (POPUP_W - POPUP_BTN_W) / 2;
        if (x >= closeBtnX && x <= closeBtnX + POPUP_BTN_W &&
            y >= POPUP_BTN_Y && y <= POPUP_BTN_Y + POPUP_BTN_H) {
            return 'close';
        }
        return null;
    }

    // Buy button
    if (x >= POPUP_BTN_BUY_X && x <= POPUP_BTN_BUY_X + POPUP_BTN_W &&
        y >= POPUP_BTN_Y && y <= POPUP_BTN_Y + POPUP_BTN_H) {
        return 'buy';
    }
    // Cancel button
    if (x >= POPUP_BTN_CANCEL_X && x <= POPUP_BTN_CANCEL_X + POPUP_BTN_W &&
        y >= POPUP_BTN_Y && y <= POPUP_BTN_Y + POPUP_BTN_H) {
        return 'cancel';
    }
    return null;
}

// --- Rendering ---

export function renderShop(ctx) {
    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw links between adjacent revealed nodes
    ctx.strokeStyle = LINK_COLOR;
    ctx.lineWidth = 2;
    const drawn = new Set();
    for (const node of TREE_NODES) {
        if (!isRevealed(node.id)) continue;
        const pos = gridToScreen(node.col, node.row);
        const neighbors = ADJACENCY[node.id] || [];
        for (const nid of neighbors) {
            const key = [node.id, nid].sort().join('-');
            if (drawn.has(key)) continue;
            if (!isRevealed(nid)) continue;
            drawn.add(key);
            const nNode = getNode(nid);
            const nPos = gridToScreen(nNode.col, nNode.row);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(nPos.x, nPos.y);
            ctx.stroke();
        }
    }

    // Draw nodes
    for (const node of TREE_NODES) {
        if (!isRevealed(node.id)) continue;
        drawNode(ctx, node);
    }

    // HUD: coin counter top-right
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = COIN_COLOR;
    ctx.fillText(`\u00A4 ${totalCoins}`, CANVAS_WIDTH - 14, 12);

    // Title top-left
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = TITLE_COLOR;
    ctx.fillText('UPGRADE TREE', 14, 12);

    // Recenter button bottom-right
    drawRecenterBtn(ctx);

    // Back button bottom-left
    drawBackBtn(ctx);

    // Popup
    if (selectedNodeId) {
        renderPopup(ctx);
    }
}

function drawGearIcon(ctx, cx, cy, size) {
    const teeth = 6;
    const outer = size;
    const inner = size * 0.6;
    const toothW = Math.PI / teeth * 0.4;
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2;
        const a1 = a - toothW;
        const a2 = a + toothW;
        const aPrev = a1 - (Math.PI / teeth - toothW);
        if (i === 0) {
            ctx.moveTo(cx + Math.cos(aPrev) * inner, cy + Math.sin(aPrev) * inner);
        }
        ctx.lineTo(cx + Math.cos(a1) * outer, cy + Math.sin(a1) * outer);
        ctx.lineTo(cx + Math.cos(a2) * outer, cy + Math.sin(a2) * outer);
        const aNext = a2 + (Math.PI / teeth - toothW);
        ctx.lineTo(cx + Math.cos(aNext) * inner, cy + Math.sin(aNext) * inner);
    }
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
}

function drawNode(ctx, node) {
    const pos = gridToScreen(node.col, node.row);
    const half = CELL_SIZE / 2;
    const x = pos.x - half;
    const y = pos.y - half;
    const owned = purchasedNodes.has(node.id);
    const cost = getEffectiveCost(node, getBargainTier());
    const affordable = totalCoins >= cost;

    let bg, border;
    if (owned) {
        bg = NODE_GREY; border = NODE_GREY_BORDER;
    } else if (affordable) {
        bg = NODE_GREEN; border = NODE_GREEN_BORDER;
    } else {
        bg = NODE_YELLOW; border = NODE_YELLOW_BORDER;
    }

    // Rounded rect
    const r = NODE_RADIUS;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + CELL_SIZE - r, y);
    ctx.arcTo(x + CELL_SIZE, y, x + CELL_SIZE, y + r, r);
    ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE - r);
    ctx.arcTo(x + CELL_SIZE, y + CELL_SIZE, x + CELL_SIZE - r, y + CELL_SIZE, r);
    ctx.lineTo(x + r, y + CELL_SIZE);
    ctx.arcTo(x, y + CELL_SIZE, x, y + CELL_SIZE - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Gear icon on gadget nodes (top-right corner)
    if (node.type === 'gadget') {
        ctx.fillStyle = owned ? 'rgba(150,150,170,0.5)' : 'rgba(255,255,255,0.35)';
        drawGearIcon(ctx, x + CELL_SIZE - 10, y + 10, 7);
    }

    // Label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '10px monospace';
    ctx.fillStyle = NODE_TEXT;

    const label = node.name || '?';
    if (label.length > 8) {
        const mid = Math.ceil(label.length / 2);
        let splitIdx = label.lastIndexOf(' ', mid);
        if (splitIdx < 1) splitIdx = mid;
        ctx.fillText(label.substring(0, splitIdx), pos.x, pos.y - 5);
        ctx.fillText(label.substring(splitIdx).trim(), pos.x, pos.y + 7);
    } else {
        ctx.fillText(label, pos.x, pos.y);
    }
}

function renderPopup(ctx) {
    const node = getNode(selectedNodeId);
    if (!node) return;
    const owned = purchasedNodes.has(selectedNodeId);
    const cost = getEffectiveCost(node, getBargainTier());
    const affordable = totalCoins >= cost;

    // Background
    ctx.fillStyle = POPUP_BG;
    ctx.fillRect(POPUP_X, POPUP_Y, POPUP_W, POPUP_H);
    ctx.strokeStyle = POPUP_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(POPUP_X, POPUP_Y, POPUP_W, POPUP_H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Name
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(node.name, POPUP_X + POPUP_W / 2, POPUP_Y + 24);

    // Description
    ctx.font = '12px monospace';
    ctx.fillStyle = '#CCCCEE';
    wrapText(ctx, node.desc, POPUP_X + POPUP_W / 2, POPUP_Y + 50, POPUP_W - 24, 15);

    // Cost or "Owned"
    ctx.font = 'bold 14px monospace';
    if (owned) {
        ctx.fillStyle = NODE_GREY_BORDER;
        ctx.fillText('OWNED', POPUP_X + POPUP_W / 2, POPUP_Y + 90);
    } else {
        ctx.fillStyle = affordable ? '#88FF88' : '#FF8888';
        ctx.fillText(`Cost: ${cost} coins`, POPUP_X + POPUP_W / 2, POPUP_Y + 90);
    }

    // Buttons
    if (owned) {
        const closeBtnX = POPUP_X + (POPUP_W - POPUP_BTN_W) / 2;
        drawPopupBtn(ctx, closeBtnX, POPUP_BTN_Y, POPUP_BTN_W, POPUP_BTN_H,
            'Close', BTN_CANCEL_BG, BTN_CANCEL_BORDER);
    } else {
        // Buy
        const buyBg = affordable ? BTN_BUY_BG : BTN_DISABLED_BG;
        const buyBorder = affordable ? BTN_BUY_BORDER : BTN_DISABLED_BORDER;
        drawPopupBtn(ctx, POPUP_BTN_BUY_X, POPUP_BTN_Y, POPUP_BTN_W, POPUP_BTN_H,
            'Buy', buyBg, buyBorder);
        // Cancel
        drawPopupBtn(ctx, POPUP_BTN_CANCEL_X, POPUP_BTN_Y, POPUP_BTN_W, POPUP_BTN_H,
            'Cancel', BTN_CANCEL_BG, BTN_CANCEL_BORDER);
    }
}

function drawPopupBtn(ctx, x, y, w, h, label, bg, border) {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(label, x + w / 2, y + h / 2);
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    let ly = y;
    for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxW && line) {
            ctx.fillText(line, cx, ly);
            line = word;
            ly += lineH;
        } else {
            line = test;
        }
    }
    if (line) ctx.fillText(line, cx, ly);
}

// --- Back button ---

const BACK_BTN = { x: 10, y: CANVAS_HEIGHT - 44, w: 80, h: 34 };

function drawBackBtn(ctx) {
    ctx.fillStyle = '#2a2a5a';
    ctx.fillRect(BACK_BTN.x, BACK_BTN.y, BACK_BTN.w, BACK_BTN.h);
    ctx.strokeStyle = '#4a4a8a';
    ctx.lineWidth = 1;
    ctx.strokeRect(BACK_BTN.x, BACK_BTN.y, BACK_BTN.w, BACK_BTN.h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#AAAACC';
    ctx.fillText('BACK', BACK_BTN.x + BACK_BTN.w / 2, BACK_BTN.y + BACK_BTN.h / 2);
}

const RECENTER_BTN = { x: CANVAS_WIDTH - 110, y: CANVAS_HEIGHT - 44, w: 100, h: 34 };

function drawRecenterBtn(ctx) {
    ctx.fillStyle = '#2a2a5a';
    ctx.fillRect(RECENTER_BTN.x, RECENTER_BTN.y, RECENTER_BTN.w, RECENTER_BTN.h);
    ctx.strokeStyle = '#4a4a8a';
    ctx.lineWidth = 1;
    ctx.strokeRect(RECENTER_BTN.x, RECENTER_BTN.y, RECENTER_BTN.w, RECENTER_BTN.h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#AAAACC';
    ctx.fillText('RECENTER', RECENTER_BTN.x + RECENTER_BTN.w / 2, RECENTER_BTN.y + RECENTER_BTN.h / 2);
}

