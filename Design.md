Turkey Runner - Game Design Document

Core Concept

Auto-running action game where a turkey ascends from beach to space, eating food and dodging hazards. Inspired by Jetpack Joyride's movement and meta-progression systems.



Movement System

Core Mechanics



Auto-run: Turkey moves forward at constant speed (scrolling level)

Player control: Vertical movement ONLY

Input: Tap/hold to RISE, release to FALL

Physics:



Acceleration upward when thrusting

Acceleration downward when falling (gravity)

Terminal velocity in both directions

Momentum-based (can't instantly stop vertical movement)







Player Skill Expression



Timing taps to thread through gaps in obstacles

Managing momentum to avoid ceiling/floor

Predicting obstacle patterns ahead

Quick reactions to sudden hazards

Choosing safe path vs. risky food-rich path





Hazard Types

1\. Iguanas (Ground Hazard)



Walk/sunbathe on the ground

Instant kill on contact

Forces player to stay airborne

Different behaviors per biome possible



2\. Birds (Homing Missiles)



Predatory birds (hawks, eagles, seagulls based on biome)

Spawn from off-screen with warning indicator

Track player's position (homing behavior)

Travel at fixed speed

Can come in volleys (multiple at once)

Force evasive maneuvering



3\. Zappers (Static Barriers)



Vertical or horizontal energy barriers

Always on - no timing element

Static position - never move

Instant kill on contact

Create spatial puzzles (gaps to navigate)

Can be skinned per biome while staying functionally identical



Common Patterns:



Single zappers creating gaps

Pairs (top + bottom) creating squeeze points

Sequences creating weaving patterns

Grids creating maze-like obstacles



4\. Lasers (Telegraphed Beams)



Two-phase system:



Warning phase (1-2 seconds): Thin red line appears, safe to touch

Active phase: Warning becomes deadly beam, instant kill





Cycle repeats: Warning → Active → Off → Repeat

Can be horizontal, vertical, or diagonal

Can be static or sweeping (rotating)



Timing Parameters:



Warning duration (how long before firing)

Active duration (how long beam stays deadly)

Cycle speed (how fast the pattern repeats)

Pattern synchronization (multiple lasers in-sync, staggered, or random)



Player Timing Control:



Position vertically in safe zones to wait

Predict when you'll cross the laser's path

Choose route (high/low) to determine which gap to take

Manage momentum to hit the safe window





Hazard Design Principles

Telegraphing



Everything gives visual warning before becoming dangerous

Red = danger color consistently

Birds have directional indicators before appearing

Lasers show warning line first



Pattern Mixing



Hazards combine to create complex challenges

Example: Laser grid forces you low + bird from behind = timing puzzle

Example: Zappers create maze + sweeping laser = position + timing



Escalation



Early game: Single hazards, wide gaps

Mid game: Combined hazards, tighter spaces

Late game: Dense patterns, multiple simultaneous threats, faster birds



Fairness



Always physically possible to dodge

Player death should feel like their mistake

Clear visual communication





Level Generation

Procedural System (Recommended)



Not hand-designed levels

Obstacles randomly placed from a pool of pre-made patterns/chunks

Difficulty increases with distance:



More obstacles appear

Tighter gaps between hazards

Faster-moving birds

More complex laser patterns

Higher density overall







Pattern Pool System



Pre-made obstacle configurations ("chunks")

Chunks categorized by difficulty

Random selection from difficulty-appropriate pool

Ensures all patterns are beatable



Benefits



Infinite replayability

Smooth difficulty curve

Always fair (patterns tested)

Players can't memorize routes

Less content creation required





Biome Progression

Vertical Ascent Through Environments:



Beach → 2. Grasslands → 3. Hills → 4. Mountains → 5. Space



Per-Biome Design



Each biome has its own obstacle pool

Difficulty ramps within each biome

Biome transitions = visual change + new hazard types introduction

Hazard reskins (zappers/lasers maintain function but change aesthetic)

New enemy variants (different bird types, iguana behaviors)





Collectibles \& Scoring

Food (Primary Collectible)



Function: Points/currency only (NOT fuel)

Flight is unlimited/always available

Scattered throughout level in patterns

Optional but rewarding

Creates risk/reward decisions



Collection Strategy



Safe path = fewer coins

Risky path = more coins

Player chooses their own risk tolerance



Economy

Coins Per Run:



Short run (~500m): 100-300 coins

Medium run (~1500m): 500-1000 coins

Good run (~3000m+): 1000-2000+ coins



Upgrade Costs:



Cheap upgrades: 250-1,000 coins (unlock quickly)

Mid-tier: 2,500-10,000 coins (3-5 runs to save)

Expensive: 25,000-100,000+ coins (long-term goals)



Design Goal: Each run should feel like meaningful progress toward something



Meta Progression

Primary Movement System (8-10 Variants)

Different movement types with unique physics (equivalent to Jetpack variants)



Each costs coins to unlock

Can switch between runs

Examples: different rise/fall rates, special movement effects



Gadgets (Equip 2 Simultaneously)

Permanent passive bonuses:



Magnet: Increases collection radius for food

Extra Lives: Start with 1-3 bonus lives

Starting Shield: Temporary invincibility at spawn

Starting Boost: Momentum launch forward at start

Currency Multiplier: Food worth more points

Free Spin Tokens: Bonus slot machine spins

Hazard Jammer: Some hazards auto-avoid you

Early Warning: Hazards telegraph earlier/clearer



Temporary Vehicles (4-5 Types)

Random spawns during run:



Unique movement/abilities per type

Invincible while riding

Limited duration

Duration Upgrades: Make vehicles last longer (permanent upgrade)



Mission System



3 active missions at once

Types of missions:



Distance goals ("Reach 2000m")

Collection goals ("Eat 50 food items")

Specific actions ("Dodge 10 birds")





Completing all 3 = Level up + earn spin token

New set of 3 missions loads after completion



Slot Machine



Costs tokens (earned from missions)

Rewards:



Bonus currency

Cosmetics

Power-up tokens







Cosmetics (4-5 Equip Slots)



Purely visual customization

Unlocked via slot machine or direct purchase

No gameplay impact





Run End Condition

Jetpack Joyride Model: Instant Death



Hit any obstacle = instant death

Simple, clear consequences

High stakes, skill-based



Mitigation Systems



Vehicles: Grant temporary invincibility

Shields: Absorb one hit (from gadgets or pickups)

Extra Lives: Continue after death (from gadgets)



Design Benefits



Pure skill expression

Twitchy, high-stakes gameplay

Fast runs (1-3 minutes typical)

Obstacles are fair and telegraphed





Core Loop



Run: Auto-run through procedural level, dodge hazards, collect food

Die: Hit obstacle, run ends

Spend: Use collected coins on permanent upgrades

Progress: Missions completed, level up, earn tokens

Unlock: New movement systems, gadgets, cosmetics

Repeat: Next run is easier/you go farther/earn more coins





Key Design Pillars



Simple to Learn: One-button vertical control

Hard to Master: Complex pattern reading and momentum management

Always Progressing: Every run earns currency toward upgrades

Endless Scaling: Procedural generation + difficulty ramping

Risk/Reward: Choose safe paths or dangerous food-rich routes

Fair but Challenging: All patterns beatable, death feels earned





There's your complete design document! You can copy this text and save it as a .md file on your end. It captures all the mechanical details we discussed for your turkey runner game.

