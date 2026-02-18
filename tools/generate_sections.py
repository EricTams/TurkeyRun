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

LASER_BEAM_THICKNESS = 16
LASER_STATIC_WIDTH = 300
LASER_SWEEP_ARC = math.pi * 0.5

PLAYER_HEIGHT = 40  # matches js/config.js PLAYER_HEIGHT
PLAYER_START_X = 100
BIRD_X_SPEED = 380  # constant horizontal speed (must match config.js)

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
        "obstacle_types": ["ground"],
        "ground_types": ["poolNoodle", "sandCastle"],
        "bird_chance": 0.0,
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
        # Laser obstacles removed; medium uses only ground/zapper variants.
        "obstacle_types": ["ground", "ground", "zapper", "zapper", "zapperBottomOpen"],
        "ground_types": ["poolNoodle", "sandCastle"],
        "bird_chance": 0.3,
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
        # Laser obstacles removed; hard uses only ground/zapper variants.
        "obstacle_types": ["ground", "ground", "zapper", "zapper", "zapperBottomOpen"],
        "ground_types": ["poolNoodle", "sandCastle"],
        "bird_chance": 0.5,
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
        # Laser obstacles removed; extreme uses only ground/zapper variants.
        "obstacle_types": ["ground", "ground", "zapper", "zapper", "zapperBottomOpen"],
        "ground_types": ["poolNoodle", "sandCastle"],
        "bird_chance": 0.7,
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

def place_ground_hazard(path, params, occupied_xs):
    """Place a ground hazard at an x that doesn't overlap the corridor at ground level."""
    section_end = path[-1]["x"]
    sub_type = random.choice(params["ground_types"])

    if sub_type == "poolNoodle":
        hw, hh = POOL_NOODLE_WIDTH, POOL_NOODLE_HEIGHT
    else:
        hw, hh = SAND_CASTLE_WIDTH, SAND_CASTLE_HEIGHT

    hazard_top_y = GROUND_Y - hh

    for _ in range(40):
        offset_x = random.randint(20, max(20, int(section_end) - hw))

        # Check this x isn't too close to another obstacle
        if any(abs(offset_x - ox) < 60 for ox in occupied_xs):
            continue

        # Verify the path corridor doesn't overlap the hazard rect.
        # Check every few pixels along the hazard width with a generous buffer.
        buffer = 20  # extra px clearance between corridor and hazard
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


def place_zapper(path, params, occupied_xs):
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


def place_static_laser(path, params, occupied_xs):
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


def place_sweep_laser(path, params, occupied_xs):
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


def place_bottom_open_zapper(path, params, occupied_xs):
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


OBSTACLE_PLACERS = {
    "ground": place_ground_hazard,
    "zapper": place_zapper,
    "zapperBottomOpen": place_bottom_open_zapper,
    "laserStatic": place_static_laser,
    "laserSweep": place_sweep_laser,
}


def place_obstacles(path, params):
    """Place a random number of obstacles outside the path corridor."""
    count = random.randint(params["obstacle_count_min"],
                           params["obstacle_count_max"])
    elements = []
    occupied_xs = []

    for _ in range(count):
        obs_type = random.choice(params["obstacle_types"])
        placer = OBSTACLE_PLACERS[obs_type]
        elem = placer(path, params, occupied_xs)
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
# Pattern generation
# ---------------------------------------------------------------------------

def generate_pattern(params):
    """Generate a single section pattern."""
    path = generate_path(params)
    elements = place_obstacles(path, params)
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

    return {
        "path": path,
        "elements": elements,
        "birds": birds,
    }


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

            # Check ground hazards don't overlap corridor
            for elem in pat["elements"]:
                if elem["type"] == "ground":
                    if elem["subType"] == "poolNoodle":
                        hazard_top = GROUND_Y - POOL_NOODLE_HEIGHT
                    else:
                        hazard_top = GROUND_Y - SAND_CASTLE_HEIGHT

                    center_y, w = interpolate_path(path, elem["offsetX"])
                    if center_y + w / 2 >= hazard_top:
                        print(f"  WARNING: {tier}[{i}] ground hazard at x={elem['offsetX']} "
                              f"overlaps corridor (bottom={center_y + w/2:.0f}, "
                              f"hazard_top={hazard_top})")
                        issues += 1

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
