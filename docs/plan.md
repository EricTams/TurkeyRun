# Turkey Runner -- Incremental Implementation Plan

## Tech Stack

- **Rendering:** HTML5 Canvas 2D
- **Language:** Vanilla JavaScript (ES modules, no build step)
- **Persistence:** localStorage for save data
- **Hosting:** GitHub Pages (static files, no server)
- **Asset art:** Placeholder colored rectangles initially; hand-drawn pixel art PNGs swapped in later via a sprite abstraction layer

## Project Structure (target)

```
TurkeyRun/
  index.html              -- entry point
  css/style.css           -- minimal styling
  assets/
    sprites/              -- drop pixel art PNGs here (e.g. turkey.png, iguana.png)
  js/
    main.js               -- entry, game loop, state machine
    config.js             -- named constants (speeds, gravity, sizes)
    input.js              -- mouse/touch/keyboard input
    physics.js            -- gravity, thrust, terminal velocity
    turkey.js             -- player entity
    renderer.js           -- canvas drawing helpers
    sprites.js            -- sprite registry + loader; fallback to colored rects
    world.js              -- scrolling ground + background
    hazards/
      groundHazard.js     -- generic ground obstacle (pool noodles, sand castles, iguanas per biome)
      zapper.js
      bird.js
      laser.js
    spawner.js            -- procedural generation / chunk pool
    collectible.js        -- food items
    hud.js                -- score, distance, coins
    collision.js          -- AABB detection
    biome.js              -- biome progression + visuals
    state.js              -- run state, game-over, menus
    save.js               -- localStorage persistence
    meta/
      shop.js             -- movement variants, gadgets
      gadgets.js          -- passive bonus logic
      vehicles.js         -- temporary vehicle pickups
      missions.js         -- mission tracking
      slotmachine.js      -- token-based rewards
      cosmetics.js        -- visual customization
  docs/
    tech-stack.md         -- tech stack decisions
    Design.md             -- game design document
    plan.md               -- this file
```

## Guiding Principles

- Each chunk ends with something you can **open in a browser and test** by interacting with it.
- Placeholder art (colored rectangles) is fine; visuals are upgraded later.
- **All entities draw through `sprites.js`** so placeholder rectangles swap to hand-drawn pixel art by dropping a PNG into `assets/sprites/` and registering it -- no other code changes needed.
- No premature abstractions -- add structure as needed.
- All named constants live in `config.js` (no magic numbers).
- One-way state flow: input -> update -> render.

## Workflow: Build, Test, Repeat

Each chunk follows this cycle:

1. **Build:** I implement the chunk and commit the changes.
2. **Stop:** I tell you the chunk is done and remind you what to test (the "Test" section).
3. **You test:** You open `index.html` in a browser and verify everything in the test checklist.
4. **Report back:** You tell me what works, what doesn't, and anything that feels off.
5. **Fix:** If there are issues, I fix them and you re-test.
6. **Next chunk:** Once you're happy, you tell me to move on to the next chunk.

We do NOT move to the next chunk until you've confirmed the current one is good.

---

## Chunk 1: Scaffold + Game Loop

**Goal:** A blank canvas running a stable game loop with delta-time, version-controlled from the start.

- Initialize git repo with `.gitignore` (ignore OS files, editor files, etc.).
- Create `docs/tech-stack.md` documenting our choices: HTML5 Canvas 2D, vanilla JS (ES modules, no build step), localStorage for persistence, GitHub Pages hosting.
- Move `Design.md` into `docs/`.
- Create `index.html` with a `<canvas>` element, link `css/style.css` and `js/main.js`. Include `<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">` for proper mobile rendering.
- `css/style.css`: center the canvas, dark background, responsive sizing. Add `touch-action: none` on the canvas to prevent browser gestures (scroll, zoom) on mobile.
- `js/main.js`: `requestAnimationFrame` loop with fixed-timestep accumulator. Export a `deltaTime` each frame.
- `js/config.js`: canvas dimensions, target FPS, timestep.
- `js/renderer.js`: get 2D context, `clear()` helper.
- Draw a solid background color that changes slightly each second (visual proof the loop is running).

**Test:** Open `index.html` in browser (desktop and phone). Canvas appears centered, fills available space. No scrolling or zooming on mobile. Background color gently pulses, confirming the loop runs at a steady rate.

---

## Chunk 2: Turkey + Input + Physics + Sprite Abstraction

**Goal:** A controllable turkey that rises on press and falls on release, drawn through a sprite layer that supports future pixel art.

- `js/sprites.js`: sprite registry and loader. Key API:
  - `registerSprite(key, path)` -- queue a PNG to load from `assets/sprites/`.
  - `drawSprite(ctx, key, x, y, w, h, fallbackColor)` -- if sprite loaded, draw image; otherwise draw a filled rectangle in `fallbackColor`.
  - `loadAll()` -- returns a Promise that resolves when all registered images finish loading (or fail gracefully).
  - To add pixel art later: drop a PNG in `assets/sprites/`, call `registerSprite('turkey', 'assets/sprites/turkey.png')`, done.
- `js/turkey.js`: player entity with `x, y, vy` (velocity-y). Draw via `drawSprite(ctx, 'turkey', ...)` with a brown rectangle fallback.
- `js/input.js`: listen for `mousedown/mouseup`, `touchstart/touchend`, and `Space` key. Expose `isPressed()`. Call `preventDefault()` on touch events to stop the browser from scrolling or triggering long-press menus on mobile.
- `js/physics.js`: apply gravity when not pressing, thrust when pressing. Clamp to terminal velocity. Clamp `y` to floor/ceiling.
- `js/config.js`: add `GRAVITY`, `THRUST`, `TERMINAL_VEL_UP`, `TERMINAL_VEL_DOWN`, `PLAYER_WIDTH`, `PLAYER_HEIGHT`, `GROUND_Y`.
- Wire into game loop: input -> physics update -> render turkey.

**Test:** Press/hold anywhere (or spacebar) -- turkey rises with momentum. Release -- turkey falls with gravity. Hits floor and ceiling and stops. Movement feels smooth, not instant.

---

## Chunk 3: Scrolling World

**Goal:** Ground and background scroll to create the illusion of forward movement.

- `js/world.js`: draw a ground strip and 1-2 parallax background layers (simple colored rectangles/gradients). Scroll based on `AUTO_RUN_SPEED * dt`.
- Track `distance` traveled (in meters or arbitrary units). Display distance in corner.
- `js/config.js`: add `AUTO_RUN_SPEED`, ground and sky colors.
- `js/hud.js`: draw distance counter (top-left text).

**Test:** Turkey appears to fly through a scrolling world. Ground scrolls at full speed, background layer scrolls slower (parallax). Distance counter increments.

---

## Chunk 4: Collision System + Beach Ground Hazards

**Goal:** First hazards -- static ground obstacles. Die on contact, restart the run.

- `js/collision.js`: AABB overlap check (`rectsOverlap(a, b) -> bool`).
- `js/hazards/groundHazard.js`: generic ground obstacle that scrolls left with the world. Each instance has a `spriteKey` (e.g. `'poolNoodle'`, `'sandCastle'`) so different biomes use different ground hazards. Drawn via `drawSprite()` with distinct fallback colors per type.
- Beach biome ground hazards: **pool noodles** (tall, narrow) and **sand castles** (wide, shorter). Both sit on the ground, both are instant kill on contact.
- `js/state.js`: game states: `PLAYING`, `DEAD`. On death, show "Game Over" text + "Tap to restart". On tap, reset everything.
- Spawn ground hazards at fixed intervals for now (procedural gen comes later).

**Test:** Pool noodles and sand castles scroll along the ground. Fly into one -- instant death, "Game Over" screen. Tap to restart. Staying airborne avoids them. The two types have different shapes/colors.

---

## Chunk 5: Zappers

**Goal:** Static barrier hazards that create spatial puzzles.

- `js/hazards/zapper.js`: vertical bars with a gap. Configurable gap position and size.
- Spawn zappers at intervals, varying gap position.
- Collision = instant death (reuse collision system).
- Visual: bright colored rectangles (top bar + bottom bar with gap).

**Test:** Zappers appear with gaps at different heights. Navigate through gaps. Hit a zapper bar -- die. Zappers + ground hazards appear together.

---

## Chunk 6: Procedural Generation

**Goal:** Replace fixed-interval spawning with a chunk/pattern pool system.

- `js/spawner.js`: define a pool of pre-made "patterns" (each pattern = a set of hazard placements relative to a chunk origin). Categorize by difficulty tier.
- Select patterns based on current distance (easy patterns early, harder later).
- Control density: increase spawn rate with distance.
- Remove off-screen hazards.

**Test:** Play repeatedly -- obstacle layouts vary each run. Early game is sparse and easy. Play longer and it gets denser/harder. No impossible patterns.

---

## Chunk 7: Food Collectibles + HUD

**Goal:** Collect food for coins. Display score.

- `js/collectible.js`: food items placed in patterns (lines, arcs) between/around hazards.
- Collection = overlap detection (generous hitbox). Increment coin counter.
- `js/hud.js`: show coins (top-right), distance (top-left).
- `js/config.js`: food size, spawn patterns.

**Test:** Food appears in tempting patterns. Fly through them to collect. Coin counter goes up. Some food is placed in risky spots near hazards.

---

## Chunk 8: Birds (Homing Hazard)

**Goal:** Homing enemies that track the player.

- `js/hazards/bird.js`: spawn off-screen right with a brief warning indicator (arrow/flash). Move toward player position at fixed speed. Instant kill on contact.
- Support volleys (2-3 birds in quick succession).
- Spawn frequency increases with distance.

**Test:** Warning indicator appears. Bird flies in, tracking your position. Evade by changing direction. Multiple birds in volleys force rapid maneuvering.

---

## Chunk 9: Lasers (Telegraphed Beams)

**Goal:** Two-phase hazard requiring timing, including sweeping variants.

- `js/hazards/laser.js`: warning phase (thin line, safe to touch) then active phase (thick beam, deadly). Cycles on/off.
- **Static lasers:** horizontal beams at various fixed heights.
- **Sweeping lasers:** beams that rotate around a pivot point (e.g., mounted on a wall/ceiling), sweeping through an arc. Player must time passage through the sweep zone.
- Configurable timing: warning duration, active duration, cycle speed, sweep angle and speed.

**Test:** Static lasers cycle on/off -- time your movement through them. Sweeping lasers rotate across the play area -- position yourself to avoid the arc. Both types combine with other hazards for complex patterns.

---

## Chunk 10: Game Over + Run Summary + Save Slots + High Score

**Goal:** Meaningful end-of-run flow with 3 named save slots, persistent coin bank, and best-distance tracking.

- `js/save.js`: implement 3 save slots stored in `localStorage`. Each slot contains:
  - Player name (entered on creation)
  - Total coins, best distance
  - All unlock/progression data (populated by later chunks: movement variants, gadgets, cosmetics, missions, etc.)
  - Computed progress percentage = (total items unlocked / total unlockable items in the game) displayed on the slot selection screen
- **Slot selection screen:** shown before the main menu. Displays 3 slots: used slots show name + progress %, empty slots show "Empty -- Tap to Create". Creating a slot prompts for a name. A "Delete" option on used slots (with confirmation).
- `js/state.js`: add `SLOT_SELECT` state before `MENU`. The active slot determines which save data is used for the session.
- On death, show run summary overlay (distance, coins earned this run, total coins, best distance).
- "Play Again" button on summary screen.
- Show "NEW BEST!" indicator when the player beats their record.
- All data auto-saves to the active slot after each run.

**Test:** Game opens to slot selection screen. Create a save slot with a name. Play, die, see summary with stats. Coins and high score persist across refreshes. Switch to a different slot -- it has independent data. Progress % shows 0% initially (no unlockable content exists yet; percentage will become meaningful as shop/gadgets/cosmetics are added in later chunks). Delete a slot -- it clears.

---

## Chunk 11: Biome Progression

**Goal:** Visual variety as the player travels further.

- `js/biome.js`: define 5 biomes (Beach, Grasslands, Hills, Mountains, Space) with distinct color palettes for sky, ground, and background layers.
- Each biome specifies its own ground hazard types (Beach: pool noodles + sand castles; later biomes: iguanas, rocks, etc.). `groundHazard.js` already supports this via `spriteKey`.
- Transition at distance thresholds with a smooth color lerp.
- Zappers, birds, and lasers appear across all biomes (visual reskin; behavior stays the same).

**Test:** Start at the beach with pool noodles and sand castles. Play far enough to see grasslands, hills, etc. Ground hazards change per biome. Colors transition smoothly. Space biome has no ground (or floating platforms).

---

## Chunk 12: Main Menu + UI Polish + Pause

**Goal:** Title screen, basic navigation, and pause functionality.

- `js/state.js`: add `MENU` and `PAUSED` states (the `SLOT_SELECT` state was added in Chunk 10). Title screen with game name, "Tap to Play", "Shop" button, and a "Change Slot" option to return to slot selection.
- **Pause:** add a pause button (top corner of HUD). Tapping it freezes the game loop and shows a "Paused" overlay with "Resume" and "Quit" options.
- **Auto-pause:** listen to `document.visibilitychange` -- when the tab/app loses focus, auto-pause the game. Prevents unfair deaths when switching apps on mobile.
- Style the HUD and menus with a consistent look.
- Add a simple death animation (turkey tumbles/falls).

**Test:** Game starts at title screen. Tap to play. Tap pause button -- game freezes, overlay appears. Resume or quit. Switch tabs -- game auto-pauses. Die, see summary, tap to return to menu. Shop button visible (not functional yet).

---

## Chunk 13: Shop + Movement Variants

**Goal:** First meta-progression -- spend coins to unlock different movement physics.

- `js/meta/shop.js`: shop screen listing movement variants with costs. Buy with coins.
- Movement variants: e.g., "Rocket" (high thrust, low gravity), "Balloon" (low thrust, floaty), "Heavy" (high gravity, strong thrust). Each is a config override for physics constants.
- `js/save.js`: persist unlocked variants and selected variant.

**Test:** Open shop from menu. See movement options with prices. Buy one. Select it. Play a run -- physics feel different. Coins deducted. Persists across refresh.

---

## Chunk 14: Gadgets

**Goal:** Equip 2 passive bonuses per run.

- `js/meta/gadgets.js`: implement 3-4 gadgets initially: Magnet (wider food pickup radius), Shield (absorb one hit), Head Start (boost forward at run start), Coin Multiplier (2x coins).
- Equip screen (pick 2 from unlocked).
- `js/save.js`: persist unlocked gadgets and loadout.

**Test:** Buy gadgets in shop. Equip 2. Play -- magnet pulls food toward you, shield absorbs a hit, etc. Effects are noticeable.

---

## Chunk 15: Vehicles

**Goal:** Temporary invincible powerups during a run.

- `js/meta/vehicles.js`: vehicle pickup spawns randomly. On contact, player enters vehicle mode (different sprite, invincible, unique movement). Lasts a fixed duration then ejects player.
- 2 vehicle types to start.
- Upgrade duration in shop.

**Test:** Vehicle pickup appears during run. Grab it -- become invincible, plow through hazards. Timer expires, back to normal. Fun and impactful.

---

## Chunk 16: Mission System

**Goal:** Directed goals that reward tokens.

- `js/meta/missions.js`: 3 active missions (e.g., "Travel 2000m", "Collect 50 food", "Dodge 10 birds"). Track progress across runs. Completing all 3 grants a spin token and loads new missions.
- Display missions on menu screen and in HUD.
- `js/save.js`: persist mission progress.

**Test:** See 3 missions on menu. Play runs, see progress update. Complete all 3 -- earn token, new missions appear.

---

## Chunk 17: Slot Machine

**Goal:** Spend tokens for randomized rewards.

- `js/meta/slotmachine.js`: simple slot machine UI. Costs 1 token per spin. Rewards: bonus coins, cosmetic unlock, or gadget unlock.
- Animated reel spin (simple).

**Test:** Earn tokens from missions. Open slot machine. Spin -- see animation, get reward. Reward applied correctly.

---

## Chunk 18: Cosmetics

**Goal:** Visual customization for the turkey.

- `js/meta/cosmetics.js`: 4-5 equip slots (hat, body color, trail effect, etc.). Unlocked via slot machine or shop.
- Render equipped cosmetics on the turkey sprite.

**Test:** Unlock a cosmetic. Equip it. Play -- see it on the turkey. Purely visual, no gameplay impact.

---

## Chunk 19: Hand-Drawn Pixel Art + Audio Polish

**Goal:** Replace placeholder rectangles with your hand-drawn pixel art and add sound.

- Drop pixel art PNGs into `assets/sprites/` (e.g. `turkey.png`, `iguana.png`, `zapper.png`, `bird.png`, `food.png`, biome backgrounds, etc.).
- Register each sprite in the sprite registry -- the `drawSprite` fallback system means you can add them one at a time; anything without a PNG keeps its colored rectangle.
- Add sound effects: flap, collect, death, laser warning, bird screech.
- Add background music (optional, with mute toggle).
- Particle effects: food collection sparkle, death explosion, thrust particles.

**Test:** Game looks and sounds like a real game. Each sprite swap is immediately visible. Visual feedback is satisfying. Mute toggle works.

---

## Chunk 20: GitHub Pages Deployment

**Goal:** Playable on the web.

- Push repo to GitHub (git was initialized in Chunk 1).
- Enable GitHub Pages (serve from `main` branch root).
- Add `README.md` with a link to the live game.
- Verify all asset paths are relative (no absolute paths that break on GitHub Pages).

**Test:** Visit the GitHub Pages URL. Game loads and plays correctly in browser (desktop + mobile).
