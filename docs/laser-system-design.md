# Turkey Runner Laser System Design

## Purpose

This document defines the gameplay goals and engineering rules for the laser system so new patterns stay readable, fair, and fun.

It is the source of truth for:

- What lasers are supposed to test (timing, positioning, pattern reading)
- How laser patterns should be authored (keyframes and states)
- What "fair" means for laser encounters
- How to tune difficulty without creating impossible situations

## Design Goals

- **Readable danger:** Every lethal beam is telegraphed before it can kill.
- **Skill expression:** Success comes from timing and positioning, not guesswork.
- **Fair challenge:** Every pattern is survivable with current player physics.
- **Distinct identity:** Laser sections feel different from normal hazard sections.
- **Composable behavior:** Pattern data can express static, moving, and rotating beams.
- **Debuggability:** Patterns are testable in isolation and easy to tune.

## Non-Goals

- Lasers are not meant to be random chaos.
- Lasers are not meant to require pixel-perfect inputs for medium tier.
- Laser patterns should not rely on hidden state or invisible timing tricks.

## Core Gameplay Rules

- Laser patterns are **screen-space puzzles**: laser coordinates are in viewport space.
- During laser sections, normal hazard pressure should be reduced or paused.
- A beam can be in one of three states:
  - `off`: invisible, non-lethal
  - `warn`: visible warning only, non-lethal
  - `active`: visible and lethal
- State changes should be visually obvious at a glance.
- **Global timing constraint:** every `active` onset must be preceded by exactly `1.0s` of `warn`.
  - If authored warning is longer than needed, the extra time is treated as `off`.
  - `off` still renders endpoint emitters for motion readability.

## Fairness Constraints

- **Telegraph first:** Players should have warning before first lethal contact on a new cycle.
- **No trap starts:** Pattern entry should not spawn the player inside an unavoidable active beam.
- **Recoverability:** After a dodge, there should be enough time/space to recover control.
- **Tier scaling:**
  - Medium: broad safe lanes, forgiving timing
  - Hard: tighter windows, dual-threat tracking
  - Extreme: sustained pressure and overlap, but still survivable
- **Center pressure limits:** Continuous center danger is acceptable only if alternate lanes remain available.

## Authoring Contract (Data Layer)

Patterns in `js/data/laserPatterns.js` follow this structure:

- Pattern:
  - `id`, `name`, `tier`, `duration`, `lasers[]`
- Laser:
  - `loop` (default true)
  - `keyframes[]`
- Keyframe:
  - `t` (seconds)
  - `x1`, `y1`, `x2`, `y2` (beam endpoints)
  - `state` in `off | warn | active`

Interpolation is linear between keyframes for endpoint coordinates.  
State is sampled from the current segment start keyframe.

## Pattern Design Language

When designing a laser pattern, define:

- **Shape:** line orientation and movement path
- **Rhythm:** cycle duration and on/off cadence
- **Threat model:** what player skill it tests (timing, tracking, commitment)
- **Safe strategy:** where the player should generally move to survive

## Canonical H4 Spec (Current Direction)

H4 is the reference pattern for rotating-cross behavior.

- **Name:** `H4: Orbit Cross`
- **Concept:** Two beams whose endpoints move along a square edge at constant speed.
- **Geometry:**
  - Endpoints stay opposite on perimeter (half-turn apart), so each beam crosses square center.
  - Laser A and Laser B are quarter-turn phase shifted.
  - Square left edge sits on-screen (`x=80`) to align danger with the player lane while keeping full shape readability.
- **Activation model:**
  - Each beam has two fire windows per full orbit (one per endpoint bottom-left pass).
  - In each window, beam turns `active` near 80% along the bottom edge while moving left.
  - In each window, beam turns `off` around 80% up the left edge while moving up.
  - In `off`, endpoints remain visible so anchor motion is still readable.
- **Difficulty intent:**
  - Overlapping active windows create sustained center danger.
  - Pattern should still leave practical dodge routes above/below crossing lanes.

## Tuning Guidelines

- Adjust challenge in this order:
  1. Active window length
  2. Cycle speed
  3. Spatial alignment (left/right placement)
  4. Phase offset between beams
- Avoid increasing all four at once.
- For medium tier, prefer slower cycles over narrower lanes.
- For hard/extreme, overlap and phase pressure are preferred over "instant snap" surprises.

## Visual and Feedback Standards

- Warning beams use dashed/thin styling and pulsing alpha.
- Active beams use thicker glow/core rendering.
- Endpoint emitters should remain visible to communicate pivot/motion anchors.

## Test Checklist for Any New Laser Pattern

- Can a first-time player identify where danger will be in under 2 seconds?
- Is there at least one reliable survival strategy that does not require luck?
- Does the pattern remain survivable at the player's lane (`x ~= 100`)?
- Are transitions between `warn` and `active` visually unmistakable?
- Does debug test mode allow full-cycle observation and tuning?

## Implementation Notes

- Primary files:
  - `js/data/laserPatterns.js` (pattern definitions)
  - `js/laserPattern.js` (sampling, collision, rendering)
  - `js/config.js` (timing and debug flags)
- Keep gameplay intent comments near each pattern definition.
- If a behavior feels "impossible," reduce overlap duration first before reducing visual complexity.
