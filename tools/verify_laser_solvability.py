#!/usr/bin/env python3
"""
Offline laser pattern solvability checker.

Tracks reachable Y positions at the player column over time to determine
if a pattern is survivable. Optionally writes timeline images (PPM).

Usage:
    python tools/verify_laser_solvability.py
    python tools/verify_laser_solvability.py --pattern M2
    python tools/verify_laser_solvability.py --image-dir debug/laser_solvability
"""

from __future__ import annotations

import argparse
import math
import os
import sys
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Game constants (must match js/config.js)
# ---------------------------------------------------------------------------

CANVAS_WIDTH = 800
GROUND_Y = 400
PLAYER_HEIGHT = 40
PLAYER_WIDTH = 36
PLAYER_START_X = 100
LASER_BEAM_THICKNESS = 16
TERMINAL_VEL_UP = 380
TERMINAL_VEL_DOWN = 450

EPS = 1e-6

# ---------------------------------------------------------------------------
# Pattern generation helpers (ported from js/data/laserPatterns.js)
# ---------------------------------------------------------------------------

def h_beam(t: float, y: float, state: str) -> Dict:
    return {"t": t, "x1": 0, "y1": y, "x2": CANVAS_WIDTH, "y2": y, "state": state}


def arc_sweep(pivot_x, pivot_y, length, t_start, t_end, angle_start, angle_end, num_steps, state):
    kf = []
    for i in range(num_steps + 1):
        frac = i / num_steps
        t = t_start + (t_end - t_start) * frac
        a = angle_start + (angle_end - angle_start) * frac
        kf.append({
            "t": t,
            "x1": pivot_x, "y1": pivot_y,
            "x2": pivot_x + length * math.cos(a),
            "y2": pivot_y + length * math.sin(a),
            "state": state,
        })
    return kf


# ---------------------------------------------------------------------------
# M1: The Sweep
# ---------------------------------------------------------------------------

def build_m1():
    return {
        "id": "H3", "name": "H3: Sky Lanes", "tier": "hard",
        "duration": 11.0,
        "lasers": [{"loop": True, "keyframes": [
            h_beam(0.00, GROUND_Y, "warn"),
            h_beam(1.50, 200,      "active"),
            h_beam(2.75, 0,        "warn"),
            h_beam(4.25, 200,      "active"),
            h_beam(5.50, GROUND_Y, "warn"),
        ]}],
    }


# ---------------------------------------------------------------------------
# M2: Crossing Edges
# ---------------------------------------------------------------------------

M2_SQ_LEFT = 80
M2_SQ_TOP = 0
M2_SQ_SIZE = GROUND_Y
M2_CYCLE = 10.0
M2_ACTIVE_START = 0.70
M2_ACTIVE_END = 0.95
M2_SAMPLES = 40

M2_ACTIVE_WINDOWS = [
    {"start": M2_ACTIVE_START, "end": M2_ACTIVE_END},
    {"start": (M2_ACTIVE_START + 0.5) % 1, "end": (M2_ACTIVE_END + 0.5) % 1},
]


def square_edge_point(p):
    turn = ((p % 1) + 1) % 1
    q = turn * 4
    left = M2_SQ_LEFT
    top = M2_SQ_TOP
    right = M2_SQ_LEFT + M2_SQ_SIZE
    bottom = M2_SQ_TOP + M2_SQ_SIZE

    if q < 1:
        return (left + M2_SQ_SIZE * q, top)
    if q < 2:
        return (right, top + M2_SQ_SIZE * (q - 1))
    if q < 3:
        return (right - M2_SQ_SIZE * (q - 2), bottom)
    return (left, bottom - M2_SQ_SIZE * (q - 3))


def is_in_wrapped_window(p, start, end):
    if start <= end:
        return p >= start and p < end
    return p >= start or p < end


def is_in_any_active_window(p):
    for w in M2_ACTIVE_WINDOWS:
        if is_in_wrapped_window(p, w["start"], w["end"]):
            return True
    return False


def build_m2_square_orbit_keyframes(phase_offset):
    times = {0.0, M2_CYCLE}
    for w in M2_ACTIVE_WINDOWS:
        ts = (((w["start"] - phase_offset) % 1) + 1) % 1 * M2_CYCLE
        te = (((w["end"] - phase_offset) % 1) + 1) % 1 * M2_CYCLE
        times.add(ts)
        times.add(te)
    for i in range(1, M2_SAMPLES):
        times.add((i / M2_SAMPLES) * M2_CYCLE)

    sorted_times = sorted(times)
    kf = []
    for t in sorted_times:
        p = ((t / M2_CYCLE) + phase_offset) % 1
        ax, ay = square_edge_point(p)
        bx, by = square_edge_point((p + 0.5) % 1)
        state = "active" if is_in_any_active_window(p) else "off"
        kf.append({"t": t, "x1": ax, "y1": ay, "x2": bx, "y2": by, "state": state})
    return kf


def build_m2():
    return {
        "id": "H4", "name": "H4: Orbit Cross", "tier": "hard",
        "duration": 12.0,
        "lasers": [
            {"loop": True, "keyframes": build_m2_square_orbit_keyframes(0.00)},
            {"loop": True, "keyframes": build_m2_square_orbit_keyframes(0.25)},
        ],
    }


# ---------------------------------------------------------------------------
# Path-first helpers
# ---------------------------------------------------------------------------

def build_corridor_beam_keyframes(waypoints, gap, side, cycle_duration):
    side_sign = -1 if side == "top" else 1

    def y_for_center(center_y):
        return center_y + side_sign * gap * 0.5

    first = waypoints[0]
    last = waypoints[-1]
    keyframes = [
        h_beam(0.0, y_for_center(first["center_y"]), "off"),
        h_beam(first["t"], y_for_center(first["center_y"]), "active"),
    ]
    keyframes += [h_beam(w["t"], y_for_center(w["center_y"]), "active") for w in waypoints[1:]]
    keyframes += [
        h_beam(last["t"], y_for_center(last["center_y"]), "off"),
        h_beam(cycle_duration, y_for_center(first["center_y"]), "off"),
    ]
    return keyframes


def build_corridor_pattern(pattern_id, name, tier, duration, cycle_duration, gap, waypoints):
    return {
        "id": pattern_id,
        "name": name,
        "tier": tier,
        "duration": duration,
        "lasers": [
            {"loop": True, "keyframes": build_corridor_beam_keyframes(waypoints, gap, "top", cycle_duration)},
            {"loop": True, "keyframes": build_corridor_beam_keyframes(waypoints, gap, "bottom", cycle_duration)},
        ],
    }


def is_in_window(t, window):
    return t >= window["start"] and t < window["end"]


def pulse_state_at(t, windows):
    for window in windows:
        if is_in_window(t, window):
            return "active"
    return "off"


def build_pulse_beam_keyframes(y, windows, cycle_duration):
    times = {0.0, cycle_duration}
    for window in windows:
        times.add(window["start"])
        times.add(window["end"])
    return [h_beam(t, y, pulse_state_at(t, windows)) for t in sorted(times)]


def build_timed_gate_pattern(pattern_id, name, tier, duration, cycle_duration, beams):
    return {
        "id": pattern_id,
        "name": name,
        "tier": tier,
        "duration": duration,
        "lasers": [
            {"loop": True, "keyframes": build_pulse_beam_keyframes(beam["y"], beam["windows"], cycle_duration)}
            for beam in beams
        ],
    }


def build_sine_waypoints(start_t, end_t, samples, center_y, amplitude, period):
    waypoints = []
    for i in range(samples + 1):
        frac = i / samples
        t = start_t + (end_t - start_t) * frac
        phase = (t - start_t) / period
        waypoints.append({
            "t": t,
            "center_y": center_y + amplitude * math.sin(phase * math.pi * 2),
        })
    return waypoints


def build_down_up_sine_waypoints(start_t, end_t, samples, center_y, wave_amplitude, wave_period, trend_amplitude):
    waypoints = []
    for i in range(samples + 1):
        frac = i / samples
        t = start_t + (end_t - start_t) * frac
        wave_phase = ((t - start_t) / wave_period) * math.pi * 2
        wave = wave_amplitude * math.sin(wave_phase)
        # Down then up over one cycle: 0 -> +trend_amplitude -> 0.
        trend = trend_amplitude * (1 - math.cos(frac * math.pi * 2)) * 0.5
        waypoints.append({
            "t": t,
            "center_y": center_y + trend + wave,
        })
    return waypoints


# ---------------------------------------------------------------------------
# H1: Ribbon Ride (gentle curved lane)
# ---------------------------------------------------------------------------

def build_h1():
    return build_corridor_pattern(
        pattern_id="H1",
        name="H1: Serpent Run",
        tier="hard",
        duration=12.0,
        cycle_duration=6.0,
        gap=204,
        waypoints=build_sine_waypoints(1.0, 5.0, 20, 200, 74, 4.4),
    )


# ---------------------------------------------------------------------------
# H2: Double Curl (deeper curved lane)
# ---------------------------------------------------------------------------

def build_h2():
    waypoints = build_sine_waypoints(1.0, 5.0, 24, 200, 52, 2.6)
    return {
        "id": "H2",
        "name": "H2: Twin Arcs",
        "tier": "hard",
        "duration": 12.0,
        "lasers": [
            {"loop": True, "keyframes": build_corridor_beam_keyframes(waypoints, 160, "top", 6.0)},
            {"loop": True, "keyframes": build_corridor_beam_keyframes(waypoints, 160, "bottom", 6.0)},
            {"loop": True, "keyframes": build_corridor_beam_keyframes(waypoints, 300, "top", 6.0)},
            {"loop": True, "keyframes": build_corridor_beam_keyframes(waypoints, 300, "bottom", 6.0)},
        ],
    }


# ---------------------------------------------------------------------------
# X1: Wave Riptide (moving safe path)
# ---------------------------------------------------------------------------

def build_x1():
    waypoints = build_down_up_sine_waypoints(
        start_t=1.0,
        end_t=5.2,
        samples=28,
        center_y=170,
        wave_amplitude=36,
        wave_period=2.2,
        trend_amplitude=66,
    )
    return {
        "id": "X1",
        "name": "X1: Cyclone Ribbon",
        "tier": "extreme",
        "duration": 12.0,
        "lasers": [
            {"loop": True, "keyframes": build_corridor_beam_keyframes(waypoints, 152, "top", 6.0)},
            {"loop": True, "keyframes": build_corridor_beam_keyframes(waypoints, 152, "bottom", 6.0)},
            {"loop": True, "keyframes": build_corridor_beam_keyframes(waypoints, 286, "top", 6.0)},
            {"loop": True, "keyframes": build_corridor_beam_keyframes(waypoints, 286, "bottom", 6.0)},
        ],
    }


def build_x2():
    return build_timed_gate_pattern(
        pattern_id="X2",
        name="X2: Pulse Matrix",
        tier="extreme",
        duration=7.2,
        cycle_duration=7.2,
        beams=[
            {"y": 80, "windows": [{"start": 1.0, "end": 1.8}, {"start": 4.6, "end": 5.4}]},
            {"y": 140, "windows": [{"start": 2.4, "end": 3.2}, {"start": 6.0, "end": 6.8}]},
            {"y": 200, "windows": [{"start": 1.0, "end": 1.8}, {"start": 4.6, "end": 5.4}]},
            {"y": 260, "windows": [{"start": 2.4, "end": 3.2}, {"start": 6.0, "end": 6.8}]},
            {"y": 320, "windows": [{"start": 1.0, "end": 1.8}, {"start": 4.6, "end": 5.4}]},
        ],
    )


# ---------------------------------------------------------------------------
# X3: Gap Shift Matrix
# Six-laser extreme with forced adjacent gap sequence.
# ---------------------------------------------------------------------------

X3_ROWS_A = [40, 85, 130, 270, 315, 360]  # gap 3-4
X3_ROWS_B = [40, 85, 225, 270, 315, 360]  # gap 2-3
X3_ROWS_C = [40, 85, 130, 175, 315, 360]  # gap 4-5
X3_ROWS_D = [40, 180, 225, 270, 315, 360]  # gap 1-2
X3_ROWS_E = [40, 85, 130, 175, 220, 360]  # gap 5-6
X3_EVENTS = [
    {"t": 0.0, "rows": X3_ROWS_A, "state": "off"},
    {"t": 1.0, "rows": X3_ROWS_A, "state": "active"},  # gap 3-4
    {"t": 1.8, "rows": X3_ROWS_A, "state": "off"},
    {"t": 2.6, "rows": X3_ROWS_B, "state": "active"},  # gap 2-3
    {"t": 3.4, "rows": X3_ROWS_B, "state": "off"},
    {"t": 4.2, "rows": X3_ROWS_C, "state": "active"},  # gap 4-5
    {"t": 5.0, "rows": X3_ROWS_C, "state": "off"},
    {"t": 5.8, "rows": X3_ROWS_D, "state": "active"},  # gap 1-2
    {"t": 6.6, "rows": X3_ROWS_D, "state": "off"},
    {"t": 7.4, "rows": X3_ROWS_E, "state": "active"},  # gap 5-6
    {"t": 8.2, "rows": X3_ROWS_E, "state": "off"},
    {"t": 9.0, "rows": X3_ROWS_A, "state": "active"},  # return to gap 3-4
    {"t": 9.8, "rows": X3_ROWS_A, "state": "off"},
    {"t": 10.4, "rows": X3_ROWS_A, "state": "off"},
]


def build_x3_gap_shift_keyframes(laser_index):
    return [h_beam(event["t"], event["rows"][laser_index], event["state"]) for event in X3_EVENTS]


def build_x3():
    return {
        "id": "X3",
        "name": "X3: Gap Shift Matrix",
        "tier": "extreme",
        "duration": 10.4,
        "lasers": [
            {"loop": True, "keyframes": build_x3_gap_shift_keyframes(i)}
            for i in range(6)
        ],
    }


def build_m3():
    return build_corridor_pattern(
        pattern_id="M1",
        name="M1: Breezy Bend",
        tier="medium",
        duration=12.0,
        cycle_duration=6.5,
        gap=232,
        waypoints=build_sine_waypoints(1.0, 5.4, 20, 205, 66, 3.4),
    )


def build_m4():
    return build_timed_gate_pattern(
        pattern_id="M2",
        name="M2: Easy Beat",
        tier="medium",
        duration=12.0,
        cycle_duration=6.5,
        beams=[
            {"y": 130, "windows": [{"start": 1.1, "end": 1.9}, {"start": 4.2, "end": 5.0}]},
            {"y": 270, "windows": [{"start": 2.2, "end": 3.0}, {"start": 5.2, "end": 6.0}]},
        ],
    )


def build_all_patterns():
    return [
        build_m3(),
        build_m4(),
        build_h1(),
        build_h2(),
        build_m1(),
        build_m2(),
        build_x1(),
        build_x2(),
        build_x3(),
    ]


# ---------------------------------------------------------------------------
# Simulation config
# ---------------------------------------------------------------------------

@dataclass
class SimConfig:
    ground_y: float = GROUND_Y
    player_height: float = PLAYER_HEIGHT
    player_width: float = PLAYER_WIDTH
    player_col_x: float = PLAYER_START_X + PLAYER_WIDTH / 2.0
    laser_beam_thickness: float = LASER_BEAM_THICKNESS
    terminal_vel_up: float = TERMINAL_VEL_UP
    terminal_vel_down: float = TERMINAL_VEL_DOWN


# ---------------------------------------------------------------------------
# Keyframe sampling
# ---------------------------------------------------------------------------

def sample_laser(keyframes, elapsed, loop):
    n = len(keyframes)
    if n == 0:
        return None
    last_t = float(keyframes[-1]["t"])
    t = elapsed
    if loop and last_t > 0:
        t = elapsed % last_t
    if t <= float(keyframes[0]["t"]):
        return keyframes[0]
    if t >= last_t:
        return keyframes[-1]

    i = 0
    while i < n - 1 and float(keyframes[i + 1]["t"]) <= t:
        i += 1
    a = keyframes[i]
    b = keyframes[i + 1]
    seg = float(b["t"]) - float(a["t"])
    frac = (t - float(a["t"])) / seg if seg > 0 else 0.0
    return {
        "x1": float(a["x1"]) + (float(b["x1"]) - float(a["x1"])) * frac,
        "y1": float(a["y1"]) + (float(b["y1"]) - float(a["y1"])) * frac,
        "x2": float(a["x2"]) + (float(b["x2"]) - float(a["x2"])) * frac,
        "y2": float(a["y2"]) + (float(b["y2"]) - float(a["y2"])) * frac,
        "state": a["state"],
    }


# ---------------------------------------------------------------------------
# Blocked interval at player column
# ---------------------------------------------------------------------------

def blocked_interval_at_column(sample, cfg):
    x1, y1 = float(sample["x1"]), float(sample["y1"])
    x2, y2 = float(sample["x2"]), float(sample["y2"])
    dx, dy = x2 - x1, y2 - y1
    half_danger_y = cfg.laser_beam_thickness / 2 + cfg.player_height / 2

    if abs(dx) < EPS:
        half_danger_x = cfg.laser_beam_thickness / 2 + cfg.player_width / 2
        if abs(cfg.player_col_x - x1) > half_danger_x:
            return None
        lo = min(y1, y2) - half_danger_y
        hi = max(y1, y2) + half_danger_y
        return (lo, hi)

    frac = (cfg.player_col_x - x1) / dx
    if frac < 0 or frac > 1:
        return None
    y_at_col = y1 + dy * frac
    return (y_at_col - half_danger_y, y_at_col + half_danger_y)


def merge_intervals(intervals):
    if not intervals:
        return []
    intervals = sorted(intervals, key=lambda p: p[0])
    out = [list(intervals[0])]
    for lo, hi in intervals[1:]:
        prev = out[-1]
        if lo <= prev[1]:
            prev[1] = max(prev[1], hi)
        else:
            out.append([lo, hi])
    return out


# ---------------------------------------------------------------------------
# Compute safe rows at a moment in time
# ---------------------------------------------------------------------------

def compute_safe_rows(pattern, t, cfg, grid_min_y, grid_max_y):
    safe = [False] * (grid_max_y + 1)
    for y in range(grid_min_y, grid_max_y + 1):
        safe[y] = True

    intervals = []
    for laser in pattern["lasers"]:
        s = sample_laser(laser["keyframes"], t, laser.get("loop", True))
        if not s or s.get("state") != "active":
            continue
        blocked = blocked_interval_at_column(s, cfg)
        if blocked is not None:
            intervals.append(blocked)

    for lo_raw, hi_raw in merge_intervals(intervals):
        lo = max(grid_min_y, min(grid_max_y, int(math.ceil(lo_raw))))
        hi = max(grid_min_y, min(grid_max_y, int(math.floor(hi_raw))))
        if hi < lo:
            continue
        for y in range(lo, hi + 1):
            safe[y] = False
    return safe


def count_true(arr, lo, hi):
    return sum(1 for i in range(lo, hi + 1) if arr[i])


# ---------------------------------------------------------------------------
# Pattern result
# ---------------------------------------------------------------------------

@dataclass
class PatternResult:
    pattern_id: str
    name: str
    duration: float
    first_frontier_empty_time: Optional[float]
    min_reachable_count: int
    min_safe_count: int
    final_reachable_count: int
    final_safe_count: int
    safe_timeline: Optional[List[List[bool]]] = None
    reachable_timeline: Optional[List[List[bool]]] = None
    grid_min_y: int = 0
    grid_max_y: int = 0

    @property
    def solvable(self) -> bool:
        return self.first_frontier_empty_time is None


# ---------------------------------------------------------------------------
# Analyze a single pattern
# ---------------------------------------------------------------------------

def analyze_pattern(pattern, cfg, dt, collect_timeline=False):
    grid_min_y = int(math.ceil(cfg.player_height / 2))
    grid_max_y = int(math.floor(cfg.ground_y - cfg.player_height / 2))
    duration = float(pattern["duration"])

    safe0 = compute_safe_rows(pattern, 0.0, cfg, grid_min_y, grid_max_y)
    reachable = safe0[:]

    safe_timeline = [safe0[:]] if collect_timeline else None
    reachable_timeline = [reachable[:]] if collect_timeline else None

    t = 0.0
    first_frontier_empty_time = None
    min_reachable_count = count_true(reachable, grid_min_y, grid_max_y)
    min_safe_count = min_reachable_count

    up_step = cfg.terminal_vel_up * dt
    down_step = cfg.terminal_vel_down * dt

    while t + dt <= duration + EPS:
        t += dt
        safe = compute_safe_rows(pattern, t, cfg, grid_min_y, grid_max_y)
        candidate = [False] * (grid_max_y + 1)

        for y in range(grid_min_y, grid_max_y + 1):
            if not reachable[y]:
                continue
            lo = max(grid_min_y, min(grid_max_y, int(math.floor(y - up_step))))
            hi = max(grid_min_y, min(grid_max_y, int(math.ceil(y + down_step))))
            for yy in range(lo, hi + 1):
                candidate[yy] = True

        for y in range(grid_min_y, grid_max_y + 1):
            reachable[y] = candidate[y] and safe[y]

        safe_count = count_true(safe, grid_min_y, grid_max_y)
        reachable_count = count_true(reachable, grid_min_y, grid_max_y)
        min_safe_count = min(min_safe_count, safe_count)
        min_reachable_count = min(min_reachable_count, reachable_count)
        if reachable_count == 0 and first_frontier_empty_time is None:
            first_frontier_empty_time = t

        if collect_timeline:
            safe_timeline.append(safe[:])
            reachable_timeline.append(reachable[:])

    final_safe_count = count_true(
        compute_safe_rows(pattern, duration, cfg, grid_min_y, grid_max_y),
        grid_min_y, grid_max_y,
    )
    final_reachable_count = count_true(reachable, grid_min_y, grid_max_y)

    return PatternResult(
        pattern_id=pattern.get("id", "unknown"),
        name=pattern.get("name", pattern.get("id", "unknown")),
        duration=duration,
        first_frontier_empty_time=first_frontier_empty_time,
        min_reachable_count=min_reachable_count,
        min_safe_count=min_safe_count,
        final_reachable_count=final_reachable_count,
        final_safe_count=final_safe_count,
        safe_timeline=safe_timeline,
        reachable_timeline=reachable_timeline,
        grid_min_y=grid_min_y,
        grid_max_y=grid_max_y,
    )


# ---------------------------------------------------------------------------
# Image output (PPM — no external dependencies)
# ---------------------------------------------------------------------------

def sanitize_filename(name):
    out = []
    for ch in name:
        if ch.isalnum() or ch in ("-", "_"):
            out.append(ch)
        elif ch.isspace():
            out.append("_")
    return "".join(out).strip("_") or "pattern"


import struct

def write_bmp(path, width, height, pixels_rgb):
    """Write a 24-bit BMP file. pixels_rgb is row-major top-to-bottom RGB bytes."""
    row_data_size = width * 3
    row_padding = (4 - (row_data_size % 4)) % 4
    padded_row_size = row_data_size + row_padding
    pixel_data_size = padded_row_size * height

    file_size = 54 + pixel_data_size

    with open(path, "wb") as f:
        # File header (14 bytes)
        f.write(b"BM")
        f.write(struct.pack("<I", file_size))
        f.write(struct.pack("<HH", 0, 0))
        f.write(struct.pack("<I", 54))

        # DIB header (40 bytes — BITMAPINFOHEADER)
        f.write(struct.pack("<I", 40))
        f.write(struct.pack("<i", width))
        f.write(struct.pack("<i", -height))  # negative = top-down row order
        f.write(struct.pack("<HH", 1, 24))
        f.write(struct.pack("<I", 0))        # no compression
        f.write(struct.pack("<I", pixel_data_size))
        f.write(struct.pack("<i", 2835))     # ~72 DPI horizontal
        f.write(struct.pack("<i", 2835))     # ~72 DPI vertical
        f.write(struct.pack("<I", 0))
        f.write(struct.pack("<I", 0))

        # Pixel data (BMP stores BGR)
        pad = b"\x00" * row_padding
        for row in range(height):
            row_start = row * width * 3
            for col in range(width):
                idx = row_start + col * 3
                r, g, b = pixels_rgb[idx], pixels_rgb[idx + 1], pixels_rgb[idx + 2]
                f.write(bytes([b, g, r]))
            if row_padding:
                f.write(pad)


def render_pattern_timeline_image(result, out_dir):
    if not result.safe_timeline or not result.reachable_timeline:
        return None

    width = len(result.safe_timeline)
    height = result.grid_max_y - result.grid_min_y + 1
    if width <= 0 or height <= 0:
        return None

    blocked_color = (50, 0, 0)
    safe_unreachable_color = (220, 180, 0)
    safe_reachable_color = (50, 255, 80)

    pixels = bytearray(width * height * 3)
    for x in range(width):
        safe_col = result.safe_timeline[x]
        reach_col = result.reachable_timeline[x]
        for iy, y in enumerate(range(result.grid_min_y, result.grid_max_y + 1)):
            idx = (iy * width + x) * 3
            if not safe_col[y]:
                r, g, b = blocked_color
            elif reach_col[y]:
                r, g, b = safe_reachable_color
            else:
                r, g, b = safe_unreachable_color
            pixels[idx] = r
            pixels[idx + 1] = g
            pixels[idx + 2] = b

    os.makedirs(out_dir, exist_ok=True)
    base = sanitize_filename("{}_{}".format(result.pattern_id, result.name))
    out_path = os.path.join(out_dir, "{}.bmp".format(base))
    write_bmp(out_path, width, height, bytes(pixels))
    return out_path


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def print_report(results, strict):
    print("Laser Solvability Report")
    print("========================")
    unsolved = 0

    for r in results:
        status = "PASS" if r.solvable else "FAIL"
        if not r.solvable:
            unsolved += 1
        print(
            "[{}] {:<3} {} | minReachable={}, minSafe={}, finalReachable={}/{}".format(
                status, r.pattern_id, r.name,
                r.min_reachable_count, r.min_safe_count,
                r.final_reachable_count, r.final_safe_count,
            )
        )
        if r.first_frontier_empty_time is not None:
            print("       frontier empty at t={:.3f}s".format(r.first_frontier_empty_time))

    print("------------------------")
    print("Patterns checked: {}".format(len(results)))
    print("Unsolved (frontier empties): {}".format(unsolved))

    if strict and unsolved > 0:
        return 2
    return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Offline laser solvability checker")
    parser.add_argument("--pattern", help="Only check one pattern ID (e.g. M2)")
    parser.add_argument("--dt", type=float, default=1.0 / 60.0, help="Simulation step in seconds")
    parser.add_argument("--strict", action="store_true", help="Exit non-zero if any pattern fails")
    parser.add_argument("--image-dir", help="Output directory for timeline images (PPM)")
    args = parser.parse_args()

    if args.dt <= 0:
        print("ERROR: --dt must be > 0", file=sys.stderr)
        return 1

    cfg = SimConfig()
    patterns = build_all_patterns()

    if args.pattern:
        patterns = [p for p in patterns if p.get("id") == args.pattern]
        if not patterns:
            print("ERROR: Pattern '{}' not found.".format(args.pattern), file=sys.stderr)
            return 1

    collect_timeline = bool(args.image_dir)
    results = [analyze_pattern(p, cfg, args.dt, collect_timeline=collect_timeline) for p in patterns]

    rc = print_report(results, strict=args.strict)

    if args.image_dir:
        print("\nTimeline Images")
        print("---------------")
        for r in results:
            path = render_pattern_timeline_image(r, args.image_dir)
            if path:
                print("{}: {}".format(r.pattern_id, path))
        print("\nColor key: green=reachable safe, yellow=safe but unreachable, dark-red=blocked")

    return rc


if __name__ == "__main__":
    raise SystemExit(main())
