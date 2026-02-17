// Canvas logical resolution
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;

// Timing
export const TARGET_FPS = 60;
export const TIMESTEP = 1000 / TARGET_FPS;
export const MAX_ACCUMULATED_TIME = TIMESTEP * 5;

// Player
export const PLAYER_WIDTH = 40;
export const PLAYER_HEIGHT = 30;
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

// Zappers
export const ZAPPER_WIDTH = 30;
export const ZAPPER_GAP_MIN = 90;   // smallest flyable gap (turkey is 30px tall)
export const ZAPPER_GAP_MAX = 150;  // most generous gap
export const ZAPPER_GAP_MARGIN = 30; // min distance from ceiling/ground for gap edges

// Food collectibles
export const FOOD_SIZE = 16;
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

// Birds (homing hazard)
export const BIRD_WIDTH = 30;
export const BIRD_HEIGHT = 20;
export const BIRD_SPEED = 220;              // px/s toward player
export const BIRD_TURN_RATE = 2.5;         // radians/s max steering (limited so dodging works)
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

// Spawner -- procedural generation
export const SPAWNER_GRACE_DISTANCE = 600;     // px of travel before first pattern
export const SPAWNER_BASE_GAP = 700;           // px between patterns at distance 0
export const SPAWNER_MIN_GAP = 250;            // px minimum gap at high distance
export const SPAWNER_GAP_SHRINK_RATE = 150;    // px gap reduction per 1000m traveled
export const SPAWNER_MEDIUM_FROM = 300;        // meters -- medium patterns begin
export const SPAWNER_EASY_UNTIL = 500;         // meters -- easy becomes minority
export const SPAWNER_HARD_FROM = 1000;         // meters -- hard patterns begin
export const SPAWNER_HARD_DOMINANT = 2000;     // meters -- hard patterns dominate
