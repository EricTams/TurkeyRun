// Upgrade tree: sparse grid layout, node definitions, and adjacency.
// Each node has a grid position (col, row), a type, and upgrade data.
// The START node is at (0,0). Survival branches go up/left, economy down/right.

// --- Gadget definitions (id -> level data) ---

export const GADGETS = {
    shield:       { name: 'Shield',       category: 'survival', levels: [
        { desc: 'Absorb 1 hit per run',                   cost: 200  },
        { desc: 'Absorb 2 hits per run',                  cost: 400  },
        { desc: 'Absorb 3 hits per run',                  cost: 600  },
    ]},
    secondWind:   { name: 'Second Wind',  category: 'survival', levels: [
        { desc: '30% chance to revive on death',           cost: 500  },
        { desc: '50% chance to revive on death',           cost: 1000 },
        { desc: '75% chance to revive on death',           cost: 1500 },
    ]},
    flash:        { name: 'Flash',        category: 'survival', levels: [
        { desc: 'Near-misses grant 0.3s invulnerability',  cost: 400  },
        { desc: 'Near-misses grant 0.5s invulnerability',  cost: 800  },
        { desc: 'Near-misses grant 0.8s invulnerability',  cost: 1200 },
    ]},
    hazardJammer: { name: 'Hzd Jammer',   category: 'survival', levels: [
        { desc: '5% of zappers deactivate near you',       cost: 600  },
        { desc: '10% of zappers deactivate near you',      cost: 1200 },
        { desc: '15% deactivate + affects lasers',         cost: 1800 },
    ]},
    decoy:        { name: 'Decoy',        category: 'survival', levels: [
        { desc: 'Lure birds away (15s cooldown)',          cost: 500  },
        { desc: 'Lure birds away (12s cooldown)',          cost: 1000 },
        { desc: '8s cooldown + destroys bird',             cost: 1500 },
    ]},
    thickSkin:    { name: 'Thick Skin',   category: 'survival', levels: [
        { desc: 'Lasers take +0.3s to kill',               cost: 350  },
        { desc: 'Lasers take +0.5s to kill',               cost: 700  },
        { desc: '+0.7s + warning flash on contact',        cost: 1050 },
    ]},
    adrenaline:   { name: 'Adrenaline',   category: 'survival', levels: [
        { desc: 'After a hit: 2x coins for 3s',           cost: 450  },
        { desc: 'After a hit: 2x coins for 4s',           cost: 900  },
        { desc: 'After a hit: 3x coins for 5s',           cost: 1350 },
    ]},
    gemologist:   { name: 'Gemologist',   category: 'economy', levels: [
        { desc: '5% chance food is worth 5x',              cost: 600  },
        { desc: '10% chance food is worth 5x',             cost: 1200 },
        { desc: '15% chance food is worth 8x',             cost: 1800 },
    ]},
    streakMaster: { name: 'Streak',       category: 'economy', levels: [
        { desc: '10 food streak: +25% coins 5s',          cost: 400  },
        { desc: '7 food streak: +25% coins 5s',           cost: 800  },
        { desc: '5 food streak: +50% coins 5s',           cost: 1200 },
    ]},
    tokenGift:    { name: 'Token Gift',   category: 'economy', levels: [
        { desc: '3% chance to find a spin token',          cost: 700  },
        { desc: '5% chance to find a spin token',          cost: 1400 },
        { desc: '8% chance to find a spin token',          cost: 2100 },
    ]},
    bountyHunter: { name: 'Bounty',       category: 'economy', levels: [
        { desc: 'Earn coins for near-misses',              cost: 350  },
        { desc: 'Increased near-miss payout',              cost: 700  },
        { desc: 'Chain near-misses for multiplier',        cost: 1050 },
    ]},
    jackpot:      { name: 'Jackpot',      category: 'economy', levels: [
        { desc: '3% chance food gives 20x payout',        cost: 600  },
        { desc: '5% chance food gives 20x payout',        cost: 1200 },
        { desc: '7% chance food gives 30x payout',        cost: 1800 },
    ]},
};

// --- Passive definitions ---

export const PASSIVES = {
    nestEgg:      { name: 'Nest Egg',       category: 'economy',  tiers: [
        { desc: '+4% base coins per run',    cost: 100 },
        { desc: '+8% base coins per run',    cost: 180 },
        { desc: '+12% base coins per run',   cost: 325 },
        { desc: '+16% base coins per run',   cost: 585 },
        { desc: '+20% base coins per run',   cost: 1050 },
    ]},
    partingGift:  { name: 'Parting Gift',   category: 'economy',  tiers: [
        { desc: '+4% distance as bonus coins',  cost: 100 },
        { desc: '+8% distance as bonus coins',  cost: 180 },
        { desc: '+12% distance as bonus coins', cost: 325 },
        { desc: '+16% distance as bonus coins', cost: 585 },
        { desc: '+20% distance as bonus coins', cost: 1050 },
    ]},
    bargainHunter:{ name: 'Bargain',        category: 'economy',  tiers: [
        { desc: 'Shop prices -5%',  cost: 150 },
        { desc: 'Shop prices -10%', cost: 270 },
        { desc: 'Shop prices -15%', cost: 490 },
    ]},
    toughFeathers:{ name: 'Tough Fthr',     category: 'survival', tiers: [
        { desc: 'Start with 1 free shield hit',  cost: 200 },
        { desc: 'Start with 2 free shield hits', cost: 360 },
        { desc: 'Start with 3 free shield hits', cost: 650 },
    ]},
    secondChance: { name: '2nd Chance',     category: 'survival', tiers: [
        { desc: 'Every 500m: 2s invulnerability', cost: 250 },
        { desc: 'Every 500m: 3s invulnerability', cost: 450 },
        { desc: 'Every 500m: 4s invulnerability', cost: 810 },
    ]},
    ezyDodge:     { name: 'Ezy-Dodge',    category: 'survival', tiers: [
        { desc: 'Hitbox shrinks 15%',  cost: 300  },
        { desc: 'Hitbox shrinks 25%',  cost: 600  },
        { desc: 'Hitbox shrinks 35%',  cost: 900  },
    ]},
    coinMagnet:   { name: 'Coin Magnet',  category: 'economy',  tiers: [
        { desc: '2x food pickup radius',              cost: 300  },
        { desc: '3x food pickup radius',              cost: 600  },
        { desc: '4x radius + food drifts to you',     cost: 900  },
    ]},
    coinDoubler:  { name: 'Coin Doubler', category: 'economy',  tiers: [
        { desc: '1.25x coins earned',   cost: 500  },
        { desc: '1.5x coins earned',    cost: 1000 },
        { desc: '1.75x coins earned',   cost: 1500 },
    ]},
    compoundInterest: { name: 'Compound', category: 'economy',  tiers: [
        { desc: '+0.1x coin mult per 500m',   cost: 500  },
        { desc: '+0.1x coin mult per 400m',   cost: 1000 },
        { desc: '+0.15x coin mult per 400m',  cost: 1500 },
    ]},
    moneyGrubber: { name: 'Grubber',     category: 'economy',  tiers: [
        { desc: 'Earn 1 coin every 3s while running',   cost: 400  },
        { desc: 'Earn 1 coin every 2s while running',   cost: 800  },
        { desc: 'Earn 1 coin every 1.5s while running', cost: 1200 },
    ]},
};

// --- Milestone definitions ---

export const MILESTONES = {
    thirdSlot:     { name: '3rd Slot',    desc: 'Equip 3 gadgets per run',                      cost: 5000  },
    fourthSlot:    { name: '4th Slot',    desc: 'Equip 4 gadgets per run',                      cost: 12000 },
    gadgetSynergy: { name: 'Synergy',     desc: '2+ same-category gadgets: +10% bonus',         cost: 6000  },
    autoMagnet:    { name: 'Auto Mag',    desc: 'All food auto-collects in generous radius',     cost: 15000 },
    goldenRuns:    { name: 'Gold Runs',   desc: 'Every 10th run: all coins 2x',                 cost: 8000  },
    luckyStart:    { name: 'Lucky',       desc: '15% chance run starts with random bonus',       cost: 7000  },
};

// --- Node types ---
// 'start'    - free center node
// 'gadget'   - references GADGETS[gadgetId], level 0/1/2 (for Lv1/Lv2/Lv3)
// 'passive'  - references PASSIVES[passiveId], tier index
// 'milestone' - references MILESTONES[milestoneId]

// --- Tree node layout on sparse grid ---
// Each node: { id, col, row, type, ref, level/tier, cost }
// The START node is at col=0, row=0.
// Negative rows = upward (survival), positive rows = downward (economy).

function gadgetNode(id, gadgetId, level, col, row) {
    const g = GADGETS[gadgetId];
    const lv = g.levels[level];
    return { id, col, row, type: 'gadget', gadgetId, level, cost: lv.cost,
             name: g.name + (level > 0 ? ` L${level + 1}` : ''), desc: lv.desc };
}

function passiveNode(id, passiveId, tier, col, row) {
    const p = PASSIVES[passiveId];
    const t = p.tiers[tier];
    return { id, col, row, type: 'passive', passiveId, tier, cost: t.cost,
             name: p.name + (tier > 0 ? ` T${tier + 1}` : ''), desc: t.desc };
}

function milestoneNode(id, milestoneId, col, row) {
    const m = MILESTONES[milestoneId];
    return { id, col, row, type: 'milestone', milestoneId, cost: m.cost,
             name: m.name, desc: m.desc };
}

export const TREE_NODES = [
    // ===== CENTER =====
    { id: 'start', col: 0, row: 0, type: 'start', cost: 0, name: 'START', desc: 'The beginning of your journey' },

    // ===== SURVIVAL BRANCH (upward, row < 0) =====
    // Trunk nodes on consecutive rows; branches fork every 2 rows
    // Side branches start 2 cols from center

    gadgetNode('shield_1',    'shield', 0, 0, -1),
    gadgetNode('shield_2',    'shield', 1, 0, -2),
    passiveNode('ezyDodge_1',  'ezyDodge', 0, 0, -3),
    passiveNode('ezyDodge_2',  'ezyDodge', 1, 0, -4),
    passiveNode('ezyDodge_3',  'ezyDodge', 2, 0, -5),
    gadgetNode('shield_3',    'shield', 2, 0, -6),
    gadgetNode('hazJam_1',    'hazardJammer', 0, 0, -7),

    // Branch right from shield_1: Tough Feathers + Adrenaline (row -1)
    passiveNode('toughFthr_1', 'toughFeathers', 0, 1, -1),
    passiveNode('toughFthr_2', 'toughFeathers', 1, 2, -1),
    passiveNode('toughFthr_3', 'toughFeathers', 2, 3, -1),
    gadgetNode('adrenaline_1', 'adrenaline', 0, 4, -1),
    gadgetNode('adrenaline_2', 'adrenaline', 1, 5, -1),
    gadgetNode('adrenaline_3', 'adrenaline', 2, 6, -1),

    // Branch left from ezyDodge_1: Flash (row -3, 2 empty rows after shield fork)
    gadgetNode('flash_1',     'flash', 0, -1, -3),
    gadgetNode('flash_2',     'flash', 1, -2, -3),
    gadgetNode('flash_3',     'flash', 2, -3, -3),

    // Branch right from ezyDodge_1: Second Chance passive (row -3)
    passiveNode('secondCh_1', 'secondChance', 0, 1, -3),
    passiveNode('secondCh_2', 'secondChance', 1, 2, -3),
    passiveNode('secondCh_3', 'secondChance', 2, 3, -3),

    // Branch left from ezyDodge_3: Decoy (row -5, 2 empty rows after flash fork)
    gadgetNode('decoy_1',     'decoy', 0, -1, -5),
    gadgetNode('decoy_2',     'decoy', 1, -2, -5),
    gadgetNode('decoy_3',     'decoy', 2, -3, -5),

    // Branch left from hazJam_1: Hzd Jammer upgrades (row -7)
    gadgetNode('hazJam_2',     'hazardJammer', 1, -1, -7),
    gadgetNode('hazJam_3',     'hazardJammer', 2, -2, -7),

    // Branch right from shield_3: Thick Skin + Second Wind (row -6)
    gadgetNode('thickSkin_1',  'thickSkin', 0, 1, -6),
    gadgetNode('thickSkin_2',  'thickSkin', 1, 2, -6),
    gadgetNode('thickSkin_3',  'thickSkin', 2, 3, -6),
    gadgetNode('secondWind_1', 'secondWind', 0, 4, -6),
    gadgetNode('secondWind_2', 'secondWind', 1, 5, -6),
    gadgetNode('secondWind_3', 'secondWind', 2, 6, -6),

    // ===== ECONOMY BRANCH (downward, row > 0) =====
    // Trunk on consecutive rows; branches fork every 2 rows
    // Side branches start 2 cols from center

    passiveNode('coinMag_1',    'coinMagnet', 0, 0, 1),
    passiveNode('coinMag_2',    'coinMagnet', 1, 0, 2),
    passiveNode('coinDoub_1',   'coinDoubler', 0, 0, 3),
    passiveNode('coinDoub_2',   'coinDoubler', 1, 0, 4),
    passiveNode('coinDoub_3',   'coinDoubler', 2, 0, 5),

    // Branch left from coinMag_1: Money Grubber (row 1, early access)
    passiveNode('grubber_1',    'moneyGrubber', 0, -1, 1),
    passiveNode('grubber_2',    'moneyGrubber', 1, -2, 1),
    passiveNode('grubber_3',    'moneyGrubber', 2, -3, 1),

    // Branch right from coinMag_1: Nest Egg passive (row 1)
    passiveNode('nestEgg_1',   'nestEgg', 0, 1, 1),
    passiveNode('nestEgg_2',   'nestEgg', 1, 2, 1),
    passiveNode('nestEgg_3',   'nestEgg', 2, 3, 1),
    passiveNode('nestEgg_4',   'nestEgg', 3, 4, 1),
    passiveNode('nestEgg_5',   'nestEgg', 4, 5, 1),

    // Branch left from coinDoub_1: Bounty + Streak (row 3, 2 empty rows gap)
    gadgetNode('bounty_1',     'bountyHunter', 0, -1, 3),
    gadgetNode('bounty_2',     'bountyHunter', 1, -2, 3),
    gadgetNode('bounty_3',     'bountyHunter', 2, -3, 3),
    gadgetNode('streak_1',     'streakMaster', 0, -4, 3),
    gadgetNode('streak_2',     'streakMaster', 1, -5, 3),
    gadgetNode('streak_3',     'streakMaster', 2, -6, 3),

    // Branch right from coinDoub_1: Parting Gift passive (row 3)
    passiveNode('partGift_1',  'partingGift', 0, 1, 3),
    passiveNode('partGift_2',  'partingGift', 1, 2, 3),
    passiveNode('partGift_3',  'partingGift', 2, 3, 3),
    passiveNode('partGift_4',  'partingGift', 3, 4, 3),
    passiveNode('partGift_5',  'partingGift', 4, 5, 3),

    // Branch right from coinDoub_2: Bargain Hunter passive (row 4)
    passiveNode('bargain_1',   'bargainHunter', 0, 1, 4),
    passiveNode('bargain_2',   'bargainHunter', 1, 2, 4),
    passiveNode('bargain_3',   'bargainHunter', 2, 3, 4),

    // Branch left from coinDoub_3: Gemologist (row 5, 2 empty rows gap)
    gadgetNode('gem_1',        'gemologist', 0, -1, 5),
    gadgetNode('gem_2',        'gemologist', 1, -2, 5),
    gadgetNode('gem_3',        'gemologist', 2, -3, 5),

    // Branch right from coinDoub_3: Compound Interest (row 5)
    passiveNode('compound_1',   'compoundInterest', 0, 1, 5),
    passiveNode('compound_2',   'compoundInterest', 1, 2, 5),
    passiveNode('compound_3',   'compoundInterest', 2, 3, 5),

    // Continue trunk: deeper economy
    gadgetNode('jackpot_1',    'jackpot', 0, 0, 6),
    gadgetNode('jackpot_2',    'jackpot', 1, 0, 7),
    gadgetNode('jackpot_3',    'jackpot', 2, 0, 8),

    // Branch right from jackpot_1: 3rd/4th slot milestones (row 6)
    milestoneNode('thirdSlot',  'thirdSlot',  1, 6),
    milestoneNode('fourthSlot', 'fourthSlot', 2, 6),

    // Branch left from jackpot_3: Token Gift (row 8)
    gadgetNode('token_1',      'tokenGift', 0, -1, 8),
    gadgetNode('token_2',      'tokenGift', 1, -2, 8),
    gadgetNode('token_3',      'tokenGift', 2, -3, 8),

    // Milestones at branch tips
    milestoneNode('gadgetSynergy', 'gadgetSynergy', -7, 3),  // past streak
    milestoneNode('autoMagnet',    'autoMagnet',     6, 1),   // past nest egg
    milestoneNode('goldenRuns',    'goldenRuns',     6, 3),   // past parting gift
    milestoneNode('luckyStart',    'luckyStart',    -4, 8),   // past token gift
];

// Build adjacency from grid positions. Two nodes are adjacent if they
// differ by exactly 1 in col or row (not both) AND there is a path between them.
// We enforce single-path by only connecting nodes that are direct neighbours
// along a branch (determined by the layout above).

function buildAdjacency(nodes) {
    const byPos = new Map();
    for (const n of nodes) byPos.set(`${n.col},${n.row}`, n.id);

    const adj = {};
    for (const n of nodes) adj[n.id] = [];

    for (const n of nodes) {
        const neighbours = [
            [n.col - 1, n.row], [n.col + 1, n.row],
            [n.col, n.row - 1], [n.col, n.row + 1],
        ];
        for (const [c, r] of neighbours) {
            const nId = byPos.get(`${c},${r}`);
            if (nId && !adj[n.id].includes(nId)) {
                adj[n.id].push(nId);
                if (!adj[nId].includes(n.id)) adj[nId].push(n.id);
            }
        }
    }
    return adj;
}

export const ADJACENCY = buildAdjacency(TREE_NODES);

// Quick lookup: id -> node
const nodeMap = new Map();
for (const n of TREE_NODES) nodeMap.set(n.id, n);
export function getNode(id) { return nodeMap.get(id); }

// Get the effective cost of a node factoring in Bargain Hunter passive discount
export function getEffectiveCost(node, bargainTier) {
    if (node.type === 'start') return 0;
    const discount = bargainTier * 0.05; // 5% per tier
    return Math.floor(node.cost * (1 - discount));
}
