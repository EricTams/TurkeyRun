# Tech Stack

## Rendering
- **HTML5 Canvas 2D** -- simple, no dependencies, good mobile support

## Language
- **Vanilla JavaScript (ES modules)** -- no build step, no bundler, no framework
- Runs directly in the browser via `<script type="module">`

## Persistence
- **localStorage** -- simple key-value store for save data (coins, unlocks, high scores)

## Hosting
- **GitHub Pages** -- free static file hosting, deploy by pushing to `main`

## Asset Art
- Placeholder colored rectangles initially
- Hand-drawn pixel art PNGs swapped in later via a sprite abstraction layer
- Drop a PNG into `assets/sprites/` and register it -- no other code changes needed
