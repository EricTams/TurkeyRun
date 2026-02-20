#!/usr/bin/env python3
"""
Build-time section pattern generator for Turkey Runner.

Generates curve-based section patterns for each difficulty tier and writes
them to js/data/patterns.json. Each pattern defines a safe path (curve)
with coins placed on it, obstacles placed outside it, and optional bird
spawn points.

Usage:
    python tools/generate_sections.py

Tweak the TIER_PARAMS and generation constants below, then re-run.
"""

import json
import math
import os
import random
import sys

# ---------------------------------------------------------------------------
# Game constants (must match js/config.js and js/sectionPath.js)
# ---------------------------------------------------------------------------

CANVAS_WIDTH = 800
GROUND_Y = 400
PATH_MARGIN_TOP = 30
PATH_MARGIN_BOTTOM = 30
USABLE_Y = GROUND_Y - PATH_MARGIN_TOP - PATH_MARGIN_BOTTOM  # 340

ZAPPER_GAP_MIN = 90
ZAPPER_GAP_MAX = 150
ZAPPER_GAP_MARGIN = 30
ZAPPER_WIDTH = 30

ZAPPER_BOTTOM_OPEN_MIN_HEIGHT = 100
ZAPPER_BOTTOM_OPEN_MAX_HEIGHT = 280

POOL_NOODLE_WIDTH = 15
POOL_NOODLE_HEIGHT = 60
SAND_CASTLE_WIDTH = 50
SAND_CASTLE_HEIGHT = 35

# Animated blocker dimensions (must match js/config.js)
OLD_IGUANA_WIDTH = 50
OLD_IGUANA_HEIGHT = 50
TIE_DYE_IGUANA_WIDTH = 56
TIE_DYE_IGUANA_HEIGHT = 28
SMALL_ASTEROID_SIZE = 36
MEDIUM_ASTEROID_SIZE = 50
LARGE_ASTEROID_SIZE = 72

# Sky blocker (pufferfish) -- must match js/config.js
PUFFERFISH_SIZE = 180
PUFFERFISH_Y_MIN = 20
PUFFERFISH_Y_MAX = 250

# Worst-case ground hazard footprint across all biomes (used for corridor
# clearance so patterns are safe no matter which biome swaps in its hazards).
MAX_GROUND_HAZARD_WIDTH = max(
    POOL_NOODLE_WIDTH, SAND_CASTLE_WIDTH,
    OLD_IGUANA_WIDTH, TIE_DYE_IGUANA_WIDTH,
    SMALL_ASTEROID_SIZE, MEDIUM_ASTEROID_SIZE, LARGE_ASTEROID_SIZE
)
MAX_GROUND_HAZARD_HEIGHT = max(
    POOL_NOODLE_HEIGHT, SAND_CASTLE_HEIGHT,
    OLD_IGUANA_HEIGHT, TIE_DYE_IGUANA_HEIGHT,
    SMALL_ASTEROID_SIZE, MEDIUM_ASTEROID_SIZE, LARGE_ASTEROID_SIZE
)

LASER_BEAM_THICKNESS = 16
LASER_STATIC_WIDTH = 300
LASER_SWEEP_ARC = math.pi * 0.5

PLAYER_HEIGHT = 40  # matches js/config.js PLAYER_HEIGHT
PLAYER_START_X = 100
BIRD_X_SPEED = 380  # constant horizontal speed (must match config.js)

# Terrain elevation (must match js/config.js)
TILE_SIZE = 64
TIER_HEIGHT = 32  # collision height difference between Low and Normal

# ---------------------------------------------------------------------------
# Tier parameters -- tweak these and re-run
# ---------------------------------------------------------------------------

TIER_PARAMS = {
    "easy": {
        "count": 8,
        "path_width": 180,         # wide corridor, forgiving
        "max_y_delta": 0.18,       # gentle but uses more vertical range
        "x_step_min": 110,         # min px between waypoints
        "x_step_max": 190,         # max px between waypoints
        "section_length_min": 280, # min total section width in px
        "section_length_max": 450, # max total section width in px
        "obstacle_count_min": 1,
        "obstacle_count_max": 3,
        "obstacle_types": ["ground", "skyBlocker"],
        "ground_types": ["poolNoodle", "sandCastle"],
        "bird_chance": 0.0,
        "elevation_chance": 0.35,
        "max_elevation": 1,
    },
    "medium": {
        "count": 15,
        "path_width": 140,         # comfortable but tighter
        "max_y_delta": 0.28,       # moderate sweeps across the screen
        "x_step_min": 90,
        "x_step_max": 170,
        "section_length_min": 300,
        "section_length_max": 550,
        "obstacle_count_min": 2,
        "obstacle_count_max": 5,
        "obstacle_types": ["ground", "ground", "zapper", "zapper", "zapperBottomOpen", "skyBlocker"],
        "ground_types": ["poolNoodle", "sandCastle"],
        "bird_chance": 0.3,
        "elevation_chance": 0.5,
        "max_elevation": 1,
    },
    "hard": {
        "count": 15,
        "path_width": 100,         # requires precision
        "max_y_delta": 0.38,       # large vertical swings
        "x_step_min": 75,
        "x_step_max": 150,
        "section_length_min": 350,
        "section_length_max": 600,
        "obstacle_count_min": 3,
        "obstacle_count_max": 7,
        "obstacle_types": ["ground", "ground", "zapper", "zapper", "zapperBottomOpen", "skyBlocker"],
        "ground_types": ["poolNoodle", "sandCastle"],
        "bird_chance": 0.5,
        "elevation_chance": 0.6,
        "max_elevation": 1,
    },
    "extreme": {
        "count": 15,
        "path_width": 70,          # narrow corridor, punishing
        "max_y_delta": 0.48,       # sharp, aggressive curves
        "x_step_min": 55,
        "x_step_max": 120,
        "section_length_min": 400,
        "section_length_max": 650,
        "obstacle_count_min": 4,
        "obstacle_count_max": 8,
        "obstacle_types": ["ground", "ground", "zapper", "zapper", "zapperBottomOpen", "skyBlocker"],
        "ground_types": ["poolNoodle", "sandCastle"],
        "bird_chance": 0.7,
        "elevation_chance": 0.7,
        "max_elevation": 1,
    },
}

# Bird arrival time is deterministic: (CANVAS_WIDTH - PLAYER_START_X) / BIRD_X_SPEED
BIRD_ARRIVAL_TIME = (CANVAS_WIDTH - PLAYER_START_X) / BIRD_X_SPEED
# Corridor must be wide enough around the bird encounter for the player to dodge
BIRD_DODGE_WIDTH = 180  # corridor width override around bird spawn points


# ---------------------------------------------------------------------------
# Path helpers (mirrors js/sectionPath.js logic)
# ---------------------------------------------------------------------------

def normalized_y_to_pixel(ny):
    return PATH_MARGIN_TOP + ny * USABLE_Y


def pixel_y_to_normalized(py):
    return (py - PATH_MARGIN_TOP) / USABLE_Y


def interpolate_path(path, x):
    """Return (pixel_y, width) at the given x along the path."""
    if not path:
        return GROUND_Y / 2, 140
    if len(path) == 1:
        return normalized_y_to_pixel(path[0]["y"]), path[0]["width"]
    if x <= path[0]["x"]:
        return normalized_y_to_pixel(path[0]["y"]), path[0]["width"]
    if x >= path[-1]["x"]:
        return normalized_y_to_pixel(path[-1]["y"]), path[-1]["width"]
    for i in range(len(path) - 1):
        a, b = path[i], path[i + 1]
        if a["x"] <= x <= b["x"]:
            span = b["x"] - a["x"]
            t = (x - a["x"]) / span if span > 0 else 0
            ny = a["y"] + t * (b["y"] - a["y"])
            w = a["width"] + t * (b["width"] - a["width"])
            return normalized_y_to_pixel(ny), w
    return normalized_y_to_pixel(path[-1]["y"]), path[-1]["width"]


def is_inside_corridor(path, x, pixel_y):
    center_y, width = interpolate_path(path, x)
    half = width / 2
    return center_y - half <= pixel_y <= center_y + half


# ---------------------------------------------------------------------------
# Path generation
# ---------------------------------------------------------------------------

def generate_path(params):
    """Generate a safe-path curve as a list of waypoints."""
    section_len = random.randint(params["section_length_min"],
                                 params["section_length_max"])
    width = params["path_width"]
    max_delta = params["max_y_delta"]
    x_min_step = params["x_step_min"]
    x_max_step = params["x_step_max"]

    # Start at a random y
    y = random.uniform(0.15, 0.85)
    waypoints = [{"x": 0, "y": round(y, 3), "width": width}]

    x = 0
    while x < section_len:
        step = random.randint(x_min_step, x_max_step)
        x = min(x + step, section_len)

        # Random y delta, clamped to [0, 1]
        delta = random.uniform(-max_delta, max_delta)
        y = max(0.05, min(0.95, y + delta))

        waypoints.append({"x": x, "y": round(y, 3), "width": width})

    return waypoints


# ---------------------------------------------------------------------------
# Obstacle placement
# ---------------------------------------------------------------------------

def place_ground_hazard(path, params, occupied_xs, elevation=None):
    """Place a ground hazard at an x that doesn't overlap the corridor at ground level.

    Uses worst-case dimensions because the spawner replaces subType with
    the current biome's hazard types at runtime.  Avoids slope tiles when
    elevation data is present.
    """
    section_end = path[-1]["x"]
    sub_type = random.choice(params["ground_types"])
    hw = MAX_GROUND_HAZARD_WIDTH
    hh = MAX_GROUND_HAZARD_HEIGHT

    for _ in range(40):
        offset_x = random.randint(20, max(20, int(section_end) - hw))

        if any(abs(offset_x - ox) < 60 for ox in occupied_xs):
            continue

        # Skip slope tiles
        if elevation and is_on_slope(elevation, offset_x):
            continue

        local_ground_y = get_ground_y_at_elevation(elevation, offset_x)
        hazard_top_y = local_ground_y - hh

        # Verify the path corridor doesn't overlap the hazard rect.
        buffer = 20
        overlaps = False
        for sx in range(max(0, offset_x - 10), offset_x + hw + 11, max(1, hw // 8)):
            center_y, w = interpolate_path(path, sx)
            corridor_bottom = center_y + w / 2
            if corridor_bottom + buffer >= hazard_top_y:
                overlaps = True
                break

        if not overlaps:
            occupied_xs.append(offset_x)
            return {"type": "ground", "subType": sub_type, "offsetX": offset_x}

    return None


def place_zapper(path, params, occupied_xs, elevation=None):
    """Place a zapper whose gap is aligned with the path at that x."""
    section_end = path[-1]["x"]

    for _ in range(40):
        offset_x = random.randint(30, max(30, int(section_end) - ZAPPER_WIDTH))

        if any(abs(offset_x - ox) < 80 for ox in occupied_xs):
            continue

        # Get path center at this x
        center_y, corridor_w = interpolate_path(path, offset_x)

        # Gap size: use corridor width as guide, but clamp to game limits
        gap_h = max(ZAPPER_GAP_MIN, min(ZAPPER_GAP_MAX, int(corridor_w * 0.85)))

        # Position gap so its center aligns with the path center
        gap_y = center_y - gap_h / 2

        # Clamp to respect margins
        gap_y = max(ZAPPER_GAP_MARGIN, min(GROUND_Y - ZAPPER_GAP_MARGIN - gap_h, gap_y))

        # Convert gapY to a gapCenter fraction (0-1) for compatibility with spawner
        available = GROUND_Y - 2 * ZAPPER_GAP_MARGIN - gap_h
        if available > 0:
            gap_center = (gap_y - ZAPPER_GAP_MARGIN) / available
        else:
            gap_center = 0.5

        gap_center = round(max(0, min(1, gap_center)), 3)

        occupied_xs.append(offset_x)
        return {
            "type": "zapper",
            "offsetX": offset_x,
            "gapCenter": gap_center,
            "gapH": gap_h,
        }

    return None


def place_static_laser(path, params, occupied_xs, elevation=None):
    """Place a static laser beam outside the corridor."""
    section_end = path[-1]["x"]

    for _ in range(40):
        offset_x = random.randint(0, max(0, int(section_end) - 100))

        if any(abs(offset_x - ox) < 120 for ox in occupied_xs):
            continue

        # Get path center at this x
        center_y, corridor_w = interpolate_path(path, offset_x)
        half_corridor = corridor_w / 2
        half_beam = LASER_BEAM_THICKNESS / 2

        # Decide: above or below the corridor
        space_above = center_y - half_corridor - PATH_MARGIN_TOP
        space_below = GROUND_Y - (center_y + half_corridor) - PATH_MARGIN_BOTTOM

        if space_above > half_beam + 10 and (space_above >= space_below or space_below < half_beam + 10):
            beam_y = random.uniform(
                PATH_MARGIN_TOP + half_beam,
                center_y - half_corridor - half_beam - 5
            )
        elif space_below > half_beam + 10:
            beam_y = random.uniform(
                center_y + half_corridor + half_beam + 5,
                GROUND_Y - PATH_MARGIN_BOTTOM - half_beam
            )
        else:
            continue

        beam_center = (beam_y - LASER_BEAM_THICKNESS) / (GROUND_Y - 2 * LASER_BEAM_THICKNESS)
        beam_center = round(max(0, min(1, beam_center)), 3)

        occupied_xs.append(offset_x)
        return {
            "type": "laserStatic",
            "offsetX": offset_x,
            "beamCenter": beam_center,
        }

    return None


def place_sweep_laser(path, params, occupied_xs, elevation=None):
    """Place a sweep laser with pivot at ceiling or ground."""
    section_end = path[-1]["x"]

    for _ in range(40):
        offset_x = random.randint(50, max(50, int(section_end) - 50))

        if any(abs(offset_x - ox) < 150 for ox in occupied_xs):
            continue

        # Choose pivot side based on where the path is
        center_y, _ = interpolate_path(path, offset_x)
        if center_y < GROUND_Y / 2:
            pivot_side = "ground"
        else:
            pivot_side = "ceiling"

        occupied_xs.append(offset_x)
        return {
            "type": "laserSweep",
            "offsetX": offset_x,
            "pivotSide": pivot_side,
        }

    return None


def place_bottom_open_zapper(path, params, occupied_xs, elevation=None):
    """Place a bottom-open zapper (top bar only, open below).

    The corridor must pass below the bar, so the bar height must be less than
    the corridor's upper edge at that x.
    """
    section_end = path[-1]["x"]

    for _ in range(40):
        offset_x = random.randint(30, max(30, int(section_end) - ZAPPER_WIDTH))

        if any(abs(offset_x - ox) < 80 for ox in occupied_xs):
            continue

        # Get path center at this x -- corridor must pass below the bar
        center_y, corridor_w = interpolate_path(path, offset_x)
        corridor_top = center_y - corridor_w / 2

        # Bar must end above the corridor (with 10px buffer)
        max_bar = corridor_top - 10
        if max_bar < ZAPPER_BOTTOM_OPEN_MIN_HEIGHT:
            continue

        bar_height = random.randint(
            ZAPPER_BOTTOM_OPEN_MIN_HEIGHT,
            min(ZAPPER_BOTTOM_OPEN_MAX_HEIGHT, int(max_bar))
        )

        occupied_xs.append(offset_x)
        return {
            "type": "zapperBottomOpen",
            "offsetX": offset_x,
            "barHeight": bar_height,
        }

    return None


def place_sky_blocker(path, params, occupied_xs, elevation=None):
    """Place a sky blocker (pufferfish) at a Y that avoids the corridor.

    The blocker is a circle of diameter PUFFERFISH_SIZE.  We sample the
    corridor at the candidate x and pick a Y above or below it within the
    allowed sky region [PUFFERFISH_Y_MIN, PUFFERFISH_Y_MAX].
    At most one sky blocker per pattern (enforced by occupied_xs spacing).
    """
    section_end = path[-1]["x"]
    size = PUFFERFISH_SIZE
    buffer = 30  # clearance between blocker edge and corridor edge

    for _ in range(40):
        offset_x = random.randint(40, max(40, int(section_end) - size))

        # Wide spacing -- sky blockers are large
        if any(abs(offset_x - ox) < size + 40 for ox in occupied_xs):
            continue

        # Sample the corridor across the blocker's width
        corridor_top = float("inf")
        corridor_bottom = float("-inf")
        for sx in range(max(0, offset_x), offset_x + size + 1, max(1, size // 6)):
            center_y, w = interpolate_path(path, sx)
            corridor_top = min(corridor_top, center_y - w / 2)
            corridor_bottom = max(corridor_bottom, center_y + w / 2)

        # Find valid Y ranges (blocker top-left corner Y)
        candidates = []

        # Above corridor
        above_max_y = corridor_top - buffer - size
        if above_max_y >= PUFFERFISH_Y_MIN:
            candidates.append((PUFFERFISH_Y_MIN, above_max_y))

        # Below corridor
        below_min_y = corridor_bottom + buffer
        if below_min_y + size <= PUFFERFISH_Y_MAX + size:
            candidates.append((below_min_y, min(PUFFERFISH_Y_MAX, GROUND_Y - size - 10)))

        # Filter out degenerate ranges
        candidates = [(lo, hi) for lo, hi in candidates if hi >= lo]
        if not candidates:
            continue

        # Pick a range weighted by span
        total = sum(hi - lo for lo, hi in candidates)
        pick = random.random() * total
        chosen_y = None
        for lo, hi in candidates:
            span = hi - lo
            if pick <= span:
                chosen_y = lo + pick
                break
            pick -= span
        if chosen_y is None:
            chosen_y = candidates[-1][0]

        chosen_y = round(chosen_y, 1)
        # Reserve the full width so other obstacles don't land inside
        occupied_xs.append(offset_x)
        occupied_xs.append(offset_x + size // 2)
        occupied_xs.append(offset_x + size)
        return {
            "type": "skyBlocker",
            "offsetX": offset_x,
            "y": chosen_y,
        }

    return None


OBSTACLE_PLACERS = {
    "ground": place_ground_hazard,
    "zapper": place_zapper,
    "zapperBottomOpen": place_bottom_open_zapper,
    "laserStatic": place_static_laser,
    "laserSweep": place_sweep_laser,
    "skyBlocker": place_sky_blocker,
}


def place_obstacles(path, params, elevation=None):
    """Place a random number of obstacles outside the path corridor."""
    count = random.randint(params["obstacle_count_min"],
                           params["obstacle_count_max"])
    elements = []
    occupied_xs = []

    for _ in range(count):
        obs_type = random.choice(params["obstacle_types"])
        placer = OBSTACLE_PLACERS[obs_type]
        elem = placer(path, params, occupied_xs, elevation)
        if elem is not None:
            elements.append(elem)

    # Sort by offsetX for readability
    elements.sort(key=lambda e: e["offsetX"])
    return elements


# ---------------------------------------------------------------------------
# Bird placement
# ---------------------------------------------------------------------------

def place_birds(path, params):
    """Optionally place bird spawn points with dodge width.

    Bird arrival time is deterministic (constant x-speed). The dodgeWidth
    widens the corridor at the bird's offsetX so the player has room to
    dodge vertically when the bird arrives.
    """
    if random.random() >= params["bird_chance"]:
        return []

    section_end = path[-1]["x"]
    bird_count = 1 if random.random() < 0.7 else 2
    birds = []

    for _ in range(bird_count):
        offset_x = random.randint(
            int(section_end * 0.3),
            max(int(section_end * 0.3), int(section_end * 0.8))
        )
        birds.append({
            "offsetX": offset_x,
            "dodgeWidth": BIRD_DODGE_WIDTH,
            "arrivalTimeSec": round(BIRD_ARRIVAL_TIME, 3),
        })

    return birds


# ---------------------------------------------------------------------------
# Elevation generation
# ---------------------------------------------------------------------------

MIN_PLATEAU_TILES = 2  # minimum flat tiles at elevated level before descending

def generate_elevation(params, section_length):
    """Generate a tile-grid elevation profile for the section.

    Returns a list of {"x": int, "level": 0|1} entries at TILE_SIZE intervals.
    Always starts and ends at level 0.  Transitions between levels occupy one
    tile column (the terrain module converts these into slope tiles at runtime).
    Elevated plateaus are held for at least MIN_PLATEAU_TILES before descending.
    """
    chance = params.get("elevation_chance", 0)
    max_elev = params.get("max_elevation", 0)
    if max_elev == 0 or chance <= 0:
        return []

    num_tiles = max(1, section_length // TILE_SIZE)
    levels = [0] * num_tiles
    current = 0
    tiles_at_current = 0

    for i in range(1, num_tiles):
        tiles_remaining = num_tiles - i
        # Reserve room to return to 0 (need 1 slope tile per level)
        if current > 0 and tiles_remaining <= current:
            current -= 1
            tiles_at_current = 0
            levels[i] = current
            continue

        # Don't allow descent until the plateau has been held long enough
        can_descend = current == 0 or tiles_at_current >= MIN_PLATEAU_TILES
        # Need enough room for the plateau + slope down
        can_ascend = (current == 0
                      and tiles_remaining >= MIN_PLATEAU_TILES + 1)

        if random.random() < chance:
            if current == 0 and can_ascend:
                current = 1
                tiles_at_current = 0
            elif current == 1 and can_descend:
                current = 0
                tiles_at_current = 0

        tiles_at_current += 1
        levels[i] = current

    # Force last tile to level 0, then smooth backwards
    levels[-1] = 0
    for i in range(num_tiles - 2, 0, -1):
        if levels[i] > levels[i + 1] + 1:
            levels[i] = levels[i + 1] + 1

    elevation = []
    for i, lv in enumerate(levels):
        elevation.append({"x": i * TILE_SIZE, "level": lv})
    return elevation


def get_ground_y_at_elevation(elevation, offset_x):
    """Return the effective ground Y at a given section-local x, accounting
    for the elevation profile.  Used during obstacle placement."""
    if not elevation:
        return GROUND_Y

    # Find which tile column this x falls in
    tile_idx = int(offset_x) // TILE_SIZE
    if tile_idx < 0:
        tile_idx = 0
    if tile_idx >= len(elevation):
        tile_idx = len(elevation) - 1

    lv = elevation[tile_idx]["level"]

    # Check if this tile is a slope (level differs from neighbour)
    prev_lv = elevation[tile_idx - 1]["level"] if tile_idx > 0 else lv
    next_lv = elevation[tile_idx + 1]["level"] if tile_idx < len(elevation) - 1 else lv

    is_slope = (lv != prev_lv) or (lv != next_lv and tile_idx < len(elevation) - 1
                                    and elevation[tile_idx + 1]["level"] != lv)

    # For slopes, use the higher ground (conservative for hazard clearance)
    if prev_lv != lv:
        effective_lv = max(prev_lv, lv)
    else:
        effective_lv = lv

    return GROUND_Y - effective_lv * TIER_HEIGHT


def is_on_slope(elevation, offset_x):
    """Return True if offset_x falls on a slope transition tile."""
    if not elevation:
        return False
    tile_idx = int(offset_x) // TILE_SIZE
    if tile_idx < 0 or tile_idx >= len(elevation):
        return False
    lv = elevation[tile_idx]["level"]
    prev_lv = elevation[tile_idx - 1]["level"] if tile_idx > 0 else lv
    next_idx = tile_idx + 1
    next_lv = elevation[next_idx]["level"] if next_idx < len(elevation) else lv
    return lv != prev_lv or lv != next_lv


# ---------------------------------------------------------------------------
# Pattern generation
# ---------------------------------------------------------------------------

def generate_pattern(params):
    """Generate a single section pattern."""
    path = generate_path(params)
    section_length = path[-1]["x"]
    elevation = generate_elevation(params, section_length)
    elements = place_obstacles(path, params, elevation)
    birds = place_birds(path, params)

    # Widen the path around bird spawn points so the player has room to dodge.
    # Also remove any obstacles that fall within the dodge zone.
    if birds:
        for bird in birds:
            bx = bird["offsetX"]
            dodge_half = bird["dodgeWidth"] / 2

            # Widen corridor waypoints near the bird encounter
            for wp in path:
                dist = abs(wp["x"] - bx)
                if dist < 120:
                    wp["width"] = max(wp["width"], bird["dodgeWidth"])

            # Remove obstacles that overlap the bird's clear zone
            elements = [
                e for e in elements
                if abs(e["offsetX"] - bx) > dodge_half + 30
            ]

    result = {
        "path": path,
        "elements": elements,
        "birds": birds,
    }
    if elevation:
        result["elevation"] = elevation
    return result


def generate_all():
    """Generate patterns for all tiers."""
    patterns = {}
    for tier, params in TIER_PARAMS.items():
        tier_patterns = []
        for _ in range(params["count"]):
            tier_patterns.append(generate_pattern(params))
        patterns[tier] = tier_patterns
        print(f"  {tier}: {len(tier_patterns)} patterns generated")
    return patterns


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_patterns(patterns):
    """Run basic validation on all generated patterns."""
    issues = 0
    for tier, pats in patterns.items():
        for i, pat in enumerate(pats):
            path = pat["path"]

            # Check path waypoints are monotonically increasing in x
            for j in range(1, len(path)):
                if path[j]["x"] <= path[j - 1]["x"]:
                    print(f"  WARNING: {tier}[{i}] path x not increasing at waypoint {j}")
                    issues += 1

            # Check path y values are in range
            for j, wp in enumerate(path):
                if wp["y"] < 0 or wp["y"] > 1:
                    print(f"  WARNING: {tier}[{i}] path y out of range at waypoint {j}: {wp['y']}")
                    issues += 1

            # Check ground hazards don't overlap corridor (worst-case height)
            for elem in pat["elements"]:
                if elem["type"] == "ground":
                    hazard_top = GROUND_Y - MAX_GROUND_HAZARD_HEIGHT

                    center_y, w = interpolate_path(path, elem["offsetX"])
                    if center_y + w / 2 >= hazard_top:
                        print(f"  WARNING: {tier}[{i}] ground hazard at x={elem['offsetX']} "
                              f"overlaps corridor (bottom={center_y + w/2:.0f}, "
                              f"hazard_top={hazard_top})")
                        issues += 1

                # Check sky blockers don't overlap corridor
                if elem["type"] == "skyBlocker":
                    blocker_y = elem["y"]
                    blocker_bottom = blocker_y + PUFFERFISH_SIZE
                    for sx in range(max(0, elem["offsetX"]), elem["offsetX"] + PUFFERFISH_SIZE + 1,
                                    max(1, PUFFERFISH_SIZE // 6)):
                        center_y, w = interpolate_path(path, sx)
                        ct = center_y - w / 2
                        cb = center_y + w / 2
                        if blocker_bottom > ct and blocker_y < cb:
                            print(f"  WARNING: {tier}[{i}] skyBlocker at x={elem['offsetX']} "
                                  f"y={blocker_y:.0f} overlaps corridor")
                            issues += 1
                            break

                # Check bottom-open zappers don't overlap corridor
                if elem["type"] == "zapperBottomOpen":
                    bar_h = elem["barHeight"]
                    center_y, w = interpolate_path(path, elem["offsetX"])
                    corridor_top = center_y - w / 2
                    if bar_h >= corridor_top:
                        print(f"  WARNING: {tier}[{i}] bottomOpen zapper at x={elem['offsetX']} "
                              f"bar extends into corridor (barH={bar_h}, "
                              f"corridor_top={corridor_top:.0f})")
                        issues += 1

    if issues == 0:
        print("  All patterns passed validation.")
    else:
        print(f"  {issues} issue(s) found.")
    return issues


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # Resolve output path relative to this script's location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    output_path = os.path.join(project_root, "js", "data", "patterns.json")

    print("Generating section patterns...")
    random.seed()  # use system entropy for variety
    patterns = generate_all()

    print("\nValidating...")
    validate_patterns(patterns)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(patterns, f, indent=2)

    print(f"\nWrote {output_path}")
    total = sum(len(v) for v in patterns.values())
    print(f"Total: {total} patterns across {len(patterns)} tiers.")


if __name__ == "__main__":
    main()
