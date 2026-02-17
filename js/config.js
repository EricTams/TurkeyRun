// Canvas logical resolution
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;

// Timing
export const TARGET_FPS = 60;
export const TIMESTEP = 1000 / TARGET_FPS;
export const MAX_ACCUMULATED_TIME = TIMESTEP * 5;

// Player -- render size matches native art (64x80 Aseprite frames)
export const PLAYER_RENDER_WIDTH = 64;
export const PLAYER_RENDER_HEIGHT = 80;

// Transparent padding below the turkey's feet in the sprite frame.
// The sprite is drawn this many px lower so feet sit on GROUND_Y.
export const PLAYER_SPRITE_BOTTOM_PAD = 16;

// Hitbox is smaller than the sprite for fair collision
export const PLAYER_WIDTH = 36;
export const PLAYER_HEIGHT = 40;
export const PLAYER_HITBOX_OFFSET_X = 14;  // px from left edge of sprite to hitbox
export const PLAYER_HITBOX_OFFSET_Y = 16;  // px from top edge of sprite to hitbox

// Set to true to render a wireframe box around the player hitbox
export const DEBUG_SHOW_HITBOX = true;

export const PLAYER_START_X = 100;

// Physics (pixels per second / pixels per second²)
export const GRAVITY = 1200;
export const THRUST = 1500;
export const TERMINAL_VEL_UP = 380;
export const TERMINAL_VEL_DOWN = 450;

// World
export const GROUND_Y = 400;
export const AUTO_RUN_SPEED = 300; // pixels per second

// Sky / background layer colors
export const SKY_COLOR = '#87CEEB';
export const FAR_BG_COLOR = '#6DB3D1';  // distant hills
export const NEAR_BG_COLOR = '#5A9E5A'; // near tree-line

// Parallax speed multipliers (fraction of AUTO_RUN_SPEED)
export const FAR_BG_PARALLAX = 0.15;
export const NEAR_BG_PARALLAX = 0.4;

// Ground
export const GROUND_COLOR = '#C2B280';
export const GROUND_STRIPE_COLOR = '#B0A06A';

// Distance display
export const PIXELS_PER_METER = 50; // converts pixel distance to "meters"

// Ground hazards -- beach biome
export const POOL_NOODLE_WIDTH = 15;
export const POOL_NOODLE_HEIGHT = 60;
export const SAND_CASTLE_WIDTH = 50;
export const SAND_CASTLE_HEIGHT = 35;

// Ground hazards -- grass biome
export const ROCK_WIDTH = 22;
export const ROCK_HEIGHT = 28;
export const BUSH_WIDTH = 48;
export const BUSH_HEIGHT = 30;

// Ground hazards -- mountain biome
export const BOULDER_WIDTH = 45;
export const BOULDER_HEIGHT = 50;
export const ICE_PATCH_WIDTH = 55;
export const ICE_PATCH_HEIGHT = 12;

// Ground hazards -- moon biome
export const CRATER_WIDTH = 50;
export const CRATER_HEIGHT = 18;
export const ALIEN_ROCK_WIDTH = 28;
export const ALIEN_ROCK_HEIGHT = 40;

// Ground hazards -- spiritual realm biome
export const VOID_CRYSTAL_WIDTH = 30;
export const VOID_CRYSTAL_HEIGHT = 48;
export const WEIRD_PILLAR_WIDTH = 18;
export const WEIRD_PILLAR_HEIGHT = 60;

// Biome progression (distance in meters)
export const BIOME_BEACH_START = 0;
export const BIOME_GRASS_START = 500;
export const BIOME_MOUNTAIN_START = 1200;
export const BIOME_MOON_START = 2200;
export const BIOME_SPIRITUAL_START = 3500;
export const BIOME_TRANSITION_METERS = 150;   // color lerp zone before each boundary

// Zappers
export const ZAPPER_WIDTH = 30;
export const ZAPPER_GAP_MIN = 90;   // smallest flyable gap (turkey is 30px tall)
export const ZAPPER_GAP_MAX = 150;  // most generous gap
export const ZAPPER_GAP_MARGIN = 30; // min distance from ceiling/ground for gap edges

// Bottom-open zappers (chunk 12C) -- top bar only, open below
export const ZAPPER_BOTTOM_OPEN_MIN_HEIGHT = 100;  // minimum bar height hanging from ceiling
export const ZAPPER_BOTTOM_OPEN_MAX_HEIGHT = 280;  // maximum (leaves 120px clear above ground)

// Food collectibles
export const FOOD_SIZE = 24;            // render size (native art is 32x32)
export const FOOD_HITBOX_PADDING = 8;   // generous collection radius
export const FOOD_COLOR = '#FFD700';    // gold fallback rectangle

// Food spawning
export const FOOD_SPAWN_CHANCE = 0.7;   // probability a pattern also spawns food
export const FOOD_RISKY_CHANCE = 0.35;  // of spawned food, fraction placed near hazards
export const FOOD_COUNT_MIN = 3;
export const FOOD_COUNT_MAX = 8;
export const FOOD_SPACING = 32;         // px between food items in a formation
export const FOOD_ARC_HEIGHT = 80;      // max arc peak height
export const FOOD_RISE_PER_ITEM = 18;   // vertical step for rise/fall formations
export const FOOD_Y_MIN = 20;           // top margin for food placement
export const FOOD_Y_BOTTOM_MARGIN = 30; // margin above GROUND_Y for food placement

// Birds (homing missiles -- Jetpack Joyride style, chunk 12B x-speed fix)
// Original angle-based steering with limited turn rate. The only change from
// chunk 8 is that horizontal speed is pinned to BIRD_X_SPEED so arrival time
// is deterministic: (CANVAS_WIDTH - PLAYER_START_X) / BIRD_X_SPEED.
// Y-movement still comes from the angle/turn-rate system (sin(angle) * BIRD_SPEED).
export const BIRD_WIDTH = 40;               // slightly wider for 64x48 art
export const BIRD_HEIGHT = 30;              // slightly taller for 64x48 art
export const BIRD_SPEED = 400;              // px/s -- used for y-component of movement
export const BIRD_X_SPEED = 380;            // px/s -- constant horizontal speed (overrides cos component)
export const BIRD_TURN_RATE = 0.6;          // radians/s max steering (very limited, JJ-style)
export const BIRD_TRACKING_DURATION = 2.0;  // seconds of homing after entering, then fly straight
export const BIRD_WARNING_DURATION = 1.0;   // seconds of flashing indicator before bird enters
export const BIRD_SPAWN_MIN_DISTANCE = 400; // meters before birds begin spawning
export const BIRD_SPAWN_BASE_INTERVAL = 8.0;// seconds between spawns at min distance
export const BIRD_SPAWN_MIN_INTERVAL = 2.5; // seconds minimum at high distance
export const BIRD_SPAWN_INTERVAL_DECAY = 0.8;// seconds reduction per 1000m traveled
export const BIRD_VOLLEY_CHANCE = 0.3;      // probability a spawn triggers a volley
export const BIRD_VOLLEY_MAX = 3;           // max extra birds in a volley
export const BIRD_VOLLEY_DELAY = 0.5;       // seconds between volley birds

// Lasers (telegraphed beams)
export const LASER_BEAM_THICKNESS = 16;             // active beam thickness in px
export const LASER_WARNING_THICKNESS = 2;           // warning line thickness in px
export const LASER_STATIC_WIDTH = 300;              // static beam horizontal length in px
export const LASER_STATIC_WARNING_DURATION = 1.5;   // seconds of warning (safe to touch)
export const LASER_STATIC_ACTIVE_DURATION = 1.2;    // seconds beam is deadly
export const LASER_SWEEP_LENGTH = 300;              // sweep beam length from pivot in px
export const LASER_SWEEP_WARNING_DURATION = 1.0;    // seconds of warning
export const LASER_SWEEP_ACTIVE_DURATION = 2.0;     // seconds beam is deadly
export const LASER_SWEEP_SPEED = 1.0;               // radians per second
export const LASER_SWEEP_ARC = Math.PI * 0.5;       // total arc in radians (90°)

// Path-based section generation
export const PATH_COIN_SPACING = 36;          // px between coins along the safe path

// Spawner -- procedural generation
export const SPAWNER_GRACE_DISTANCE = 600;     // px of travel before first pattern
export const SPAWNER_BASE_GAP = 700;           // px between patterns at distance 0
export const SPAWNER_MIN_GAP = 250;            // px minimum gap at high distance
export const SPAWNER_GAP_SHRINK_RATE = 150;    // px gap reduction per 1000m traveled
export const SPAWNER_EASY_COUNT = 4;           // first N patterns are always easy
export const SPAWNER_HARD_FROM = 1000;         // meters -- hard patterns begin
export const SPAWNER_EXTREME_FROM = 2000;      // meters -- extreme patterns begin
export const SPAWNER_EXTREME_DOMINANT = 3500;  // meters -- extreme patterns dominate
